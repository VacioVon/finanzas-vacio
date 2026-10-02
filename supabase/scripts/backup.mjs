#!/usr/bin/env node
/**
 * RESPALDO DE SOLO LECTURA de QloB (Supabase).
 *
 * Uso:   node supabase/scripts/backup.mjs [--dry-run] [--dest=C:/Respaldos/QloB]
 *
 *  --dry-run   solo inspecciona (tablas, filas, buckets); no escribe nada.
 *
 * Garantías:
 *  - Todas las peticiones pasan por un guardián que SOLO permite GET/HEAD y el POST de
 *    listado de Storage (/storage/v1/object/list/, que es una lectura). Cualquier otro
 *    método lanza error: este script no puede insertar, actualizar, borrar ni alterar nada.
 *  - Lee la clave de servicio de .env.local y NUNCA la imprime ni la guarda en el respaldo.
 *  - Escribe únicamente en la carpeta de destino (fuera del repositorio y de OneDrive).
 *  - Si algún conteo no coincide con la base viva, termina con error y NO corrige nada.
 *
 * No incluye ni ejecuta los scripts 035* (destructivos).
 */
import { createClient } from '@supabase/supabase-js'
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, cpSync,
} from 'fs'
import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(__dir, '../..')
const DRY = process.argv.includes('--dry-run')
const destArg = process.argv.find(a => a.startsWith('--dest='))?.slice(7)
const DESTINO_BASE = destArg ?? 'C:/Respaldos/QloB'

// ─── Entorno (sin imprimir valores) ──────────────────────────────
const env = Object.fromEntries(
  readFileSync(resolve(RAIZ, '.env.local'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const URL_BASE = env.VITE_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !SERVICE) throw new Error('Faltan variables de Supabase en .env.local')
const PROJECT_REF = new globalThis.URL(URL_BASE).hostname.split('.')[0]

// ─── Guardián de solo lectura ────────────────────────────────────
function soloLectura(url, opts = {}) {
  const metodo = (opts.method || 'GET').toUpperCase()
  const ruta = String(url)
  const esListadoStorage = metodo === 'POST' && ruta.includes('/storage/v1/object/list/')
  if (metodo !== 'GET' && metodo !== 'HEAD' && !esListadoStorage) {
    throw new Error(`BLOQUEADO: este script es de solo lectura (${metodo})`)
  }
  return fetch(url, opts)
}
const sb = createClient(URL_BASE, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: soloLectura },
})

const sha256 = buf => createHash('sha256').update(buf).digest('hex')
const kb = n => `${Math.round(n / 1024)} KB`
const log = (...a) => console.log(...a)

// ─── 1. Esquema visible por la API: tablas y dependencias ────────
async function leerEsquema() {
  const r = await soloLectura(URL_BASE + '/rest/v1/', {
    headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE },
  })
  if (!r.ok) throw new Error('No se pudo leer el esquema (HTTP ' + r.status + ')')
  const spec = await r.json()
  const tablas = {}
  for (const [nombre, def] of Object.entries(spec.definitions ?? {})) {
    const props = def.properties ?? {}
    const columnas = Object.keys(props)
    const deps = new Set()
    for (const p of Object.values(props)) {
      const m = /<fk table='([^']+)'/.exec(p.description ?? '')
      if (m && m[1] !== nombre) deps.add(m[1])
    }
    tablas[nombre] = { columnas, orden: columnas.includes('id') ? 'id' : columnas[0], deps: [...deps] }
  }
  return tablas
}

/** Orden de restauración: primero las tablas de las que otras dependen. */
function ordenRestauracion(tablas) {
  const pendientes = new Set(Object.keys(tablas))
  const orden = []
  while (pendientes.size) {
    const listas = [...pendientes].filter(t => tablas[t].deps.every(d => !pendientes.has(d) || d === t))
    const siguiente = listas.length ? listas : [...pendientes]   // ciclo: se vuelca igual
    for (const t of siguiente.sort()) { orden.push(t); pendientes.delete(t) }
  }
  return orden
}

async function contarVivo(tabla) {
  const { count, error } = await sb.from(tabla).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`conteo ${tabla}: ${error.message}`)
  return count
}

async function leerTabla(tabla, info) {
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb.from(tabla).select('*').order(info.orden, { ascending: true })
      .range(desde, desde + 999)
    if (error) throw new Error(`lectura ${tabla}: ${error.message}`)
    filas.push(...data)
    if (data.length < 1000) break
  }
  return filas
}

// ─── 2. Storage ──────────────────────────────────────────────────
async function listarBucket(bucket, prefijo = '') {
  let archivos = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(bucket).list(prefijo, { limit: 1000, offset })
    if (error) throw new Error(`listado ${bucket}: ${error.message}`)
    for (const o of data) {
      if (o.id === null) archivos = archivos.concat(await listarBucket(bucket, prefijo + o.name + '/'))
      else archivos.push({ ruta: prefijo + o.name, tamano: o.metadata?.size ?? 0 })
    }
    if (data.length < 1000) break
  }
  return archivos
}

// ─── 3. Utilidades de archivos ───────────────────────────────────
function todosLosArchivos(dir, base = dir) {
  let res = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) res = res.concat(todosLosArchivos(p, base))
    else res.push(p.slice(base.length + 1).replace(/\\/g, '/'))
  }
  return res
}

// ═════════════════════════ PRINCIPAL ═════════════════════════════
log(`Proyecto Supabase: ${PROJECT_REF}${DRY ? '  [DRY-RUN: no se escribe nada]' : ''}`)
const tablas = await leerEsquema()
const nombresTablas = Object.keys(tablas)
log(`Tablas detectadas: ${nombresTablas.length}`)

const vivo = {}
for (const t of nombresTablas) vivo[t] = await contarVivo(t)

const { data: buckets, error: errBuckets } = await sb.storage.listBuckets()
if (errBuckets) throw new Error('buckets: ' + errBuckets.message)
const inventario = {}
for (const b of buckets) inventario[b.name] = await listarBucket(b.name)

if (DRY) {
  for (const t of nombresTablas) log(`  ${t}: ${vivo[t]} filas`)
  for (const [b, f] of Object.entries(inventario)) {
    log(`  bucket ${b}: ${f.length} archivos, ${kb(f.reduce((s, x) => s + x.tamano, 0))}`)
  }
  log('Dry-run terminado. No se escribió nada.')
  process.exit(0)
}

// ─── Carpeta de destino por fecha ────────────────────────────────
const ahora = new Date()
const p2 = n => String(n).padStart(2, '0')
const fecha = `${ahora.getFullYear()}-${p2(ahora.getMonth() + 1)}-${p2(ahora.getDate())}`
let carpeta = join(DESTINO_BASE, fecha)
if (existsSync(carpeta)) carpeta += `-${p2(ahora.getHours())}${p2(ahora.getMinutes())}${p2(ahora.getSeconds())}`
mkdirSync(join(carpeta, 'datos'), { recursive: true })
mkdirSync(join(carpeta, 'config'), { recursive: true })
log(`Destino: ${carpeta}`)

const manifiesto = {
  generado: ahora.toISOString(),
  proyecto_supabase: PROJECT_REF,
  tablas: {}, auth: null, storage: {}, codigo: {}, orden_restauracion: ordenRestauracion(tablas),
  estado: 'EN_PROGRESO', advertencias: [],
}

// ─── A. Datos ────────────────────────────────────────────────────
for (const t of nombresTablas) {
  const filas = await leerTabla(t, tablas[t])
  const contenido = JSON.stringify(filas, null, 1)
  const archivo = `datos/${t}.json`
  writeFileSync(join(carpeta, archivo), contenido)
  manifiesto.tablas[t] = {
    archivo, filas_respaldo: filas.length, filas_base_viva: vivo[t],
    bytes: Buffer.byteLength(contenido), sha256: sha256(contenido),
    dependencias: tablas[t].deps,
  }
  log(`  ✔ ${t} (${filas.length})`)
}

// ─── A2. Usuarios de autenticación (sin contraseñas: la API no las entrega) ─
{
  const usuarios = []
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error) throw new Error('auth: ' + error.message)
    usuarios.push(...data.users.map(u => ({
      id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      proveedor: u.app_metadata?.provider, user_metadata: u.user_metadata,
    })))
    if (data.users.length < 200) break
  }
  const contenido = JSON.stringify(usuarios, null, 1)
  writeFileSync(join(carpeta, 'auth_usuarios.json'), contenido)
  manifiesto.auth = { archivo: 'auth_usuarios.json', usuarios: usuarios.length, bytes: Buffer.byteLength(contenido), sha256: sha256(contenido) }
  log(`  ✔ auth_usuarios (${usuarios.length})`)
}

// ─── B. Archivos de Storage ──────────────────────────────────────
for (const [bucket, archivos] of Object.entries(inventario)) {
  const registro = { archivos_listados: archivos.length, archivos_respaldados: 0, bytes: 0, detalle: [] }
  for (const a of archivos) {
    const { data, error } = await sb.storage.from(bucket).download(a.ruta)
    if (error) throw new Error(`descarga ${bucket}/${a.ruta}: ${error.message}`)
    const buf = Buffer.from(await data.arrayBuffer())
    const destino = join(carpeta, 'storage', bucket, a.ruta)
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, buf)
    registro.archivos_respaldados++
    registro.bytes += buf.length
    registro.detalle.push({ ruta: `storage/${bucket}/${a.ruta}`, bytes: buf.length, sha256: sha256(buf) })
  }
  manifiesto.storage[bucket] = registro
  log(`  ✔ bucket ${bucket}: ${registro.archivos_respaldados}/${registro.archivos_listados} archivos`)
}

// ─── E. Código y documentación ───────────────────────────────────
try {
  mkdirSync(join(carpeta, 'codigo'), { recursive: true })
  execFileSync('git', ['bundle', 'create', join(carpeta, 'codigo', 'repositorio.bundle'), '--all'], { cwd: RAIZ, stdio: 'ignore' })
  manifiesto.codigo.git_head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ }).toString().trim()
  manifiesto.codigo.git_cambios_sin_commit = execFileSync('git', ['status', '--porcelain'], { cwd: RAIZ }).toString().split('\n').filter(Boolean).length
} catch {
  manifiesto.advertencias.push('No se pudo crear el bundle de Git (¿git instalado?)')
}
cpSync(join(RAIZ, 'supabase'), join(carpeta, 'codigo', 'supabase'), {
  recursive: true, filter: src => !src.replace(/\\/g, '/').includes('/supabase/.temp'),
})
for (const f of ['package.json', 'package-lock.json', 'INSTRUCCIONES.md', 'RECUPERACION.md', 'vite.config.ts', 'tsconfig.json']) {
  if (existsSync(join(RAIZ, f))) cpSync(join(RAIZ, f), join(carpeta, 'codigo', f))
}

// ─── F. Configuración sin secretos ───────────────────────────────
writeFileSync(
  join(carpeta, 'config', 'variables_de_entorno.txt'),
  Object.keys(env).map(k => `${k}=CONFIGURADA`).join('\n') + '\n'
)

// ═════════════════════ VERIFICACIÓN ══════════════════════════════
log('\nVerificando…')
let hayError = false
const secretos = [SERVICE, env.VITE_SUPABASE_ANON_KEY].filter(Boolean)
const informe = []

for (const t of nombresTablas) {
  const m = manifiesto.tablas[t]
  const vivoAhora = await contarVivo(t)
  const leido = JSON.parse(readFileSync(join(carpeta, m.archivo), 'utf8')).length
  const ok = leido === m.filas_respaldo && m.filas_respaldo === vivoAhora && m.filas_base_viva === vivoAhora
  m.filas_base_viva = vivoAhora
  m.ok = ok
  if (!ok) hayError = true
  informe.push(`${ok ? 'OK ' : 'ERROR'}  ${t}: base=${vivoAhora} backup=${m.filas_respaldo}`)
}
for (const [bucket, r] of Object.entries(manifiesto.storage)) {
  const ok = r.archivos_listados === r.archivos_respaldados
  if (!ok) hayError = true
  informe.push(`${ok ? 'OK ' : 'ERROR'}  bucket ${bucket}: base=${r.archivos_listados} backup=${r.archivos_respaldados}`)
}

// Integridad: hash de cada archivo vs. manifiesto
let checksumsOk = true
for (const m of Object.values(manifiesto.tablas)) {
  if (sha256(readFileSync(join(carpeta, m.archivo))) !== m.sha256) checksumsOk = false
}
if (sha256(readFileSync(join(carpeta, manifiesto.auth.archivo))) !== manifiesto.auth.sha256) checksumsOk = false
for (const r of Object.values(manifiesto.storage)) {
  for (const d of r.detalle) if (sha256(readFileSync(join(carpeta, d.ruta))) !== d.sha256) checksumsOk = false
}
if (!checksumsOk) hayError = true

// Búsqueda de secretos en lo que NO es binario
let secretosExpuestos = false
for (const rel of todosLosArchivos(carpeta)) {
  if (/\.(bundle|png|jpe?g|webp|gif|pdf)$/i.test(rel)) continue
  const texto = readFileSync(join(carpeta, rel), 'utf8')
  if (secretos.some(s => texto.includes(s))) { secretosExpuestos = true; manifiesto.advertencias.push('SECRETO ENCONTRADO EN ' + rel) }
}
if (secretosExpuestos) hayError = true

// Resumen de comprobaciones numéricas clave (para detectar corrupción silenciosa)
const sum = (arr, k) => arr.reduce((s, x) => s + Number(x[k] ?? 0), 0)
const leerJson = t => JSON.parse(readFileSync(join(carpeta, `datos/${t}.json`), 'utf8'))
manifiesto.totales_control = {
  suma_saldo_actual_cuentas: sum(leerJson('cuentas'), 'saldo_actual'),
  suma_monto_movimientos: sum(leerJson('movimientos'), 'monto'),
  suma_monto_total_deudas: sum(leerJson('deudas'), 'monto_total'),
}

const totalBytes = todosLosArchivos(carpeta).reduce((s, rel) => s + statSync(join(carpeta, rel)).size, 0)
manifiesto.tamano_total_bytes = totalBytes
manifiesto.verificacion = {
  tablas_ok: Object.values(manifiesto.tablas).filter(m => m.ok).length,
  tablas_total: nombresTablas.length, checksums_ok: checksumsOk, secretos_expuestos: secretosExpuestos,
}
manifiesto.estado = hayError ? 'ERROR' : 'OK'
writeFileSync(join(carpeta, 'manifiesto.json'), JSON.stringify(manifiesto, null, 1))

log(informe.join('\n'))
log(`\nChecksums: ${checksumsOk ? 'OK' : 'ERROR'}`)
log(`Secretos en el respaldo: ${secretosExpuestos ? 'ENCONTRADOS (ERROR)' : 'ninguno'}`)
log(`Tamaño total: ${kb(totalBytes)}`)
log(`Carpeta: ${carpeta}`)
log(`ESTADO: ${manifiesto.estado}`)
if (hayError) {
  log('\nDETENIDO: hay diferencias. No se intentó corregir nada. Revisa el manifiesto.')
  process.exit(2)
}
