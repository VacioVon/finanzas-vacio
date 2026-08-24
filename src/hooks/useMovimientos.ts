import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getMovimientos,
  getMovimientosDelMes,
  getMovimientosPorPeriodo,
  getEvolucionMensual,
  createMovimiento,
  deleteMovimiento,
  updateMovimiento
} from '@/services/movimientos.service'
import { getPeriodoPresupuestal } from '@/utils/periodo'
import { CUENTAS_KEY } from './useCuentas'
import type { Movimiento, MovimientoFormData } from '@/types/app.types'

export const MOVIMIENTOS_KEY = 'movimientos'

export function useMovimientos(options?: { limit?: number; tipo?: string; search?: string }) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [MOVIMIENTOS_KEY, user?.id, options],
    queryFn: () => getMovimientos(user!.id, options),
    enabled: !!user?.id
  })
}

export function useMovimientosDelMes() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [MOVIMIENTOS_KEY, user?.id, 'mes'],
    queryFn: () => getMovimientosDelMes(user!.id),
    enabled: !!user?.id
  })
}

export function useMovimientosPorPeriodo(mes: number, anio: number, fechaSueldo = 1) {
  const { user } = useAuthStore()
  const { start, end } = getPeriodoPresupuestal(mes, anio, fechaSueldo)

  return useQuery({
    queryKey: [MOVIMIENTOS_KEY, user?.id, 'periodo', mes, anio, fechaSueldo],
    queryFn:  () => getMovimientosPorPeriodo(user!.id, start, end),
    enabled:  !!user?.id
  })
}

export function useEvolucionMensual(meses = 6) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [MOVIMIENTOS_KEY, user?.id, 'evolucion', meses],
    queryFn:  () => getEvolucionMensual(user!.id, meses),
    enabled:  !!user?.id
  })
}

export function useCreateMovimiento() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: MovimientoFormData) => createMovimiento(user!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      qc.invalidateQueries({ queryKey: ['objetivos'] })
    }
  })
}

export function useDeleteMovimiento() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteMovimiento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      qc.invalidateQueries({ queryKey: ['objetivos'] })
    }
  })
}

export function useUpdateMovimiento() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      original,
      form
    }: {
      id: string
      original: Movimiento
      form: MovimientoFormData
    }) => updateMovimiento(id, original, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY] })
      qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      qc.invalidateQueries({ queryKey: ['objetivos'] })
    }
  })
}
