import { supabase } from '@/lib/supabase'
import type { Movimiento, MovimientoFormData } from '@/types/app.types'
import { getCurrentMonthRange } from '@/utils/dates'

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
    .select('tipo, monto, fecha, para_tercero')
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
    if (m.tipo === 'ingreso') byMes[key].ingresos += m.monto
    if (m.tipo === 'gasto' && !m.para_tercero) byMes[key].gastos += m.monto
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

  // Actualizar saldos en cascada (RPC atómica)
  const { error: rpcError } = await supabase.rpc('procesar_movimiento', {
    p_tipo:              form.tipo,
    p_cuenta_id:         form.cuenta_id || null,
    p_cuenta_destino_id: form.cuenta_destino_id || null,
    p_objetivo_id:       form.objetivo_ahorro_id || null,
    p_deuda_id:          form.deuda_id || null,
    p_monto:             form.monto
  })
  if (rpcError) throw rpcError

  return data as Movimiento
}

// ✅ CORREGIDO: elimina el registro Y revierte los saldos usando RPC atómica
export async function deleteMovimiento(id: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_movimiento', {
    p_movimiento_id: id
  })
  if (error) throw error
}

// ✅ CORREGIDO: actualiza el registro Y maneja reversión + reaplicación de saldos
export async function updateMovimiento(
  id: string,
  original: Movimiento,
  form: MovimientoFormData
): Promise<Movimiento> {
  // 1. Actualizar el registro
  const payload = {
    tipo:               form.tipo,
    fecha:              form.fecha,
    categoria_id:       form.categoria_id || null,
    subcategoria_id:    form.subcategoria_id || null,
    cuenta_id:          form.cuenta_id || null,
    cuenta_destino_id:  form.cuenta_destino_id || null,
    objetivo_ahorro_id: form.objetivo_ahorro_id || null,
    deuda_id:           form.deuda_id || null,
    monto:              form.monto,
    comercio:           form.comercio !== undefined ? (form.comercio || null) : original.comercio,
    nota:               form.nota || null,
    comprobante_url:    form.comprobante_url !== undefined ? form.comprobante_url : original.comprobante_url,
    comision:           form.comision       !== undefined ? form.comision        : original.comision,
    para_tercero:       form.para_tercero ?? original.para_tercero,
    tercero_nombre:     form.tercero_nombre !== undefined ? (form.tercero_nombre || null) : original.tercero_nombre,
    updated_at:         new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('movimientos')
    .update(payload)
    .eq('id', id)
    .select(MOVIMIENTO_SELECT)
    .single()

  if (error) throw error

  // 2. Revertir saldo anterior + aplicar saldo nuevo (RPC atómica)
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
    p_objetivo_nuevo:          form.objetivo_ahorro_id || null,
    p_deuda_nueva:             form.deuda_id || null,
    p_monto_nuevo:             form.monto
  })
  if (rpcError) throw rpcError

  return data as Movimiento
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

export async function deleteComprobante(url: string): Promise<void> {
  // Extraer el path desde la URL pública
  const parts = url.split('/comprobantes/')
  if (parts.length < 2) return
  const path = parts[1]
  await supabase.storage.from('comprobantes').remove([path])
}
