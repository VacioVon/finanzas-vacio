import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getCuotas,
  createCuota,
  updateCuota,
  deleteCuota,
  pagarCuota,
  deshacerPagoCuota
} from '@/services/cuotas.service'
import { procesarEventoRPG } from '@/services/rpg/rpg.service'
import type { CuotaFormData, CuotaCredito } from '@/types/app.types'

export const CUOTAS_KEY = 'cuotas_credito'

export function useCuotas() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [CUOTAS_KEY, user?.id],
    queryFn:  () => getCuotas(user!.id),
    enabled:  !!user?.id
  })
}

export function useCreateCuota() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: CuotaFormData) => createCuota(user!.id, form),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
  })
}

export function useUpdateCuota() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<CuotaFormData> }) =>
      updateCuota(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
  })
}

export function useDeleteCuota() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCuota(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
  })
}

export function usePagarCuota() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => pagarCuota(id),
    onSuccess: (cuota: CuotaCredito) => {
      qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
      const evento = cuota.estado === 'completada' ? 'CMR_COMPLETADA' : 'CMR_CUOTA_TIEMPO'
      procesarEventoRPG(user!.id, evento, cuota.id, 'cuota').catch(() => null)
    }
  })
}

export function useDeshacerPagoCuota() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deshacerPagoCuota(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
  })
}
