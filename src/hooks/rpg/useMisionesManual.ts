import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getMisionesManual,
  getLogManual,
  completarMisionManual,
} from '@/services/rpg/misiones-manuales.service'
import type { MisionManual, MisionManualLog, CompletarMisionManualResult } from '@/types/rpg.types'

const KEYS = {
  catalogo: ['rpg', 'misiones-manual', 'catalogo'] as const,
  log:      (uid: string) => ['rpg', 'misiones-manual', 'log', uid] as const,
}

export function useMisionesManual() {
  const { user } = useAuthStore()
  const uid = user?.id ?? ''

  const catalogoQ = useQuery({
    queryKey: KEYS.catalogo,
    queryFn:  getMisionesManual,
    staleTime: 5 * 60_000,
  })

  const logQ = useQuery({
    queryKey: KEYS.log(uid),
    queryFn:  () => getLogManual(uid),
    enabled:  !!uid,
    staleTime: 30_000,
  })

  const catalogo: MisionManual[] = catalogoQ.data ?? []
  const log: MisionManualLog[]   = logQ.data ?? []

  // Última completación por mision_id
  const ultimaPorMision = new Map<string, MisionManualLog>()
  for (const entry of log) {
    if (!ultimaPorMision.has(entry.mision_id)) {
      ultimaPorMision.set(entry.mision_id, entry)
    }
  }

  // XP ganada hoy (UTC) de misiones manuales
  const hoyUTC = new Date().toISOString().slice(0, 10)
  const xpHoy  = log
    .filter(e => e.dia === hoyUTC)
    .reduce((s, e) => s + e.xp_otorgada, 0)

  const CAP_DIARIO = 30

  // Misiones enriquecidas con estado de cooldown
  const misiones = catalogo.map(m => {
    const ultima = ultimaPorMision.get(m.id)
    let disponible     = true
    let disponible_en: string | null = null

    if (ultima) {
      const nextAt = new Date(ultima.completada_at).getTime() + m.cooldown_horas * 3_600_000
      if (Date.now() < nextAt) {
        disponible    = false
        disponible_en = new Date(nextAt).toISOString()
      }
    }

    // Cap diario también bloquea aunque el cooldown esté libre
    const capAlcanzado = xpHoy >= CAP_DIARIO

    return {
      ...m,
      disponible:    disponible && !capAlcanzado,
      disponible_en: !disponible ? disponible_en : null,
      cap_alcanzado: capAlcanzado,
      ultima_completada_at: ultima?.completada_at ?? null,
    }
  })

  return {
    misiones,
    xpHoy,
    capDiario: CAP_DIARIO,
    isLoading: catalogoQ.isLoading || logQ.isLoading,
  }
}

export function useCompletarMisionManual() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()

  return useMutation<CompletarMisionManualResult, Error, string>({
    mutationFn: (misionId: string) => completarMisionManual(misionId),
    onSuccess: (data) => {
      if (!data.ok || !user?.id) return
      qc.invalidateQueries({ queryKey: KEYS.log(user.id) })
      qc.invalidateQueries({ queryKey: ['rpg', 'perfil', user.id] })
      qc.invalidateQueries({ queryKey: ['rpg', 'eventos', user.id] })
    },
  })
}
