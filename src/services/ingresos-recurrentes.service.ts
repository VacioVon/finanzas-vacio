import { supabase } from '@/lib/supabase'
import type {
  FuenteIngreso,
  IngresoRecurrente,
  IngresoPendienteHoy,
  IngresoMes,
  ConfirmarIngresoResultado,
  CreateIngresoRecurrenteForm,
} from '@/types/ingresos-recurrentes.types'

// ─── Fuentes de ingreso ──────────────────────────────────────

export async function getFuentesIngreso(userId: string): Promise<FuenteIngreso[]> {
  const { data, error } = await supabase
    .from('fuentes_ingreso')
    .select('*')
    .eq('usuario_id', userId)
    .eq('activa', true)
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export async function createFuenteIngreso(userId: string, nombre: string, descripcion?: string): Promise<FuenteIngreso> {
  const { data, error } = await supabase
    .from('fuentes_ingreso')
    .insert({ usuario_id: userId, nombre, descripcion: descripcion ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Ingresos recurrentes ────────────────────────────────────

export async function getIngresosRecurrentes(userId: string): Promise<IngresoRecurrente[]> {
  const { data, error } = await supabase
    .rpc('obtener_ingresos_recurrentes', { p_user_id: userId })
  if (error) throw error
  return (data ?? []) as IngresoRecurrente[]
}

export async function createIngresoRecurrente(
  userId: string,
  form: CreateIngresoRecurrenteForm
): Promise<IngresoRecurrente> {
  const { data, error } = await supabase
    .from('ingresos_recurrentes')
    .insert({
      usuario_id:      userId,
      nombre:          form.nombre,
      monto_esperado:  form.monto_esperado,
      cuenta_id:       form.cuenta_id || null,
      fuente_id:       form.fuente_id || null,
      frecuencia:      form.frecuencia,
      dia_esperado:    form.dia_esperado,
      tolerancia_dias: form.tolerancia_dias,
      tipo_fecha:      form.tipo_fecha,
      nota:            form.nota || null,
    })
    .select()
    .single()
  if (error) throw error
  return data as IngresoRecurrente
}

export async function toggleIngresoRecurrente(id: string, activo: boolean) {
  const { error } = await supabase
    .from('ingresos_recurrentes')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteIngresoRecurrente(id: string) {
  const { error } = await supabase
    .from('ingresos_recurrentes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Instancias / alertas ────────────────────────────────────

export async function getIngresosPendientesHoy(userId: string): Promise<IngresoPendienteHoy[]> {
  const { data, error } = await supabase
    .rpc('obtener_ingresos_pendientes_hoy', { p_user_id: userId })
  if (error) throw error
  return (data ?? []) as IngresoPendienteHoy[]
}

export async function getIngresosMes(
  userId: string,
  mes: number,
  anio: number
): Promise<IngresoMes[]> {
  const { data, error } = await supabase
    .rpc('obtener_ingresos_mes', { p_user_id: userId, p_mes: mes, p_anio: anio })
  if (error) throw error
  return (data ?? []) as IngresoMes[]
}

export async function confirmarIngresoEsperado(
  userId: string,
  instanciaId: string,
  montoReal: number,
  fechaReal: string,
  nota?: string
): Promise<ConfirmarIngresoResultado> {
  const { data, error } = await supabase
    .rpc('confirmar_ingreso_esperado', {
      p_user_id:      userId,
      p_instancia_id: instanciaId,
      p_monto_real:   montoReal,
      p_fecha_real:   fechaReal,
      p_nota:         nota ?? null,
    })
  if (error) throw error
  return data as ConfirmarIngresoResultado
}

export async function posponerIngresoEsperado(
  userId: string,
  instanciaId: string,
  nuevaFecha: string
): Promise<void> {
  const { error } = await supabase
    .rpc('posponer_ingreso_esperado', {
      p_user_id:      userId,
      p_instancia_id: instanciaId,
      p_nueva_fecha:  nuevaFecha,
    })
  if (error) throw error
}

export async function marcarNoRecibido(instanciaId: string): Promise<void> {
  const { error } = await supabase
    .from('ingresos_esperados')
    .update({ estado: 'no_recibido', updated_at: new Date().toISOString() })
    .eq('id', instanciaId)
  if (error) throw error
}
