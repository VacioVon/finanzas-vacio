import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getRPGPerfil,
  procesarEventoRPG,
  getRPGEventos,
  getRPGLogros,
  getRPGLogrosCatalogo,
  getRPGRachas,
} from '@/services/rpg/rpg.service'
import type { TipoEventoRPG, RPGEventoRespuesta } from '@/types/rpg.types'

const RPG_KEYS = {
  perfil:    (uid: string) => ['rpg', 'perfil',    uid] as const,
  eventos:   (uid: string) => ['rpg', 'eventos',   uid] as const,
  logros:    (uid: string) => ['rpg', 'logros',    uid] as const,
  rachas:    (uid: string) => ['rpg', 'rachas',    uid] as const,
  catalogo:  ()            => ['rpg', 'catalogo']       as const,
}

export function useRPGPerfil() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  RPG_KEYS.perfil(user?.id ?? ''),
    queryFn:   () => getRPGPerfil(user!.id),
    enabled:   !!user?.id,
    staleTime: 60_000,
  })
}

export function useRPGEventos(limit = 20) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  RPG_KEYS.eventos(user?.id ?? ''),
    queryFn:   () => getRPGEventos(user!.id, limit),
    enabled:   !!user?.id,
    staleTime: 30_000,
  })
}

export function useRPGLogros() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  RPG_KEYS.logros(user?.id ?? ''),
    queryFn:   () => getRPGLogros(user!.id),
    enabled:   !!user?.id,
    staleTime: 120_000,
  })
}

export function useRPGRachas() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  RPG_KEYS.rachas(user?.id ?? ''),
    queryFn:   () => getRPGRachas(user!.id),
    enabled:   !!user?.id,
    staleTime: 120_000,
  })
}

export function useRPGLogrosCatalogo() {
  return useQuery({
    queryKey:  RPG_KEYS.catalogo(),
    queryFn:   getRPGLogrosCatalogo,
    staleTime: 5 * 60_000,
  })
}

interface ProcesarEventoArgs {
  tipoEvento:      TipoEventoRPG
  referenciaId?:   string
  referenciaTipo?: string
  metadatos?:      Record<string, unknown>
}

export function useProcesarEventoRPG() {
  const { user }  = useAuthStore()
  const qc        = useQueryClient()

  return useMutation<RPGEventoRespuesta, Error, ProcesarEventoArgs>({
    mutationFn: ({ tipoEvento, referenciaId, referenciaTipo, metadatos }) =>
      procesarEventoRPG(user!.id, tipoEvento, referenciaId, referenciaTipo, metadatos),

    onSuccess: () => {
      if (!user?.id) return
      qc.invalidateQueries({ queryKey: RPG_KEYS.perfil(user.id) })
      qc.invalidateQueries({ queryKey: RPG_KEYS.eventos(user.id) })
      qc.invalidateQueries({ queryKey: RPG_KEYS.logros(user.id) })
    },
  })
}
