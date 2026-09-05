import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getGastosCompartidos,
  createGastoCompartido,
  deleteGastoCompartido,
} from '@/services/gastos-compartidos.service'
import type { GastoCompartidoFormData } from '@/types/app.types'

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
