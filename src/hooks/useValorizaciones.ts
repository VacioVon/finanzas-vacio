import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getValorizaciones,
  createValorizacion,
  deleteValorizacion
} from '@/services/valorizaciones.service'
import { CUENTAS_KEY } from './useCuentas'

export const VALORIZACIONES_KEY = 'valorizaciones'

export function useValorizaciones() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [VALORIZACIONES_KEY, user?.id],
    queryFn:  () => getValorizaciones(user!.id),
    enabled:  !!user?.id
  })
}

export function useCreateValorizacion() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      cuentaId, fecha, valor, nota
    }: { cuentaId: string; fecha: string; valor: number; nota?: string }) =>
      createValorizacion(user!.id, cuentaId, fecha, valor, nota),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VALORIZACIONES_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
    }
  })
}

export function useDeleteValorizacion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteValorizacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VALORIZACIONES_KEY] })
    }
  })
}
