import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getTransferenciasExternas,
  createTransferenciaExterna,
  deleteTransferenciaExterna,
} from '@/services/transferencias-externas.service'
import type { TransferenciaExternaFormData } from '@/types/app.types'

export function useTransferenciasExternas() {
  const user = useAuthStore(s => s.user)
  return useQuery({
    queryKey: ['transferencias_externas', user?.id],
    queryFn:  () => getTransferenciasExternas(user!.id),
    enabled:  !!user,
  })
}

export function useCreateTransferenciaExterna() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: TransferenciaExternaFormData) =>
      createTransferenciaExterna(user!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias_externas'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })
}

export function useDeleteTransferenciaExterna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      txId, movimientoId, cuentaId, monto
    }: { txId: string; movimientoId: string; cuentaId: string; monto: number }) =>
      deleteTransferenciaExterna(txId, movimientoId, cuentaId, monto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias_externas'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })
}
