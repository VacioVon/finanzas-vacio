import { supabase } from '@/lib/supabase'
import type { Suscripcion, SuscripcionFormData } from '@/types/app.types'
import { addDays, addMonths, addWeeks, addYears, format, parseISO, setDate } from 'date-fns'
import { validarPagoConDeuda } from '@/utils/pagoCompromisoDeuda'

export interface PagoCompromisoHistorial {
  id:            string
  compromiso_id: string
  monto:         number
  fecha:         string
  nota:          string | null
}

const SUSCRIPCION_SELECT = '*, cuenta:cuentas(id, nombre, tipo, color), categoria:categorias(id, nombre, emoji, tipo, color, subcategorias(*)), subcategoria:subcategorias(id, nombre)'

function avanzarFecha(base: Date, frecuencia: string, dia_cobro: number | null | undefined): Date {
  switch (frecuencia) {
    case 'semanal':    return addWeeks(base, 1)
    case 'quincenal':  return addDays(base, 15)
    case 'mensual':    return addMonths(base, 1)
    case 'bimestral':  return addMonths(base, 2)
    case 'trimestral': return addMonths(base, 3)
    case 'semestral':  return addMonths(base, 6)
    case 'anual':      return addYears(base, 1)
    default:           return addMonths(base, 1)
  }
}

function calcularProximaFecha(frecuencia: string, dia_cobro: number | null | undefined): string {
  const hoy = new Date()
  if (frecuencia === 'mensual' && dia_cobro) {
    let fecha = setDate(hoy, dia_cobro)
    if (fecha <= hoy) fecha = addMonths(fecha, 1)
    return format(fecha, 'yyyy-MM-dd')
  }
  if (frecuencia === 'semanal') return format(addWeeks(hoy, 1), 'yyyy-MM-dd')
  const siguiente = avanzarFecha(hoy, frecuencia, dia_cobro)
  return format(siguiente, 'yyyy-MM-dd')
}

export async function getSuscripciones(userId: string): Promise<Suscripcion[]> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select(SUSCRIPCION_SELECT)
    .eq('usuario_id', userId)
    .order('proxima_fecha', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data as Suscripcion[]
}

export async function createSuscripcion(userId: string, form: SuscripcionFormData): Promise<Suscripcion> {
  const proxima = form.proxima_fecha || calcularProximaFecha(form.frecuencia, form.dia_cobro)

  const payload = {
    usuario_id:      userId,
    nombre:          form.nombre,
    emoji:           form.emoji           ?? null,
    monto:           form.monto,
    frecuencia:      form.frecuencia,
    dia_cobro:       form.dia_cobro       ?? null,
    cuenta_id:       form.cuenta_id       || null,
    categoria_id:    form.categoria_id    || null,
    subcategoria_id: form.subcategoria_id || null,
    activa:          true,
    proxima_fecha:   proxima,
    nota:            form.nota            ?? null,
    tipo:            form.tipo            ?? 'servicio',
    monto_tipo:      form.monto_tipo      ?? 'fijo',
    fecha_fin:       form.fecha_fin       || null,
  }

  const { data, error } = await supabase
    .from('suscripciones')
    .insert(payload)
    .select(SUSCRIPCION_SELECT)
    .single()

  if (error) throw error
  return data as Suscripcion
}

export async function updateSuscripcion(id: string, form: Partial<SuscripcionFormData>): Promise<Suscripcion> {
  const { data, error } = await supabase
    .from('suscripciones')
    .update({
      ...(form.nombre        !== undefined && { nombre:          form.nombre }),
      ...(form.emoji         !== undefined && { emoji:           form.emoji || null }),
      ...(form.monto         !== undefined && { monto:           form.monto }),
      ...(form.frecuencia    !== undefined && { frecuencia:      form.frecuencia }),
      ...(form.dia_cobro     !== undefined && { dia_cobro:       form.dia_cobro ?? null }),
      ...(form.cuenta_id       !== undefined && { cuenta_id:       form.cuenta_id || null }),
      ...(form.categoria_id    !== undefined && { categoria_id:    form.categoria_id || null }),
      ...(form.subcategoria_id !== undefined && { subcategoria_id: form.subcategoria_id || null }),
      ...(form.proxima_fecha !== undefined && { proxima_fecha: form.proxima_fecha || null }),
      ...(form.nota          !== undefined && { nota:           form.nota || null }),
      ...(form.tipo          !== undefined && { tipo:           form.tipo }),
      ...(form.monto_tipo    !== undefined && { monto_tipo:     form.monto_tipo }),
      ...(form.fecha_fin     !== undefined && { fecha_fin:      form.fecha_fin || null }),
    })
    .eq('id', id)
    .select(SUSCRIPCION_SELECT)
    .single()

  if (error) throw error
  return data as Suscripcion
}

export async function toggleSuscripcion(id: string, activa: boolean): Promise<void> {
  const { error } = await supabase
    .from('suscripciones')
    .update({ activa })
    .eq('id', id)

  if (error) throw error
}

export async function deleteSuscripcion(id: string): Promise<void> {
  const { error } = await supabase
    .from('suscripciones')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/** Avanza la próxima fecha sin registrar movimiento (uso interno / legacy) */
export async function avanzarProximaFecha(suscripcion: Suscripcion): Promise<void> {
  const base     = suscripcion.proxima_fecha ? parseISO(suscripcion.proxima_fecha) : new Date()
  const siguiente = avanzarFecha(base, suscripcion.frecuencia, suscripcion.dia_cobro)

  const { error } = await supabase
    .from('suscripciones')
    .update({ proxima_fecha: format(siguiente, 'yyyy-MM-dd') })
    .eq('id', suscripcion.id)

  if (error) throw error
}

export interface PagoCompromisoData {
  cuenta_id:       string
  monto:           number   // puede ser distinto al compromiso.monto si es estimado
  fecha:           string
  categoria_id?:   string
  subcategoria_id?: string
  nota?:           string
  fondos_tercero?: boolean
}

/**
 * Registra el pago de un compromiso atómicamente:
 * 1. Crea movimiento tipo `gasto` vinculado via compromiso_id
 * 2. Llama procesar_movimiento para descontar el saldo de la cuenta
 * 3. Avanza proxima_fecha al siguiente ciclo
 */
export async function registrarPagoCompromiso(
  userId: string,
  compromiso: Suscripcion,
  pago: PagoCompromisoData
): Promise<void> {
  // 1. Crear movimiento vinculado
  const { error: movErr } = await supabase
    .from('movimientos')
    .insert({
      usuario_id:      userId,
      tipo:            'gasto',
      fecha:           pago.fecha,
      monto:           pago.monto,
      cuenta_id:       pago.cuenta_id,
      categoria_id:    pago.categoria_id    || compromiso.categoria_id    || null,
      subcategoria_id: pago.subcategoria_id || compromiso.subcategoria_id || null,
      nota:            pago.nota ?? `Pago: ${compromiso.nombre}`,
      compromiso_id:   compromiso.id,
      fondos_tercero:  pago.fondos_tercero ?? false,
    })

  if (movErr) throw new Error(movErr.message)

  // 2. Descontar saldo de la cuenta
  const { error: rpcError } = await supabase.rpc('procesar_movimiento', {
    p_tipo:              'gasto',
    p_cuenta_id:         pago.cuenta_id,
    p_cuenta_destino_id: null,
    p_objetivo_id:       null,
    p_deuda_id:          null,
    p_monto:             pago.monto,
    p_movimiento_id:     null,
  })
  if (rpcError) throw new Error(rpcError.message)

  // 3. Avanzar proxima_fecha
  await marcarCompromisoPagado(compromiso, pago.fecha)
}

/** Deja el compromiso como pagado: avanza proxima_fecha al siguiente ciclo y guarda el último pago. */
export async function marcarCompromisoPagado(compromiso: Suscripcion, fechaPago: string): Promise<void> {
  const base      = compromiso.proxima_fecha ? parseISO(compromiso.proxima_fecha) : new Date()
  const siguiente = avanzarFecha(base, compromiso.frecuencia, compromiso.dia_cobro)

  const updates: Record<string, unknown> = {
    proxima_fecha:     format(siguiente, 'yyyy-MM-dd'),
    ultimo_pago_fecha: fechaPago,
  }
  if (compromiso.fecha_fin && siguiente > parseISO(compromiso.fecha_fin)) {
    updates.activa = false
  }

  const { error: updErr } = await supabase
    .from('suscripciones')
    .update(updates)
    .eq('id', compromiso.id)

  if (updErr) throw new Error(updErr.message)
}

// ─── Pago de un compromiso con una deuda de tarjeta ──────────────

export interface PagoConDeudaData {
  cuenta_id: string   // cuenta de donde sale el dinero (débito, efectivo…)
  monto:     number
  fecha:     string
  nota?:     string
  fondos_tercero?: boolean   // pagado con plata de terceros: no cuenta como gasto propio
}

/** El dinero ya se movió bien, pero no se pudo marcar el compromiso: se puede reintentar solo ese paso. */
export class PagoRegistradoSinMarcarError extends Error {
  constructor(public movimientoId: string, detalle: string) {
    super('El pago se registró correctamente, pero no se pudo marcar el compromiso como pagado. ' +
          'Reintenta ese paso (no vuelve a descontar dinero). Detalle: ' + detalle)
  }
}

/**
 * Paga un compromiso abonando a una deuda ligada a una tarjeta de crédito, con UN solo movimiento:
 *  1. Crea el movimiento 'pago_deuda' enlazado a la deuda y al compromiso.
 *  2. procesar_movimiento: baja la cuenta de origen, la deuda y la deuda de la tarjeta (una sola vez).
 *  3. Avanza el compromiso al siguiente ciclo.
 * Si falla el paso 2 se deshace el movimiento. Si falla el 3 el dinero ya quedó bien (ver error).
 */
export async function registrarPagoCompromisoConDeuda(
  userId: string,
  compromiso: Suscripcion,
  deudaId: string,
  pago: PagoConDeudaData
): Promise<{ movimientoId: string }> {
  // Revalidar contra la base (no confiar en datos de la pantalla)
  const { data: deuda, error: dErr } = await supabase
    .from('deudas')
    .select('id, nombre, estado, monto_total, cuenta:cuentas(tipo, activa)')
    .eq('id', deudaId)
    .single()
  if (dErr) throw new Error(dErr.message)
  if (deuda.estado === 'pagada') throw new Error('Esa deuda ya está pagada')
  const tarjeta = deuda.cuenta as unknown as { tipo?: string } | { tipo?: string }[] | null
  if ((Array.isArray(tarjeta) ? tarjeta[0]?.tipo : tarjeta?.tipo) !== 'credito') {
    throw new Error('Esa deuda no está ligada a una tarjeta de crédito')
  }

  const { data: pagosPrevios, error: pErr } = await supabase
    .from('movimientos')
    .select('monto')
    .eq('usuario_id', userId)
    .eq('tipo', 'pago_deuda')
    .eq('deuda_id', deudaId)
  if (pErr) throw new Error(pErr.message)
  const pendiente = Math.max(0, Number(deuda.monto_total) - (pagosPrevios ?? []).reduce((s, p) => s + Number(p.monto), 0))

  const { data: origen, error: oErr } = await supabase
    .from('cuentas').select('tipo, activa').eq('id', pago.cuenta_id).single()
  if (oErr) throw new Error(oErr.message)
  const invalido = validarPagoConDeuda(pendiente, pago.monto, origen)
  if (invalido) throw new Error(invalido)

  // 1. Movimiento único y conectado
  const { data: mov, error: movErr } = await supabase
    .from('movimientos')
    .insert({
      usuario_id:      userId,
      tipo:            'pago_deuda',
      fecha:           pago.fecha,
      monto:           pago.monto,
      cuenta_id:       pago.cuenta_id,
      deuda_id:        deudaId,
      compromiso_id:   compromiso.id,
      contexto_pago:   'deuda_propia',
      fondos_tercero:  pago.fondos_tercero ?? false,
      categoria_id:    compromiso.categoria_id    || null,
      subcategoria_id: compromiso.subcategoria_id || null,
      nota:            pago.nota ?? `Pago: ${compromiso.nombre} · ${deuda.nombre.trim()}`,
    })
    .select('id')
    .single()
  if (movErr) throw new Error(movErr.message)

  // 2. Saldos (cuenta, deuda y tarjeta, una sola vez)
  const { error: rpcError } = await supabase.rpc('procesar_movimiento', {
    p_tipo:              'pago_deuda',
    p_cuenta_id:         pago.cuenta_id,
    p_cuenta_destino_id: null,
    p_objetivo_id:       null,
    p_deuda_id:          deudaId,
    p_monto:             pago.monto,
    p_movimiento_id:     mov.id,
  })
  if (rpcError) {
    await supabase.from('movimientos').delete().eq('id', mov.id)   // deshacer el movimiento recién creado
    throw new Error(rpcError.message)
  }

  // 3. Compromiso pagado
  try {
    await marcarCompromisoPagado(compromiso, pago.fecha)
  } catch (e: unknown) {
    throw new PagoRegistradoSinMarcarError(mov.id, e instanceof Error ? e.message : String(e))
  }

  return { movimientoId: mov.id }
}

export async function getPagosCompromiso(userId: string): Promise<PagoCompromisoHistorial[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('id, compromiso_id, monto, fecha, nota')
    .eq('usuario_id', userId)
    .in('tipo', ['gasto', 'pago_deuda'])
    .not('compromiso_id', 'is', null)
    .order('fecha', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as PagoCompromisoHistorial[]
}
