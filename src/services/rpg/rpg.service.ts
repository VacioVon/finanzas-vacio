import { supabase } from '@/lib/supabase'
import type {
  RPGPerfil,
  RPGEvento,
  RPGLogro,
  RPGLogroCatalogo,
  RPGRacha,
  RPGEventoRespuesta,
  TipoEventoRPG,
} from '@/types/rpg.types'

export async function getRPGPerfil(userId: string): Promise<RPGPerfil> {
  const { data, error } = await supabase
    .from('rpg_perfiles')
    .select('*')
    .eq('usuario_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    // Auto-crear perfil si no existe (primera vez)
    const { data: nuevo, error: err } = await supabase
      .rpc('inicializar_rpg_perfil')
    if (err) throw err
    return nuevo as RPGPerfil
  }

  return data as RPGPerfil
}

export async function procesarEventoRPG(
  usuarioId:       string,
  tipoEvento:      TipoEventoRPG,
  referenciaId?:   string,
  referenciaTipo?: string,
  metadatos?:      Record<string, unknown>
): Promise<RPGEventoRespuesta> {
  const { data, error } = await supabase.rpc('process_rpg_event', {
    p_usuario_id:      usuarioId,
    p_tipo_evento:     tipoEvento,
    p_referencia_id:   referenciaId   ?? null,
    p_referencia_tipo: referenciaTipo ?? null,
    p_metadatos:       metadatos      ?? {},
  })

  if (error) throw error
  return data as RPGEventoRespuesta
}

export async function getRPGEventos(
  userId: string,
  limit  = 20
): Promise<RPGEvento[]> {
  const { data, error } = await supabase
    .from('rpg_eventos')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as RPGEvento[]
}

export async function getRPGLogros(userId: string): Promise<RPGLogro[]> {
  const { data, error } = await supabase
    .from('rpg_logros_usuario')
    .select('*')
    .eq('usuario_id', userId)
    .order('obtenido_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as RPGLogro[]
}

export async function getRPGLogrosCatalogo(): Promise<RPGLogroCatalogo[]> {
  const { data, error } = await supabase
    .from('rpg_logros_catalogo')
    .select('*')
    .order('logro_tipo')

  if (error) throw error
  return (data ?? []) as RPGLogroCatalogo[]
}

export async function getRPGRachas(userId: string): Promise<RPGRacha[]> {
  const { data, error } = await supabase
    .from('rpg_rachas')
    .select('*')
    .eq('usuario_id', userId)

  if (error) throw error
  return (data ?? []) as RPGRacha[]
}
