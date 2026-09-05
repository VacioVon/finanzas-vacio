import { supabase } from '@/lib/supabase'
import type { GastoCompartido, GastoCompartidoFormData } from '@/types/app.types'

export async function getGastosCompartidos(userId: string): Promise<GastoCompartido[]> {
  const { data, error } = await supabase
    .from('gastos_compartidos')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as GastoCompartido[]
}

export async function createGastoCompartido(
  userId: string,
  form: GastoCompartidoFormData
): Promise<GastoCompartido> {
  const { data, error } = await supabase
    .from('gastos_compartidos')
    .insert({
      usuario_id:    userId,
      movimiento_id: form.movimiento_id,
      monto_total:   form.monto_total,
      monto_usuario: form.monto_usuario,
      participantes: form.participantes,
      descripcion:   form.descripcion ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as GastoCompartido
}

export async function deleteGastoCompartido(id: string): Promise<void> {
  const { error } = await supabase
    .from('gastos_compartidos')
    .delete()
    .eq('id', id)
  if (error) throw error
}
