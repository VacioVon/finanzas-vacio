import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getSuscripciones,
  createSuscripcion,
  updateSuscripcion,
  toggleSuscripcion,
  deleteSuscripcion,
  avanzarProximaFecha,
  registrarPagoCompromiso,
  getPagosCompromiso,
  type PagoCompromisoData,
  type PagoCompromisoHistorial,
} from '@/services/suscripciones.service'
import { procesarEventoRPG } from '@/services/rpg/rpg.service'
import { registrarPagoCompromisoConDeuda, marcarCompromisoPagado, type PagoConDeudaData } from '@/services/suscripciones.service'
import type { Suscripcion, SuscripcionFormData } from '@/types/app.types'

export type { PagoCompromisoHistorial }

const KEY     = ['suscripciones'] as const
const KEY_PAG = ['pagos-compromisos'] as const

export function useSuscripciones() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: KEY,
    queryFn:  () => getSuscripciones(user!.id),
    enabled:  !!user
  })
}

export function useCreateSuscripcion() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  return useMutation({
    mutationFn: (form: SuscripcionFormData) => createSuscripcion(user!.id, form),
    onSuccess: (sus: Suscripcion) => {
      qc.invalidateQueries({ queryKey: KEY })
      procesarEventoRPG(user!.id, 'COMPROMISO_REGISTRADO', sus.id, 'compromiso').catch(() => null)
    }
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

export function useRegistrarPagoCompromiso() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  return useMutation({
    mutationFn: ({ compromiso, pago }: { compromiso: Suscripcion; pago: PagoCompromisoData }) =>
      registrarPagoCompromiso(user!.id, compromiso, pago),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: KEY_PAG })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    }
  })
}

/** Paga un compromiso abonando a una deuda de tarjeta (un solo movimiento conectado). */
export function useRegistrarPagoCompromisoConDeuda() {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: KEY_PAG })
    qc.invalidateQueries({ queryKey: ['movimientos'] })
    qc.invalidateQueries({ queryKey: ['cuentas'] })
    qc.invalidateQueries({ queryKey: ['deudas'] })
  }
  return useMutation({
    mutationFn: ({ compromiso, deudaId, pago }: { compromiso: Suscripcion; deudaId: string; pago: PagoConDeudaData }) =>
      registrarPagoCompromisoConDeuda(user!.id, compromiso, deudaId, pago),
    onSuccess: refrescar,
    onError:   refrescar,   // si el dinero se movió pero faltó marcar el compromiso, la pantalla debe reflejarlo
  })
}

/** Reintenta solo el paso de marcar el compromiso como pagado (no mueve dinero). */
export function useMarcarCompromisoPagado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ compromiso, fecha }: { compromiso: Suscripcion; fecha: string }) => marcarCompromisoPagado(compromiso, fecha),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: KEY_PAG }) },
  })
}

export function usePagosCompromiso() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: KEY_PAG,
    queryFn:  () => getPagosCompromiso(user!.id),
    enabled:  !!user,
  })
}
