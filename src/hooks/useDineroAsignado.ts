import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getDineroAsignado,
  getDineroAsignadoPorCuenta,
  createDineroAsignado,
  updateDineroAsignado,
  usarDineroAsignado,
  deleteDineroAsignado,
} from '@/services/dinero-asignado.service'
import type { DineroAsignadoFormData } from '@/types/app.types'

export function useDineroAsignado() {
  const user = useAuthStore(s => s.user)
  return useQuery({
    queryKey: ['dinero_asignado', user?.id],
    queryFn:  () => getDineroAsignado(user!.id),
    enabled:  !!user,
  })
}

export function useDineroAsignadoPorCuenta(cuentaId: string | null) {
  const user = useAuthStore(s => s.user)
  return useQuery({
    queryKey: ['dinero_asignado', user?.id, cuentaId],
    queryFn:  () => getDineroAsignadoPorCuenta(user!.id, cuentaId!),
    enabled:  !!user && !!cuentaId,
  })
}

export function useCreateDineroAsignado() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: DineroAsignadoFormData) =>
      createDineroAsignado(user!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dinero_asignado'] })
    },
  })
}

export function useUpdateDineroAsignado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<DineroAsignadoFormData> }) =>
      updateDineroAsignado(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dinero_asignado'] })
    },
  })
}

export function useUsarDineroAsignado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sobreId, monto }: { sobreId: string; monto: number }) =>
      usarDineroAsignado(sobreId, monto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dinero_asignado'] })
    },
  })
}

export function useDeleteDineroAsignado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDineroAsignado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dinero_asignado'] })
    },
  })
}
