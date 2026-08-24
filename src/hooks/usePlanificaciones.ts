import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getPlanificaciones,
  createPlanificacion,
  cancelarPlanificacion,
  convertirPlanificacion,
} from '@/services/planificaciones.service'
import type { PlanificacionFormData } from '@/types/app.types'

export const PLANIFICACIONES_KEY = 'planificaciones'

// Queries que se invalidan cuando cambia una planificación
const KEYS_AFECTADOS = [
  PLANIFICACIONES_KEY,
  'cuentas',
  'movimientos',
  'objetivos',
  'presupuestos',
]

export function usePlanificaciones() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: [PLANIFICACIONES_KEY, user?.id],
    queryFn:  () => getPlanificaciones(user!.id),
    enabled:  !!user,
    staleTime: 30_000,
  })

  const crearMutation = useMutation({
    mutationFn: (form: PlanificacionFormData) => createPlanificacion(user!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLANIFICACIONES_KEY] })
    },
  })

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => cancelarPlanificacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLANIFICACIONES_KEY] })
    },
  })

  // Conversión atómica: después de convertir se invalidan todos los datos afectados
  const convertirMutation = useMutation({
    mutationFn: (id: string) => convertirPlanificacion(id),
    onSuccess: () => {
      KEYS_AFECTADOS.forEach(key => qc.invalidateQueries({ queryKey: [key] }))
    },
  })

  return {
    planificaciones:  query.data ?? [],
    isLoading:        query.isLoading,
    error:            query.error,
    crear:            crearMutation,
    cancelar:         cancelarMutation,
    convertir:        convertirMutation,
  }
}
