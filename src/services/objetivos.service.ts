import { supabase } from '@/lib/supabase'
import type { ObjetivoAhorro, ObjetivoFormData, AporteObjetivo } from '@/types/app.types'

export async function getObjetivos(userId: string): Promise<ObjetivoAhorro[]> {
  const { data, error } = await supabase
    .from('objetivos_ahorro')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as ObjetivoAhorro[]
}

export async function createObjetivo(
  userId: string,
  form: ObjetivoFormData
): Promise<ObjetivoAhorro> {
  const { data, error } = await supabase
    .from('objetivos_ahorro')
    .insert({
      usuario_id:          userId,
      nombre:              form.nombre,
      emoji:               form.emoji || null,
      color:               form.color,
      imagen_url:          form.imagen_url || null,
      monto_objetivo:      form.monto_objetivo,
      monto_actual:        0,
      fecha_objetivo:      form.fecha_objetivo || null,
      descripcion:         form.descripcion || null,
      cuenta_vinculada_id: form.cuenta_vinculada_id || null,
      estado:              'activo'
    })
    .select()
    .single()

  if (error) throw error
  return data as ObjetivoAhorro
}

export async function updateObjetivo(
  id: string,
  form: Partial<ObjetivoFormData>
): Promise<ObjetivoAhorro> {
  const { data, error } = await supabase
    .from('objetivos_ahorro')
    .update({
      ...(form.nombre               !== undefined && { nombre:              form.nombre }),
      ...(form.emoji                !== undefined && { emoji:               form.emoji || null }),
      ...(form.color                !== undefined && { color:               form.color }),
      ...(form.monto_objetivo       !== undefined && { monto_objetivo:      form.monto_objetivo }),
      ...(form.fecha_objetivo       !== undefined && { fecha_objetivo:      form.fecha_objetivo || null }),
      ...(form.descripcion          !== undefined && { descripcion:         form.descripcion || null }),
      ...(form.cuenta_vinculada_id  !== undefined && { cuenta_vinculada_id: form.cuenta_vinculada_id || null }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ObjetivoAhorro
}

/**
 * Asigna (o resta) fondos a un objetivo SIN tocar ninguna cuenta.
 * El dinero permanece físicamente donde está — solo se registra el propósito.
 * Llama a la RPC asignar_fondos_objetivo que:
 *   1. Actualiza objetivo.monto_actual atómicamente
 *   2. Inserta un registro en aportes_objetivos (con fecha y nota)
 *
 * @param delta  Positivo = agregar progreso. Negativo = restar progreso.
 * @param nota   Comentario opcional ("Depósito de marzo", etc.)
 * @param fecha  Fecha del aporte en formato YYYY-MM-DD (default: hoy)
 */
export async function asignarFondosObjetivo(
  id:     string,
  delta:  number,
  nota?:  string,
  fecha?: string
): Promise<ObjetivoAhorro> {
  const { data, error } = await supabase
    .rpc('asignar_fondos_objetivo', {
      p_objetivo_id: id,
      p_delta:       delta,
      p_nota:        nota  ?? null,
      p_fecha:       fecha ?? new Date().toISOString().slice(0, 10)
    })

  if (error) throw error
  return data as ObjetivoAhorro
}

/**
 * Obtiene todos los aportes a objetivos de un usuario en un rango de fechas.
 * Usado para calcular el ahorro intencional del período presupuestal.
 */
export async function getAportesObjetivosPeriodo(
  userId: string,
  start:  string,   // 'YYYY-MM-DD'
  end:    string    // 'YYYY-MM-DD'
): Promise<AporteObjetivo[]> {
  const { data, error } = await supabase
    .from('aportes_objetivos')
    .select('*')
    .eq('usuario_id', userId)
    .gte('fecha', start)
    .lte('fecha', end)
    .order('fecha', { ascending: false })

  if (error) throw error
  return data as AporteObjetivo[]
}

export async function deleteObjetivo(id: string): Promise<void> {
  const { error } = await supabase
    .from('objetivos_ahorro')
    .delete()
    .eq('id', id)

  if (error) throw error
}
