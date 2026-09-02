import { supabase } from '@/lib/supabase'
import type { MisionManual, MisionManualLog, CompletarMisionManualResult } from '@/types/rpg.types'

export async function getMisionesManual(): Promise<MisionManual[]> {
  const { data, error } = await supabase
    .from('misiones_manuales')
    .select('id, clave, camino, nombre, descripcion, emoji, xp_recompensa, stat_key, cooldown_horas, orden_ui')
    .eq('activa', true)
    .order('orden_ui')
  if (error) throw error
  return (data ?? []) as MisionManual[]
}

export async function getLogManual(userId: string): Promise<MisionManualLog[]> {
  // Trae la última completación por misión (máx. 7 días atrás para cubrir cooldowns de hasta 168h)
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('misiones_manuales_log')
    .select('id, mision_id, xp_otorgada, dia, completada_at')
    .eq('usuario_id', userId)
    .gte('completada_at', desde)
    .order('completada_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MisionManualLog[]
}

export async function completarMisionManual(
  misionId: string
): Promise<CompletarMisionManualResult> {
  const { data, error } = await supabase.rpc('completar_mision_manual', {
    p_mision_id: misionId,
  })
  if (error) throw error
  return data as CompletarMisionManualResult
}
