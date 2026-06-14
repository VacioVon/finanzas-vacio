import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getCategorias,
  getCategoriasByTipo,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  createSubcategoria,
  deleteSubcategoria
} from '@/services/categorias.service'
import type { CategoriaFormData } from '@/types/app.types'

export const CATEGORIAS_KEY = 'categorias'

export function useCategorias() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [CATEGORIAS_KEY, user?.id],
    queryFn: () => getCategorias(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10
  })
}

export function useCategoriasByTipo(tipo: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [CATEGORIAS_KEY, user?.id, tipo],
    queryFn: () => getCategoriasByTipo(user!.id, tipo),
    enabled: !!user?.id && !!tipo,
    staleTime: 1000 * 60 * 10
  })
}

export function useCreateCategoria() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (form: CategoriaFormData) => createCategoria(user!.id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] })
  })
}

export function useUpdateCategoria() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<CategoriaFormData> }) =>
      updateCategoria(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] })
  })
}

export function useDeleteCategoria() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCategoria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] })
  })
}

export function useCreateSubcategoria() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ categoriaId, nombre }: { categoriaId: string; nombre: string }) =>
      createSubcategoria(categoriaId, nombre, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] })
  })
}

export function useDeleteSubcategoria() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSubcategoria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] })
  })
}
