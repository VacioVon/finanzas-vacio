import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getMisionesUsuario,
  verificarMision,
  verificarTodasMisiones,
} from '@/services/rpg/misiones.service'
import type { VerificarMisionResultado } from '@/types/rpg.types'

const MISIONES_KEYS = {
  all:  (uid: string) => ['rpg', 'misiones', uid] as const,
}

/** Lee el estado actual de todas las misiones del período activo */
export function useMisiones() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  MISIONES_KEYS.all(user?.id ?? ''),
    queryFn:   () => getMisionesUsuario(user!.id),
    enabled:   !!user?.id,
    staleTime: 30_000,
  })
}

/** Verifica UNA misión (evalúa condición + otorga recompensa si aplica) */
export function useVerificarMision() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()

  return useMutation<VerificarMisionResultado, Error, string>({
    mutationFn: (misionId: string) => verificarMision(user!.id, misionId),
    onSuccess: () => {
      if (!user?.id) return
      qc.invalidateQueries({ queryKey: MISIONES_KEYS.all(user.id) })
      qc.invalidateQueries({ queryKey: ['rpg', 'perfil', user.id] })
      qc.invalidateQueries({ queryKey: ['rpg', 'eventos', user.id] })
    },
  })
}

/** Verifica todas las misiones activas de una vez (llamado al abrir el panel) */
export function useVerificarTodasMisiones() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()

  return useMutation<unknown, Error, void>({
    mutationFn: () => verificarTodasMisiones(user!.id),
    onSuccess: () => {
      if (!user?.id) return
      qc.invalidateQueries({ queryKey: MISIONES_KEYS.all(user.id) })
      qc.invalidateQueries({ queryKey: ['rpg', 'perfil', user.id] })
      qc.invalidateQueries({ queryKey: ['rpg', 'eventos', user.id] })
    },
  })
}
