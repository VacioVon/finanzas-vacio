import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getSuscripciones,
  createSuscripcion,
  updateSuscripcion,
  toggleSuscripcion,
  deleteSuscripcion,
  avanzarProximaFecha
} from '@/services/suscripciones.service'
import type { Suscripcion, SuscripcionFormData } from '@/types/app.types'

const KEY = ['suscripciones'] as const

export function useSuscripciones() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: KEY,
    queryFn:  () => getSuscripciones(user!.id),
    enabled:  !!user
  })
}

export function useCreateSuscripcion() {
  const { user }  = useAuthStore()
  const qc        = useQueryClient()
  return useMutation({
    mutationFn: (form: SuscripcionFormData) => createSuscripcion(user!.id, form),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY })
  })
}

export function useUpdateSuscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<SuscripcionFormData> }) =>
      updateSuscripcion(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  })
}

export function useToggleSuscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) =>
      toggleSuscripcion(id, activa),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  })
}

export function useDeleteSuscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSuscripcion(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY })
  })
}

export function useAvanzarProximaFecha() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (suscripcion: Suscripcion) => avanzarProximaFecha(suscripcion),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY })
  })
}
