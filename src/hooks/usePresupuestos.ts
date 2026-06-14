import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getPresupuestosMes,
  getGastadoEnPeriodo,
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto
} from '@/services/presupuestos.service'
import { getPeriodoPresupuestal } from '@/utils/periodo'
import type { PresupuestoFormData, PresupuestoConProgreso } from '@/types/app.types'
export const MOVIMIENTOS_KEY_REF = 'movimientos'

export const PRESUPUESTOS_KEY = 'presupuestos'

export function usePresupuestosMes(mes: number, anio: number) {
  const { user, profile } = useAuthStore()
  const fechaSueldo = profile?.fecha_sueldo ?? 1
  const { start, end } = getPeriodoPresupuestal(mes, anio, fechaSueldo)

  return useQuery({
    queryKey: [PRESUPUESTOS_KEY, user?.id, mes, anio],
    queryFn: async (): Promise<PresupuestoConProgreso[]> => {
      const [presupuestos, gastado] = await Promise.all([
        getPresupuestosMes(user!.id, mes, anio),
        getGastadoEnPeriodo(user!.id, start, end)
      ])
      return presupuestos.map(p => {
        const g = gastado[p.categoria_id] ?? 0
        return {
          ...p,
          gastado:    g,
          porcentaje: Math.min(100, (g / p.monto_presupuestado) * 100),
          excedido:   g > p.monto_presupuestado
        }
      })
    },
    enabled: !!user?.id
  })
}

export function useCreatePresupuesto() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: PresupuestoFormData) => createPresupuesto(user!.id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRESUPUESTOS_KEY] })
  })
}

export function useUpdatePresupuesto() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, monto }: { id: string; monto: number }) =>
      updatePresupuesto(id, monto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRESUPUESTOS_KEY] })
  })
}

export function useDeletePresupuesto() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePresupuesto(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRESUPUESTOS_KEY] })
      qc.invalidateQueries({ queryKey: [MOVIMIENTOS_KEY_REF] })
    }
  })
}
