import { supabase } from '@/lib/supabase'
import type { MisionRPG, VerificarMisionResultado } from '@/types/rpg.types'

export async function getMisionesUsuario(userId: string): Promise<MisionRPG[]> {
  const { data, error } = await supabase.rpc('obtener_misiones_usuario', {
    p_user_id: userId,
  })
  if (error) throw error
  return (data ?? []) as MisionRPG[]
}

export async function verificarMision(
  userId:   string,
  misionId: string
): Promise<VerificarMisionResultado> {
  const { data, error } = await supabase.rpc('verificar_mision', {
    p_user_id:   userId,
    p_mision_id: misionId,
  })
  if (error) throw error
  return data as VerificarMisionResultado
}

export async function verificarTodasMisiones(userId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('verificar_todas_misiones_usuario', {
    p_user_id: userId,
  })
  if (error) throw error
  return data
}
