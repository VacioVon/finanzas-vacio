import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getMovimientos,
  getMovimientosDelMes,
  createMovimiento,
  deleteMovimiento,
  updateMovimiento
} from '@/services/movimientos.service'
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
