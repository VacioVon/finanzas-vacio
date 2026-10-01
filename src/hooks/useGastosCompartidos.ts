import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getGastosCompartidos,
  createGastoCompartido,
  deleteGastoCompartido,
  registrarGastoCompartidoPagadoTotal,
  type GastoCompartidoPagadoParams,
} from '@/services/gastos-compartidos.service'
import type { GastoCompartidoFormData, Movimiento } from '@/types/app.types'
import { resumenCompartidosPeriodo } from '@/utils/gastosCompartidos'
import { COBROS_KEY, useCuentasPorCobrar } from './useCobros'
import { MOVIMIENTOS_KEY } from './useMovimientos'
import { CUENTAS_KEY } from './useCuentas'

export function useGastosCompartidos() {
  const user = useAuthStore(s => s.user)
  return useQuery({
    queryKey: ['gastos_compartidos', user?.id],
    queryFn:  () => getGastosCompartidos(user!.id),
    enabled:  !!user,
  })
}

export function useCreateGastoCompartido() {
  const user = useAuthStore(s => s.user)
  const qc   = useQueryClient()
  return useMutation({
    mutationFn: (form: GastoCompartidoFormData) =>
      createGastoCompartido(user!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos_compartidos'] })
    },
  })
}

export function useDeleteGastoCompartido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGastoCompartido(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos_compartidos'] })
    },
  })
}

/** Registra participantes + cuentas por cobrar (+ reembolsos ya recibidos) de un gasto pagado por completo. */
export function useRegistrarGastoCompartidoPagadoTotal() {
  const user = useAuthStore(s => s.user)
  const qc   = useQueryClient()
  return useMutation({
    mutationFn: (p: GastoCompartidoPagadoParams) =>
      registrarGastoCompartidoPagadoTotal(user!.id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos_compartidos'] })
      qc.invalidateQueries({ queryKey: [COBROS_KEY] })
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
    },
  })
}

/**
 * Reembolsos de gastos compartidos (modelo pagado-total) cuyos movimientos están en `movimientos`.
 * `recibido` reduce el gasto bruto a gasto neto asumido; no es ingreso personal.
 */
export function useResumenCompartidos(movimientos: Movimiento[] | undefined) {
  const { data: compartidos } = useGastosCompartidos()
  const { data: cobrar }      = useCuentasPorCobrar()
  return useMemo(
    () => resumenCompartidosPeriodo(movimientos ?? [], compartidos ?? [], cobrar ?? []),
    [movimientos, compartidos, cobrar]
  )
}
