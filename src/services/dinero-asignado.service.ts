import { supabase } from '@/lib/supabase'
import type { DineroAsignado, DineroAsignadoFormData } from '@/types/app.types'

const SELECT = `*, cuenta:cuentas(id, nombre, tipo, color, saldo_actual)`

export async function getDineroAsignado(userId: string): Promise<DineroAsignado[]> {
  const { data, error } = await supabase
    .from('dinero_asignado')
    .select(SELECT)
    .eq('usuario_id', userId)
    .eq('activo', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DineroAsignado[]
}

export async function getDineroAsignadoPorCuenta(
  userId: string,
  cuentaId: string
): Promise<DineroAsignado[]> {
  const { data, error } = await supabase
    .from('dinero_asignado')
    .select(SELECT)
    .eq('usuario_id', userId)
    .eq('cuenta_id', cuentaId)
    .eq('activo', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DineroAsignado[]
}

export async function createDineroAsignado(
  userId: string,
  form: DineroAsignadoFormData
): Promise<DineroAsignado> {
  const { data, error } = await supabase
    .from('dinero_asignado')
    .insert({
      usuario_id:      userId,
      cuenta_id:       form.cuenta_id,
      nombre:          form.nombre,
      emoji:           form.emoji ?? '📦',
      color:           form.color ?? '#2979FF',
      monto_reservado: form.monto_reservado,
      proposito_tipo:  form.proposito_tipo,
      referencia_id:   form.referencia_id ?? null,
      descripcion:     form.descripcion ?? null,
      fecha_limite:    form.fecha_limite ?? null,
    })
    .select(SELECT)
    .single()
  if (error) throw error
  return data as DineroAsignado
}

export async function updateDineroAsignado(
  id: string,
  form: Partial<DineroAsignadoFormData>
): Promise<void> {
  const { error } = await supabase
    .from('dinero_asignado')
    .update({
      ...(form.nombre          !== undefined && { nombre:          form.nombre }),
      ...(form.emoji           !== undefined && { emoji:           form.emoji }),
      ...(form.color           !== undefined && { color:           form.color }),
      ...(form.monto_reservado !== undefined && { monto_reservado: form.monto_reservado }),
      ...(form.proposito_tipo  !== undefined && { proposito_tipo:  form.proposito_tipo }),
      ...(form.descripcion     !== undefined && { descripcion:     form.descripcion }),
      ...(form.fecha_limite    !== undefined && { fecha_limite:    form.fecha_limite }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function usarDineroAsignado(
  sobreId: string,
  monto: number
): Promise<{ completado: boolean }> {
  const { data, error } = await supabase.rpc('usar_dinero_asignado', {
    p_dinero_asignado_id: sobreId,
    p_monto:              monto,
  })
  if (error) throw error
  return { completado: (data as { completado: boolean }).completado }
}

export async function deleteDineroAsignado(id: string): Promise<void> {
  const { error } = await supabase
    .from('dinero_asignado')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}
