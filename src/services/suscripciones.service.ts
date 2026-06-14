import { supabase } from '@/lib/supabase'
import type { Suscripcion, SuscripcionFormData } from '@/types/app.types'
import { addMonths, addWeeks, addYears, format, parseISO, setDate } from 'date-fns'

const SUSCRIPCION_SELECT = '*, cuenta:cuentas(id, nombre, tipo, color), categoria:categorias(id, nombre, emoji, tipo, color, subcategorias(*)), subcategoria:subcategorias(id, nombre)'

function calcularProximaFecha(frecuencia: string, dia_cobro: number | null | undefined): string {
  const hoy = new Date()
  if (frecuencia === 'mensual' && dia_cobro) {
    let fecha = setDate(hoy, dia_cobro)
    if (fecha <= hoy) fecha = addMonths(fecha, 1)
    return format(fecha, 'yyyy-MM-dd')
  }
  if (frecuencia === 'semanal') return format(addWeeks(hoy, 1), 'yyyy-MM-dd')
  if (frecuencia === 'anual')   return format(addYears(hoy, 1),  'yyyy-MM-dd')
  return format(addMonths(hoy, 1), 'yyyy-MM-dd')
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
    usuario_id:    userId,
    nombre:        form.nombre,
    emoji:         form.emoji        ?? null,
    monto:         form.monto,
    frecuencia:    form.frecuencia,
    dia_cobro:     form.dia_cobro    ?? null,
    cuenta_id:       form.cuenta_id       || null,
    categoria_id:    form.categoria_id    || null,
    subcategoria_id: form.subcategoria_id || null,
    activa:          true,
    proxima_fecha: proxima,
    nota:          form.nota         ?? null
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
      ...(form.nombre        !== undefined && { nombre:        form.nombre }),
      ...(form.emoji         !== undefined && { emoji:         form.emoji || null }),
      ...(form.monto         !== undefined && { monto:         form.monto }),
      ...(form.frecuencia    !== undefined && { frecuencia:    form.frecuencia }),
      ...(form.dia_cobro     !== undefined && { dia_cobro:     form.dia_cobro ?? null }),
      ...(form.cuenta_id       !== undefined && { cuenta_id:       form.cuenta_id || null }),
      ...(form.categoria_id    !== undefined && { categoria_id:    form.categoria_id || null }),
      ...(form.subcategoria_id !== undefined && { subcategoria_id: form.subcategoria_id || null }),
      ...(form.proxima_fecha !== undefined && { proxima_fecha: form.proxima_fecha || null }),
      ...(form.nota          !== undefined && { nota:          form.nota || null }),
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

/** Avanza la próxima fecha al siguiente ciclo después de registrar un cobro */
export async function avanzarProximaFecha(suscripcion: Suscripcion): Promise<void> {
  const base  = suscripcion.proxima_fecha ? parseISO(suscripcion.proxima_fecha) : new Date()
  let siguiente: Date
  if (suscripcion.frecuencia === 'semanal')  siguiente = addWeeks(base, 1)
  else if (suscripcion.frecuencia === 'anual') siguiente = addYears(base, 1)
  else siguiente = addMonths(base, 1)

  const { error } = await supabase
    .from('suscripciones')
    .update({ proxima_fecha: format(siguiente, 'yyyy-MM-dd') })
    .eq('id', suscripcion.id)

  if (error) throw error
}
