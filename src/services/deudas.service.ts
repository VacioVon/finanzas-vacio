import { supabase } from '@/lib/supabase'
import type { Deuda, DeudaFormData, PagoDeudaHistorial } from '@/types/app.types'

export async function getDeudas(userId: string): Promise<Deuda[]> {
  const [{ data, error }, { data: pagos, error: pagosError }] = await Promise.all([
    supabase
      .from('deudas')
      .select('*, categoria:categorias(id,nombre,emoji,color,tipo), cuenta:cuentas(id,nombre,tipo,color)')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('movimientos')
      .select('deuda_id, monto')
      .eq('usuario_id', userId)
      .eq('tipo', 'pago_deuda')
      .not('deuda_id', 'is', null)
  ])

  if (error)      throw error
  if (pagosError) throw pagosError

  // Sumar pagos reales por deuda_id
  const pagadoMap: Record<string, number> = {}
  for (const p of pagos ?? []) {
    if (p.deuda_id) pagadoMap[p.deuda_id] = (pagadoMap[p.deuda_id] ?? 0) + p.monto
  }

  return (data as Deuda[]).map(d => ({
    ...d,
    monto_pagado_real:    pagadoMap[d.id] ?? 0,
    monto_pendiente_real: Math.max(0, d.monto_total - (pagadoMap[d.id] ?? 0)),
  }))
}

export async function createDeuda(userId: string, form: DeudaFormData): Promise<Deuda> {
  const { data, error } = await supabase
    .from('deudas')
    .insert({
      usuario_id:          userId,
      nombre:              form.nombre,
      tipo_deuda:          form.tipo_deuda          ?? null,
      prestamista_nombre:  form.prestamista_nombre  ?? null,
      categoria_id:        form.categoria_id         || null,
      monto_total:         form.monto_total,
      monto_pendiente:     form.monto_total,           // empieza igual al total
      cuotas_total:        form.cuotas_total           ?? 1,
      cuotas_pagadas:      0,
      cuota_mensual:       form.cuota_mensual          ?? null,
      interes:             form.interes                ?? 0,
      fecha_compra:        form.fecha_compra,
      fecha_prox_pago:     form.fecha_prox_pago        ?? null,
      fecha_vencimiento:   form.fecha_vencimiento      ?? null,
      nota:                form.nota                   ?? null,
      estado:              'activa'
    })
    .select('*, categoria:categorias(id,nombre,emoji,color,tipo), cuenta:cuentas(id,nombre,tipo,color)')
    .single()

  if (error) throw error
  return data as Deuda
}

export async function updateDeuda(id: string, form: Partial<DeudaFormData>): Promise<Deuda> {
  const { data, error } = await supabase
    .from('deudas')
    .update({
      ...(form.nombre             !== undefined && { nombre:            form.nombre }),
      ...(form.tipo_deuda         !== undefined && { tipo_deuda:        form.tipo_deuda || null }),
      ...(form.categoria_id       !== undefined && { categoria_id:      form.categoria_id || null }),
      ...(form.monto_total        !== undefined && { monto_total:       form.monto_total }),
      ...(form.cuotas_total       !== undefined && { cuotas_total:      form.cuotas_total }),
      ...(form.cuota_mensual      !== undefined && { cuota_mensual:     form.cuota_mensual || null }),
      ...(form.interes            !== undefined && { interes:           form.interes }),
      ...(form.fecha_compra       !== undefined && { fecha_compra:      form.fecha_compra }),
      ...(form.fecha_prox_pago    !== undefined && { fecha_prox_pago:   form.fecha_prox_pago || null }),
      ...(form.fecha_vencimiento  !== undefined && { fecha_vencimiento: form.fecha_vencimiento || null }),
      ...(form.nota               !== undefined && { nota:              form.nota || null }),
      ...(form.prestamista_nombre !== undefined && { prestamista_nombre: form.prestamista_nombre || null }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*, categoria:categorias(id,nombre,emoji,color,tipo), cuenta:cuentas(id,nombre,tipo,color)')
    .single()

  if (error) throw error
  return data as Deuda
}

export async function updateEstadoDeuda(
  id: string,
  estado: 'activa' | 'pagada' | 'en_mora'
): Promise<void> {
  const { error } = await supabase
    .from('deudas')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteDeuda(id: string): Promise<void> {
  const { error } = await supabase
    .from('deudas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/** Historial de pagos vinculados a una deuda específica */
export async function getHistorialPagosDeuda(
  deudaId: string,
  userId: string
): Promise<PagoDeudaHistorial[]> {
  const { data, error } = await supabase
    .rpc('obtener_historial_pagos_deuda', { p_deuda_id: deudaId, p_user_id: userId })
  if (error) throw error
  return (data ?? []) as PagoDeudaHistorial[]
}

/** Total pendiente de todas las deudas activas — usado para Patrimonio Neto */
export async function getTotalDeudasActivas(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('deudas')
    .select('monto_pendiente')
    .eq('usuario_id', userId)
    .eq('estado', 'activa')

  if (error) throw error
  return (data ?? []).reduce((s, d) => s + d.monto_pendiente, 0)
}
