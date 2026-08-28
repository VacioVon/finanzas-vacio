/**
 * Aplica un archivo SQL contra el proyecto vía Management API.
 * Uso: node supabase/scripts/apply-migration.mjs <ruta-al-archivo.sql>
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../../.env.local')

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const PROJECT_ID = env.SUPABASE_PROJECT_ID
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD

if (!PROJECT_ID || !SERVICE_KEY) {
  console.error('❌ Faltan SUPABASE_PROJECT_ID o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const filePath = process.argv[2]
if (!filePath) {
  console.error('Uso: node supabase/scripts/apply-migration.mjs <archivo.sql>')
  process.exit(1)
}

const sql = readFileSync(resolve(process.cwd(), filePath), 'utf8')
console.log(`📄 Aplicando: ${filePath} (${sql.length} bytes)`)

// Intento 1: Management API v1 (requiere token de acceso personal, no service key)
// Intento 2: REST API con exec_sql RPC
// Intento 3: pg/query endpoint
async function runViaRPC(query) {
  const url = `https://${PROJECT_ID}.supabase.co/rest/v1/rpc/exec_sql`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ query })
  })
  return { ok: res.ok, status: res.status, body: await res.text() }
}

async function runViaPGEndpoint(query) {
  // Supabase's internal pg endpoint (disponible en proyectos)
  const url = `https://${PROJECT_ID}.supabase.co/pg/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })
  return { ok: res.ok, status: res.status, body: await res.text() }
}

async function runViaManagementAPI(query) {
  // Requiere SUPABASE_ACCESS_TOKEN (token personal de Supabase, no service role)
  const token = env.SUPABASE_ACCESS_TOKEN
  if (!token) return { ok: false, status: 401, body: 'No SUPABASE_ACCESS_TOKEN' }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })
  return { ok: res.ok, status: res.status, body: await res.text() }
}

// Probar Management API primero (más confiable para DDL)
let result = await runViaManagementAPI(sql)
if (result.ok) {
  console.log('✅ Migración aplicada vía Management API')
  process.exit(0)
}
console.log(`ℹ️  Management API: ${result.status} — ${result.body.slice(0, 120)}`)

// Fallback: exec_sql RPC
result = await runViaRPC(sql)
if (result.ok) {
  console.log('✅ Migración aplicada vía exec_sql RPC')
  process.exit(0)
}
console.log(`ℹ️  exec_sql RPC: ${result.status} — ${result.body.slice(0, 120)}`)

// Fallback: pg/query
result = await runViaPGEndpoint(sql)
if (result.ok) {
  console.log('✅ Migración aplicada vía pg/query')
  process.exit(0)
}
console.log(`ℹ️  pg/query: ${result.status} — ${result.body.slice(0, 120)}`)

console.log('')
console.log('❌ No se pudo aplicar automáticamente la migración.')
console.log('   Aplícala manualmente en el Dashboard SQL Editor:')
console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`)
process.exit(1)
