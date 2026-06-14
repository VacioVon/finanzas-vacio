import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getCuentas,
  createCuenta,
  updateCuenta,
  deleteCuenta
} from '@/services/cuentas.service'
import type { CuentaFormData } from '@/types/app.types'
import type { CuentaUpdateData } from '@/services/cuentas.service'

export const CUENTAS_KEY = 'cuentas'

export function useCuentas() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [CUENTAS_KEY, user?.id],
    queryFn: () => getCuentas(user!.id),
    enabled: !!user?.id
  })
}

export function useCreateCuenta() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: CuentaFormData) => createCuenta(user!.id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
  })
}

export function useUpdateCuenta() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CuentaUpdateData }) =>
      updateCuenta(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
  })
}

export function useDeleteCuenta() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCuenta(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUENTAS_KEY] })
  })
}
