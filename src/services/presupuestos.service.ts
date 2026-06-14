import { supabase } from '@/lib/supabase'
import type { Presupuesto, PresupuestoFormData } from '@/types/app.types'

const PRESUPUESTO_SELECT = `
  *,
  categoria:categorias(id, nombre, emoji, color, tipo)
`

export async function getPresupuestosMes(
  userId: string,
  mes: number,
  anio: number
): Promise<Presupuesto[]> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('usuario_id', userId)
    .eq('mes', mes)
    .eq('anio', anio)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Presupuesto[]
}

// Devuelve { [categoria_id]: monto_gastado } para el período dado
export async function getGastadoEnPeriodo(
  userId: string,
  start: string,
  end: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('categoria_id, monto')
    .eq('usuario_id', userId)
    .eq('tipo', 'gasto')
    .eq('para_tercero', false)
    .gte('fecha', start)
    .lte('fecha', end)

  if (error) throw error

  const gastado: Record<string, number> = {}
  for (const mov of data ?? []) {
    if (mov.categoria_id) {
      gastado[mov.categoria_id] = (gastado[mov.categoria_id] ?? 0) + Number(mov.monto)
    }
  }
  return gastado
}

export async function createPresupuesto(
  userId: string,
  form: PresupuestoFormData
): Promise<Presupuesto> {
  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      usuario_id:          userId,
      categoria_id:        form.categoria_id,
      mes:                 form.mes,
      anio:                form.anio,
      monto_presupuestado: form.monto_presupuestado
    })
    .select(PRESUPUESTO_SELECT)
    .single()

  if (error) throw error
  return data as Presupuesto
}

export async function updatePresupuesto(
  id: string,
  monto_presupuestado: number
): Promise<Presupuesto> {
  const { data, error } = await supabase
    .from('presupuestos')
    .update({ monto_presupuestado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PRESUPUESTO_SELECT)
    .single()

  if (error) throw error
  return data as Presupuesto
}

export async function deletePresupuesto(id: string): Promise<void> {
  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('id', id)

  if (error) throw error
}
