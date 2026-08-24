import { supabase } from '@/lib/supabase'
import type { Planificacion, PlanificacionFormData } from '@/types/app.types'

const PLAN_SELECT = `
  *,
  cuenta:cuentas!planificaciones_cuenta_id_fkey(id, nombre, tipo, color),
  cuenta_destino:cuentas!planificaciones_cuenta_destino_id_fkey(id, nombre, tipo, color),
  categoria:categorias(id, nombre, emoji, tipo, color),
  objetivo:objetivos_ahorro(id, nombre, emoji, color, monto_objetivo, monto_actual)
`

export async function getPlanificaciones(userId: string): Promise<Planificacion[]> {
  const { data, error } = await supabase
    .from('planificaciones')
    .select(PLAN_SELECT)
    .eq('user_id', userId)
    .eq('estado', 'pendiente')
    .order('fecha', { ascending: true })

  if (error) throw error
  return data as Planificacion[]
}

export async function createPlanificacion(
  userId: string,
  form: PlanificacionFormData
): Promise<Planificacion> {
  const payload = {
    user_id:               userId,
    tipo:                  form.tipo,
    monto:                 form.monto,
    fecha:                 form.fecha,
    categoria_id:          form.categoria_id || null,
    subcategoria_id:       form.subcategoria_id || null,
    descripcion:           form.descripcion || null,
    comercio:              form.comercio || null,
    cuenta_id:             form.cuenta_id || null,
    cuenta_destino_id:     form.cuenta_destino_id || null,
    objetivo_id:           form.objetivo_id || null,
    nota:                  form.nota || null,
    recurrencia:           form.recurrencia || null,
    ocurrencias_restantes: form.ocurrencias_restantes ?? null,
  }

  const { data, error } = await supabase
    .from('planificaciones')
    .insert(payload)
    .select(PLAN_SELECT)
    .single()

  if (error) throw error
  return data as Planificacion
}

export async function cancelarPlanificacion(id: string): Promise<void> {
  const { error } = await supabase
    .from('planificaciones')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Conversión atómica vía RPC — crea movimiento real + actualiza saldos + genera próxima ocurrencia
export async function convertirPlanificacion(planificacionId: string): Promise<string> {
  const { data, error } = await supabase.rpc('convertir_planificacion_a_movimiento', {
    p_planificacion_id: planificacionId
  })

  if (error) throw new Error(error.message)
  return data as string  // movimiento_id generado
}
