import { supabase } from '@/lib/supabase'
import type { Suscripcion, SuscripcionFormData } from '@/types/app.types'
import { addDays, addMonths, addWeeks, addYears, format, parseISO, setDate } from 'date-fns'

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
  cuenta_id:   string
  monto:       number   // puede ser distinto al compromiso.monto si es estimado
  fecha:       string
  categoria_id?: string
  subcategoria_id?: string
  nota?: string
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
    })

  if (movErr) throw movErr

  // 2. Descontar saldo de la cuenta (era el paso faltante que causaba el bug)
  const { error: rpcError } = await supabase.rpc('procesar_movimiento', {
    p_tipo:              'gasto',
    p_cuenta_id:         pago.cuenta_id,
    p_cuenta_destino_id: null,
    p_objetivo_id:       null,
    p_deuda_id:          null,
    p_monto:             pago.monto,
  })
  if (rpcError) throw rpcError

  // 3. Avanzar proxima_fecha
  const base      = compromiso.proxima_fecha ? parseISO(compromiso.proxima_fecha) : new Date()
  const siguiente = avanzarFecha(base, compromiso.frecuencia, compromiso.dia_cobro)

  const updates: Record<string, unknown> = {
    proxima_fecha: format(siguiente, 'yyyy-MM-dd')
  }
  if (compromiso.fecha_fin && siguiente > parseISO(compromiso.fecha_fin)) {
    updates.activa = false
  }

  const { error: updErr } = await supabase
    .from('suscripciones')
    .update(updates)
    .eq('id', compromiso.id)

  if (updErr) throw updErr
}
