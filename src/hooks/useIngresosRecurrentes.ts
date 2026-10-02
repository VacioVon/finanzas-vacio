import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getIngresosRecurrentes,
  getFuentesIngreso,
  getIngresosPendientesHoy,
  getIngresosMes,
  createIngresoRecurrente,
  createFuenteIngreso,
  toggleIngresoRecurrente,
  deleteIngresoRecurrente,
  confirmarIngresoEsperado,
  posponerIngresoEsperado,
  marcarNoRecibido,
  getInstanciasDeRecurrente,
  updateIngresoRecurrente,
  aplicarCambiosAInstancias,
  ajustarInstanciaMes,
  quitarAjusteInstancia,
  asignarCategoriaMovimiento,
} from '@/services/ingresos-recurrentes.service'
import type { CreateIngresoRecurrenteForm } from '@/types/ingresos-recurrentes.types'
import type { CambioInstancia } from '@/utils/ingresosRecurrentes'

const KEYS = {
  recurrentes:  (uid: string) => ['ingresos', 'recurrentes', uid]  as const,
  fuentes:      (uid: string) => ['ingresos', 'fuentes',     uid]  as const,
  pendientes:   (uid: string) => ['ingresos', 'pendientes',  uid]  as const,
  mes:  (uid: string, m: number, y: number) => ['ingresos', 'mes', uid, m, y] as const,
}

export function useIngresosRecurrentes() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  KEYS.recurrentes(user?.id ?? ''),
    queryFn:   () => getIngresosRecurrentes(user!.id),
    enabled:   !!user?.id,
    staleTime: 60_000,
  })
}

export function useFuentesIngreso() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  KEYS.fuentes(user?.id ?? ''),
    queryFn:   () => getFuentesIngreso(user!.id),
    enabled:   !!user?.id,
    staleTime: 120_000,
  })
}

export function useIngresosPendientesHoy() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  KEYS.pendientes(user?.id ?? ''),
    queryFn:   () => getIngresosPendientesHoy(user!.id),
    enabled:   !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useIngresosMes(mes: number, anio: number) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey:  KEYS.mes(user?.id ?? '', mes, anio),
    queryFn:   () => getIngresosMes(user!.id, mes, anio),
    enabled:   !!user?.id,
    staleTime: 30_000,
  })
}

function useInvalidate() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  return () => {
    if (!user?.id) return
    qc.invalidateQueries({ queryKey: KEYS.recurrentes(user.id) })
    qc.invalidateQueries({ queryKey: KEYS.pendientes(user.id) })
    qc.invalidateQueries({ queryKey: ['ingresos', 'mes', user.id] })
  }
}

export function useCreateIngresoRecurrente() {
  const { user }   = useAuthStore()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (form: CreateIngresoRecurrenteForm) =>
      createIngresoRecurrente(user!.id, form),
    onSuccess: invalidate,
  })
}

export function useCreateFuenteIngreso() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, descripcion }: { nombre: string; descripcion?: string }) =>
      createFuenteIngreso(user!.id, nombre, descripcion),
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: KEYS.fuentes(user.id) })
    },
  })
}

export function useToggleIngresoRecurrente() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      toggleIngresoRecurrente(id, activo),
    onSuccess: invalidate,
  })
}

export function useDeleteIngresoRecurrente() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteIngresoRecurrente(id),
    onSuccess:  invalidate,
  })
}

export function useConfirmarIngreso() {
  const { user }   = useAuthStore()
  const qc         = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      instanciaId, montoReal, fechaReal, nota, categoriaId,
    }: { instanciaId: string; montoReal: number; fechaReal: string; nota?: string; categoriaId?: string | null }) => {
      const res = await confirmarIngresoEsperado(user!.id, instanciaId, montoReal, fechaReal, nota)
      // Categoría de sueldo (existente): el ingreso ya está registrado; si esto falla no se pierde nada
      if (res.ok && !res.ya_confirmado && res.movimiento_id && categoriaId) {
        try { await asignarCategoriaMovimiento(res.movimiento_id, categoriaId) } catch { /* se puede asignar luego */ }
      }
      return res
    },
    onSuccess: () => {
      invalidate()
      if (user?.id) qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
  })
}

export function usePosponerIngreso() {
  const { user }   = useAuthStore()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ instanciaId, nuevaFecha }: { instanciaId: string; nuevaFecha: string }) =>
      posponerIngresoEsperado(user!.id, instanciaId, nuevaFecha),
    onSuccess: invalidate,
  })
}

export function useMarcarNoRecibido() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (instanciaId: string) => marcarNoRecibido(instanciaId),
    onSuccess:  invalidate,
  })
}

export function useInstanciasDeRecurrente(recurrenteId: string | undefined) {
  return useQuery({
    queryKey: ['ingresos', 'instancias', recurrenteId],
    queryFn:  () => getInstanciasDeRecurrente(recurrenteId!),
    enabled:  !!recurrenteId,
  })
}

/** Edita la configuración y aplica el plan (ya calculado y mostrado al usuario) a las pendientes. */
export function useUpdateIngresoRecurrente() {
  const invalidate = useInvalidate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, form, cambios }: { id: string; form: CreateIngresoRecurrenteForm; cambios: CambioInstancia[] }) => {
      await updateIngresoRecurrente(id, form)
      const aplicadas = await aplicarCambiosAInstancias(cambios)
      return { aplicadas }
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['ingresos', 'instancias'] })
    },
  })
}

export function useAjustarInstanciaMes() {
  const invalidate = useInvalidate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ instanciaId, montoBase, montoNuevo, comentario }:
      { instanciaId: string; montoBase: number; montoNuevo: number; comentario?: string }) =>
      ajustarInstanciaMes(instanciaId, montoBase, montoNuevo, comentario),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['ingresos', 'instancias'] }) },
  })
}

export function useQuitarAjusteInstancia() {
  const invalidate = useInvalidate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ instanciaId, montoBase }: { instanciaId: string; montoBase: number }) =>
      quitarAjusteInstancia(instanciaId, montoBase),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['ingresos', 'instancias'] }) },
  })
}
