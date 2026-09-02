import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getDeudas,
  createDeuda,
  updateDeuda,
  updateEstadoDeuda,
  deleteDeuda,
  getTotalDeudasActivas,
  getHistorialPagosDeuda
} from '@/services/deudas.service'
import { procesarEventoRPG } from '@/services/rpg/rpg.service'
import type { DeudaFormData } from '@/types/app.types'

export const DEUDAS_KEY = 'deudas'

export function useDeudas() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [DEUDAS_KEY, user?.id],
    queryFn:  () => getDeudas(user!.id),
    enabled:  !!user?.id
  })
}

export function useTotalDeudasActivas() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [DEUDAS_KEY, 'total', user?.id],
    queryFn:  () => getTotalDeudasActivas(user!.id),
    enabled:  !!user?.id
  })
}

export function useCreateDeuda() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: DeudaFormData) => createDeuda(user!.id, form),
    onSuccess: (deuda) => {
      qc.invalidateQueries({ queryKey: [DEUDAS_KEY] })
      procesarEventoRPG(user!.id, 'DEUDA_REGISTRADA', deuda.id, 'deuda').catch(() => null)
    }
  })
}

export function useUpdateDeuda() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<DeudaFormData> }) =>
      updateDeuda(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEUDAS_KEY] })
  })
}

export function useUpdateEstadoDeuda() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'activa' | 'pagada' | 'en_mora' }) =>
      updateEstadoDeuda(id, estado),
    onSuccess: (_, { id, estado }) => {
      qc.invalidateQueries({ queryKey: [DEUDAS_KEY] })
      if (estado === 'pagada') {
        procesarEventoRPG(user!.id, 'DEUDA_COMPLETADA', id, 'deuda').catch(() => null)
      }
    }
  })
}

export function useDeleteDeuda() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDeuda(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [DEUDAS_KEY] })
  })
}

export function useHistorialPagosDeuda(deudaId: string | null) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  ['deudas', 'historial', deudaId],
    queryFn:   () => getHistorialPagosDeuda(deudaId!, user!.id),
    enabled:   !!deudaId && !!user?.id,
    staleTime: 30_000,
  })
}
