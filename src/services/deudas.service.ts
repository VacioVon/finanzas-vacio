import { supabase } from '@/lib/supabase'
import type { Deuda, DeudaFormData, PagoDeudaHistorial, Movimiento } from '@/types/app.types'
import { createMovimiento } from '@/services/movimientos.service'
import { esPagoSinAsignar, notaSinAsignar, type LineaAsignacion } from '@/utils/pagosSinAsignar'

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
  const pagadoInicial = Math.max(0, Math.round(form.pagado_inicial ?? 0))
  if (pagadoInicial >= form.monto_total && pagadoInicial > 0) {
    throw new Error('Lo pagado hasta ahora debe ser menor al monto de la deuda')
  }

  const { data, error } = await supabase
    .from('deudas')
    .insert({
      usuario_id:          userId,
      nombre:              form.nombre,
      tipo_deuda:          form.tipo_deuda          ?? null,
      prestamista_nombre:  form.prestamista_nombre?.trim() || null,
      categoria_id:        form.categoria_id         || null,
      cuenta_id:           form.cuenta_id            || null,
      monto_total:         form.monto_total,
      monto_pendiente:     form.monto_total - pagadoInicial,  // total menos el pago histórico (si hay)
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

  // Pago histórico: movimiento real pago_deuda SIN cuenta. procesar_movimiento no se invoca,
  // así que ningún saldo cambia; solo alimenta el "pagado" real de la deuda.
  if (pagadoInicial > 0) {
    const { error: movError } = await supabase.from('movimientos').insert({
      usuario_id:    userId,
      tipo:          'pago_deuda',
      fecha:         form.fecha_compra,
      deuda_id:      data.id,
      monto:         pagadoInicial,
      nota:          'Pago previo al registro en QloB',
      contexto_pago: 'deuda_propia',
    })
    if (movError) {
      await supabase.from('deudas').delete().eq('id', data.id)   // revertir la deuda recién creada
      throw movError
    }
  }

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
      ...(form.cuenta_id          !== undefined && { cuenta_id:          form.cuenta_id          || null }),
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
  // Lectura directa (mismos filtros que el RPC obtener_historial_pagos_deuda) para traer también el comprobante
  const { data, error } = await supabase
    .from('movimientos')
    .select('id, fecha, monto, capital, interes_pago, cuenta_id, nota, contexto_pago, created_at, tipo, comprobante_url, fondos_tercero, cuenta:cuentas!movimientos_cuenta_id_fkey(nombre)')
    .eq('deuda_id', deudaId)
    .eq('usuario_id', userId)
    .in('tipo', ['pago_deuda', 'pago_tarjeta', 'transferencia', 'gasto'])
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => {
    const { cuenta, ...resto } = r as unknown as Record<string, unknown> & { cuenta: { nombre: string } | { nombre: string }[] | null }
    const nombre = Array.isArray(cuenta) ? cuenta[0]?.nombre : cuenta?.nombre
    return { ...resto, cuenta_nombre: nombre ?? null } as unknown as PagoDeudaHistorial
  })
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

/**
 * Asigna un pago a la tarjeta "sin asignar" a las deudas que indica el estado de cuenta.
 * Orden pensado para no perder dinero ni dejar saldos dobles:
 *  1. Revisa en la base que el pago siga sin asignar (evita asignarlo dos veces).
 *  2. Lo elimina (la base devuelve el dinero a la cuenta y quita el abono de la tarjeta).
 *  3. Registra un pago de deuda por cada línea (cada uno vuelve a bajar la cuenta y la tarjeta).
 *  4. Si sobra monto, o si una línea falla, vuelve a dejar lo no asignado como pago sin asignar.
 */
export async function asignarPagoTarjeta(
  userId: string,
  pago: Pick<Movimiento, 'id' | 'cuenta_id' | 'cuenta_destino_id' | 'monto' | 'fecha'>,
  lineas: LineaAsignacion[]
): Promise<{ asignado: number; restante: number }> {
  const { data: actual, error: eLeer } = await supabase
    .from('movimientos').select('id, tipo, nota, monto, cuenta_id, cuenta_destino_id, fecha').eq('id', pago.id).eq('usuario_id', userId).maybeSingle()
  if (eLeer) throw new Error(eLeer.message)
  if (!actual || !esPagoSinAsignar(actual as Movimiento)) throw new Error('Ese pago ya no está sin asignar')
  const disponible = Number(actual.monto)
  const total = lineas.reduce((s, l) => s + l.monto, 0)
  if (total <= 0 || total > disponible) throw new Error('Los montos asignados no son válidos')

  const { error: eDel } = await supabase.rpc('eliminar_movimiento', { p_movimiento_id: pago.id })
  if (eDel) throw new Error(eDel.message)

  const reponer = async (monto: number) => {
    if (monto > 0) await createMovimiento(userId, {
      tipo: 'pago_tarjeta', fecha: actual.fecha, monto, cuenta_id: actual.cuenta_id, cuenta_destino_id: actual.cuenta_destino_id, nota: notaSinAsignar(),
    })
  }

  let hecho = 0
  try {
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i]
      await createMovimiento(userId, {
        tipo: 'pago_deuda', fecha: actual.fecha, monto: l.monto, cuenta_id: actual.cuenta_id, deuda_id: l.deudaId,
        contexto_pago: 'deuda_propia', nota: `Pago de tarjeta asignado (${i + 1}/${lineas.length}) · ${l.nombre}`,
      })
      hecho += l.monto
    }
  } catch (e: unknown) {
    await reponer(disponible - hecho)   // lo que no alcanzó a asignarse queda como pago sin asignar
    throw new Error((e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)) + ` (asignado hasta ahora: $${hecho.toLocaleString('es-CL')})`)
  }
  await reponer(disponible - hecho)
  return { asignado: hecho, restante: disponible - hecho }
}
