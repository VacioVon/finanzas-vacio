import { supabase } from '@/lib/supabase'
import type { Movimiento, MovimientoFormData } from '@/types/app.types'
import { getCurrentMonthRange } from '@/utils/dates'
import { resolverEdicion, deudasInvolucradas } from '@/utils/movimientosEdicion'
import { calcularSaldoTerceros } from '@/utils/saldoTerceros'

// Fragmento de JOIN reutilizable
const MOVIMIENTO_SELECT = `
  *,
  categoria:categorias(id, nombre, emoji, tipo, color),
  subcategoria:subcategorias(id, nombre),
  cuenta:cuentas!movimientos_cuenta_id_fkey(id, nombre, tipo, color),
  cuenta_destino:cuentas!movimientos_cuenta_destino_id_fkey(id, nombre, tipo, color)
`

export async function getMovimientos(
  userId: string,
  options?: { limit?: number; tipo?: string; search?: string }
): Promise<Movimiento[]> {
  let query = supabase
    .from('movimientos')
    .select(MOVIMIENTO_SELECT)
    .eq('usuario_id', userId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.tipo && options.tipo !== 'todos') {
    query = query.eq('tipo', options.tipo)
  }
  if (options?.search) {
    query = query.ilike('nota', `%${options.search}%`)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Movimiento[]
}

export async function getMovimientosDelMes(userId: string): Promise<Movimiento[]> {
  const { start, end } = getCurrentMonthRange()

  const { data, error } = await supabase
    .from('movimientos')
    .select(MOVIMIENTO_SELECT)
    .eq('usuario_id', userId)
    .gte('fecha', start)
    .lte('fecha', end)
    .order('fecha', { ascending: false })

  if (error) throw error
  return data as Movimiento[]
}

export async function getMovimientosPorPeriodo(
  userId: string,
  start: string,
  end: string
): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select(MOVIMIENTO_SELECT)
    .eq('usuario_id', userId)
    .gte('fecha', start)
    .lte('fecha', end)
    .order('fecha', { ascending: false })

  if (error) throw error
  return data as Movimiento[]
}

function pad2(n: number) { return String(n).padStart(2, '0') }

export async function getEvolucionMensual(
  userId: string,
  meses = 6
): Promise<{ mes: string; ingresos: number; gastos: number }[]> {
  const now  = new Date()
  const keys: string[] = []
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }
  const start = `${keys[0]}-01`
  const end   = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-31`

  const { data, error } = await supabase
    .from('movimientos')
    .select('tipo, monto, fecha, para_tercero, fondos_tercero')
    .eq('usuario_id', userId)
    .gte('fecha', start)
    .lte('fecha', end)
    .in('tipo', ['ingreso', 'gasto'])

  if (error) throw error

  const byMes: Record<string, { ingresos: number; gastos: number }> = {}
  keys.forEach(k => { byMes[k] = { ingresos: 0, gastos: 0 } })

  for (const m of data ?? []) {
    const key = m.fecha.slice(0, 7)
    if (!byMes[key]) continue
    if (m.tipo === 'ingreso' && !m.fondos_tercero) byMes[key].ingresos += m.monto
    if (m.tipo === 'gasto'   && !m.para_tercero && !m.fondos_tercero)  byMes[key].gastos  += m.monto
  }

  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return keys.map(k => ({
    mes: nombres[parseInt(k.split('-')[1]) - 1],
    ...byMes[k]
  }))
}

export async function createMovimiento(
  userId: string,
  form: MovimientoFormData
): Promise<Movimiento> {
  const payload = {
    usuario_id:         userId,
    tipo:               form.tipo,
    fecha:              form.fecha,
    categoria_id:       form.categoria_id || null,
    subcategoria_id:    form.subcategoria_id || null,
    cuenta_id:          form.cuenta_id || null,
    cuenta_destino_id:  form.cuenta_destino_id || null,
    objetivo_ahorro_id: form.objetivo_ahorro_id || null,
    deuda_id:           form.deuda_id || null,
    compromiso_id:      form.compromiso_id || null,
    contexto_pago:      form.contexto_pago || null,
    capital:            form.capital ?? null,
    interes_pago:       form.interes_pago ?? null,
    monto:              form.monto,
    comercio:           form.comercio || null,
    nota:               form.nota || null,
    comprobante_url:    form.comprobante_url || null,
    comision:           form.comision ?? 0,
    para_tercero:       form.para_tercero ?? false,
    tercero_nombre:     form.tercero_nombre || null,
    fondos_tercero:     form.fondos_tercero ?? false,
    // Motor financiero
    origen_dinero:      form.origen_dinero || null,
    ingreso_origen_id:  form.ingreso_origen_id || null,
    dinero_asignado_id: form.dinero_asignado_id || null,
  }

  const { data, error } = await supabase
    .from('movimientos')
    .insert(payload)
    .select(MOVIMIENTO_SELECT)
    .single()

  if (error) throw error

  // fondos_tercero: el dinero entra y sale físicamente de la cuenta real → ambos lados
  // afectan el saldo (ingreso +, gasto/pago -). Los gráficos los excluyen por separado.
  {
    const { error: rpcError } = await supabase.rpc('procesar_movimiento', {
      p_tipo:              form.tipo,
      p_cuenta_id:         form.cuenta_id || null,
      p_cuenta_destino_id: form.cuenta_destino_id || null,
      p_objetivo_id:       form.objetivo_ahorro_id || null,
      p_deuda_id:          form.deuda_id || null,
      p_monto:             form.monto,
      p_movimiento_id:     data.id,
    })
    if (rpcError) throw rpcError
  }

  return data as Movimiento
}

// ✅ CORREGIDO: elimina el registro Y revierte los saldos usando RPC atómica
export async function deleteMovimiento(id: string): Promise<void> {
  // Pago de una deuda ligada a una tarjeta: la reversa de la base aún no deshace el efecto sobre la
  // tarjeta, así que eliminarlo descuadraría su saldo. Se bloquea hasta corregir esa función.
  const { data: mov } = await supabase
    .from('movimientos')
    .select('tipo, deuda_id, deuda:deudas(nombre, cuenta:cuentas(tipo))')
    .eq('id', id)
    .maybeSingle()
  if (mov?.tipo === 'pago_deuda' && mov.deuda_id) {
    const deuda = mov.deuda as unknown as { nombre?: string; cuenta?: { tipo?: string } | { tipo?: string }[] | null } | null
    const cuenta = Array.isArray(deuda?.cuenta) ? deuda?.cuenta[0] : deuda?.cuenta
    if (cuenta?.tipo === 'credito') {
      throw new Error(
        `Este pago pertenece a la deuda "${deuda?.nombre?.trim()}", ligada a una tarjeta de crédito. ` +
        'Eliminarlo aún no es seguro (descuadraría el saldo de la tarjeta). Pendiente de corregir en la base de datos.'
      )
    }
  }

  const { error } = await supabase.rpc('eliminar_movimiento', {
    p_movimiento_id: id
  })
  if (error) throw error
}

/**
 * Edita un movimiento existente.
 *  - Los campos que el formulario no maneja (para_tercero, deuda de un pago, objetivo) se conservan.
 *  - Los saldos solo se recalculan si cambió algo financiero (tipo, cuenta, destino, deuda, objetivo
 *    o monto). Cambiar fecha, nota, comercio, categoría o comprobante nunca toca saldos.
 */
export async function updateMovimiento(
  id: string,
  original: Movimiento,
  form: MovimientoFormData
): Promise<Movimiento> {
  const r = resolverEdicion(original, form)

  // Un pago de una deuda ligada a una tarjeta de crédito: la función de reversa de la base no deshace
  // el efecto sobre la tarjeta, así que recalcular saldos corrompería el saldo de la tarjeta.
  if (r.cambioFinanciero) {
    const ids = deudasInvolucradas(original, r.deudaNueva)
    if (ids.length > 0) {
      const { data: deudas, error: dError } = await supabase
        .from('deudas')
        .select('id, nombre, cuenta:cuentas(tipo)')
        .in('id', ids)
      if (dError) throw dError
      const ligada = (deudas ?? []).find(d => {
        const c = d.cuenta as unknown as { tipo?: string } | { tipo?: string }[] | null
        return (Array.isArray(c) ? c[0]?.tipo : c?.tipo) === 'credito'
      })
      if (ligada) {
        throw new Error(
          `Este pago pertenece a la deuda "${ligada.nombre.trim()}", que está ligada a una tarjeta de crédito. ` +
          'Cambiar el monto, la cuenta o la deuda aún no es seguro (descuadraría el saldo de la tarjeta). ' +
          'Puedes cambiar la fecha, la nota, el comercio y el comprobante.'
        )
      }
    }
  }

  // 1. Actualizar el registro
  const payload = {
    tipo:               form.tipo,
    fecha:              form.fecha,
    categoria_id:       form.categoria_id || null,
    subcategoria_id:    form.subcategoria_id || null,
    cuenta_id:          form.cuenta_id || null,
    cuenta_destino_id:  form.cuenta_destino_id || null,
    objetivo_ahorro_id: r.objetivoNuevo,
    deuda_id:           r.deudaNueva,
    monto:              form.monto,
    comercio:           form.comercio !== undefined ? (form.comercio || null) : original.comercio,
    // Si el formulario no trae la nota (guardar sin detalles) se conserva la existente
    nota:               form.nota !== undefined ? (form.nota || null) : original.nota,
    comprobante_url:    form.comprobante_url !== undefined ? form.comprobante_url : original.comprobante_url,
    comision:           form.comision       !== undefined ? form.comision        : original.comision,
    para_tercero:       r.paraTercero,
    tercero_nombre:     r.terceroNombre,
    // Marca "dinero de terceros": solo afecta estadísticas, nunca saldos
    fondos_tercero:     form.fondos_tercero !== undefined ? form.fondos_tercero : original.fondos_tercero,
    updated_at:         new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('movimientos')
    .update(payload)
    .eq('id', id)
    .select(MOVIMIENTO_SELECT)
    .single()

  if (error) throw error

  // 2. Recalcular saldos solo si cambió algo financiero (RPC atómica)
  if (r.cambioFinanciero) {
    const { error: rpcError } = await supabase.rpc('actualizar_movimiento_saldos', {
      p_tipo_anterior:           original.tipo,
      p_cuenta_anterior:         original.cuenta_id,
      p_cuenta_destino_anterior: original.cuenta_destino_id,
      p_objetivo_anterior:       original.objetivo_ahorro_id,
      p_deuda_anterior:          original.deuda_id,
      p_monto_anterior:          original.monto,
      p_tipo_nuevo:              form.tipo,
      p_cuenta_nueva:            form.cuenta_id || null,
      p_cuenta_destino_nueva:    form.cuenta_destino_id || null,
      p_objetivo_nuevo:          r.objetivoNuevo,
      p_deuda_nueva:             r.deudaNueva,
      p_monto_nuevo:             form.monto
    })
    if (rpcError) throw rpcError
  }

  return data as Movimiento
}

/**
 * Cambia SOLO el comprobante de un movimiento existente.
 * No llama a ninguna función de saldos: no altera montos, cuentas, deudas ni tarjetas.
 */
export async function setComprobanteMovimiento(id: string, url: string | null): Promise<void> {
  const { data, error } = await supabase
    .from('movimientos')
    .update({ comprobante_url: url })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length !== 1) throw new Error('No se encontró el movimiento')
}

// ─── Comprobantes (Supabase Storage) ─────────────────────────

export async function uploadComprobante(
  userId: string,
  file: File
): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('comprobantes')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('comprobantes').getPublicUrl(path)
  return data.publicUrl
}

export interface SaldoTerceros {
  fondos:          number   // ingresos fondos_tercero
  gastos:          number   // gastos para_tercero
  neto:            number   // fondos - gastos
  gastadoTerceros: number   // fondos_tercero gastos (ya usados)
  disponible:      number   // fondos - gastadoTerceros (saldo real disponible en virtual)
  primaryCuentaId: string | null  // cuenta real que recibió más fondos tercero
}

export async function getSaldoTerceros(userId: string): Promise<SaldoTerceros> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('monto, tipo, fecha, created_at, fondos_tercero, para_tercero, cuenta_id')
    .eq('usuario_id', userId)
    .or('fondos_tercero.eq.true,para_tercero.eq.true')

  if (error) throw error

  const filas = data ?? []
  // Saldo de terceros: cronológico y sin bajar de 0 (el exceso previo a un depósito es propio)
  const t = calcularSaldoTerceros(filas.map(m => ({ ...m, monto: Number(m.monto) })))
  const gastos = filas.filter(m => m.para_tercero).reduce((s, m) => s + Number(m.monto), 0)

  return {
    fondos:          t.fondos,
    gastos,
    neto:            t.fondos - gastos,
    gastadoTerceros: t.gastadoTerceros,
    disponible:      t.disponible,
    primaryCuentaId: t.primaryCuentaId,
  }
}

export async function deleteComprobante(url: string): Promise<void> {
  // Extraer el path desde la URL pública
  const parts = url.split('/comprobantes/')
  if (parts.length < 2) return
  const path = parts[1]
  await supabase.storage.from('comprobantes').remove([path])
}
