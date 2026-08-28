import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getObjetivos,
  createObjetivo,
  updateObjetivo,
  deleteObjetivo,
  asignarFondosObjetivo,
  getAportesObjetivosPeriodo
} from '@/services/objetivos.service'
import { procesarEventoRPG } from '@/services/rpg/rpg.service'
import { getPeriodoPresupuestal, getCurrentMesAnio } from '@/utils/periodo'
import type { ObjetivoFormData, ObjetivoAhorro } from '@/types/app.types'
import type { TipoEventoRPG } from '@/types/rpg.types'

export const OBJETIVOS_KEY = 'objetivos'

export function useObjetivos() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [OBJETIVOS_KEY, user?.id],
    queryFn:  () => getObjetivos(user!.id),
    enabled:  !!user?.id
  })
}

export function useCreateObjetivo() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: ObjetivoFormData) => createObjetivo(user!.id, form),
    onSuccess: (objetivo: ObjetivoAhorro) => {
      qc.invalidateQueries({ queryKey: [OBJETIVOS_KEY] })
      procesarEventoRPG(user!.id, 'OBJETIVO_CREADO', objetivo.id, 'objetivo').catch(() => null)
    }
  })
}

export function useUpdateObjetivo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<ObjetivoFormData> }) =>
      updateObjetivo(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [OBJETIVOS_KEY] })
  })
}

export function useAsignarFondosObjetivo() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      delta,
      nota,
      fecha
    }: {
      id:     string
      delta:  number
      nota?:  string
      fecha?: string
    }) => asignarFondosObjetivo(id, delta, nota, fecha),
    onSuccess: (objetivo: ObjetivoAhorro) => {
      qc.invalidateQueries({ queryKey: [OBJETIVOS_KEY] })
      qc.invalidateQueries({ queryKey: ['aportes_objetivos'] })

      // Detectar hito o completado y disparar evento RPG
      const pct = objetivo.monto_objetivo > 0
        ? (objetivo.monto_actual / objetivo.monto_objetivo) * 100
        : 0

      let evento: TipoEventoRPG | null = null
      if (objetivo.estado === 'completado') {
        evento = 'OBJETIVO_COMPLETADO'
      } else if (pct >= 75) {
        evento = 'OBJETIVO_HITO_75'
      } else if (pct >= 50) {
        evento = 'OBJETIVO_HITO_50'
      } else if (pct >= 25) {
        evento = 'OBJETIVO_HITO_25'
      }

      if (evento) {
        procesarEventoRPG(user!.id, evento, objetivo.id, 'objetivo').catch(() => null)
      }
    }
  })
}

/**
 * Suma neta de aportes a objetivos en el período presupuestal actual.
 * Solo cuenta los aportes positivos netos (aportes - retiros del mes).
 * Usado para calcular "ahorro intencional" en las estadísticas del mes.
 */
export function useAportesObjetivosMes() {
  const { user, profile } = useAuthStore()
  const { mes, anio }     = getCurrentMesAnio()
  const fechaSueldo       = profile?.fecha_sueldo ?? 1
  const { start, end }    = getPeriodoPresupuestal(mes, anio, fechaSueldo)

  return useQuery({
    queryKey: ['aportes_objetivos', user?.id, start, end],
    queryFn:  () => getAportesObjetivosPeriodo(user!.id, start, end),
    enabled:  !!user?.id,
    select: (data) => ({
      aportes: data.filter(a => a.monto > 0).reduce((s, a) => s + a.monto, 0),
      retiros: data.filter(a => a.monto < 0).reduce((s, a) => s + Math.abs(a.monto), 0),
      neto:    data.reduce((s, a) => s + a.monto, 0),
      lista:   data
    })
  })
}

export function useDeleteObjetivo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteObjetivo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [OBJETIVOS_KEY] })
  })
}
