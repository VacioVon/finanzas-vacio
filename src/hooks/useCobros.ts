import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getCuentasPorCobrar,
  crearGastoTercero,
  registrarCobro,
  cancelarCobro,
  type CrearGastoTerceroParams
} from '@/services/cobros.service'
import { MOVIMIENTOS_KEY } from './useMovimientos'
import { CUENTAS_KEY } from './useCuentas'

export const COBROS_KEY = 'cobros'

export function useCuentasPorCobrar() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [COBROS_KEY, user?.id],
    queryFn:  () => getCuentasPorCobrar(user!.id),
    enabled:  !!user?.id
  })
}

export function useCrearGastoTercero() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: CrearGastoTerceroParams) =>
      crearGastoTercero(user!.id, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY] })
      qc.invalidateQueries({ queryKey: [COBROS_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
    }
  })
}

export function useRegistrarCobro() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      cobraId, monto, cuentaId, fecha, nota
    }: { cobraId: string; monto: number; cuentaId: string; fecha: string; nota?: string }) =>
      registrarCobro(user!.id, cobraId, monto, cuentaId, fecha, nota ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COBROS_KEY] })
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
    }
  })
}

export function useCancelarCobro() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => cancelarCobro(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COBROS_KEY] })
    }
  })
}
