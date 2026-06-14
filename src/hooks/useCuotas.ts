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
import type { CuotaFormData } from '@/types/app.types'

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
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => pagarCuota(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
  })
}

export function useDeshacerPagoCuota() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deshacerPagoCuota(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [CUOTAS_KEY] })
  })
}
