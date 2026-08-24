import { supabase } from '@/lib/supabase'
import type { Valorizacion } from '@/types/app.types'

export async function getValorizaciones(userId: string): Promise<Valorizacion[]> {
  const { data, error } = await supabase
    .from('valorizaciones')
    .select('*')
    .eq('usuario_id', userId)
    .order('fecha', { ascending: true })

  if (error) throw error
  return data as Valorizacion[]
}

export async function createValorizacion(
  userId: string,
  cuentaId: string,
  fecha: string,
  valor: number,
  nota?: string
): Promise<Valorizacion> {
  // Upsert: si ya hay una valorización para esa cuenta+fecha, la reemplaza
  const { data, error } = await supabase
    .from('valorizaciones')
    .upsert({
      usuario_id: userId,
      cuenta_id:  cuentaId,
      fecha,
      valor,
      nota: nota || null
    }, { onConflict: 'cuenta_id,fecha' })
    .select()
    .single()

  if (error) throw error

  // Actualiza saldo_actual de la cuenta al valor registrado
  await supabase
    .from('cuentas')
    .update({ saldo_actual: valor, updated_at: new Date().toISOString() })
    .eq('id', cuentaId)

  return data as Valorizacion
}

export async function deleteValorizacion(id: string): Promise<void> {
  const { error } = await supabase
    .from('valorizaciones')
    .delete()
    .eq('id', id)

  if (error) throw error
}
