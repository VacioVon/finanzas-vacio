import { supabase } from '@/lib/supabase'
import type {
  FuenteIngreso,
  IngresoRecurrente,
  IngresoPendienteHoy,
  IngresoMes,
  ConfirmarIngresoResultado,
  CreateIngresoRecurrenteForm,
  UpdateIngresoRecurrenteForm,
  InstanciaEsperada,
} from '@/types/ingresos-recurrentes.types'
import { armarNotaAjuste, type CambioInstancia } from '@/utils/ingresosRecurrentes'

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

// ─── Edición (solo configuración + instancias pendientes) ─────

/** Todas las instancias de un ingreso recurrente (para mostrar qué se afectaría al editar). */
export async function getInstanciasDeRecurrente(recurrenteId: string): Promise<InstanciaEsperada[]> {
  const { data, error } = await supabase
    .from('ingresos_esperados')
    .select('id, ingreso_recurrente_id, periodo_ref, fecha_esperada, fecha_min, fecha_max, monto_esperado, estado, movimiento_id, nota')
    .eq('ingreso_recurrente_id', recurrenteId)
    .order('periodo_ref', { ascending: true })
  if (error) throw error
  return (data ?? []).map(i => ({ ...i, monto_esperado: Number(i.monto_esperado) })) as InstanciaEsperada[]
}

/** Actualiza SOLO la configuración del recurrente. No toca instancias ni movimientos. */
export async function updateIngresoRecurrente(id: string, form: UpdateIngresoRecurrenteForm): Promise<void> {
  const { error } = await supabase
    .from('ingresos_recurrentes')
    .update({
      nombre:          form.nombre,
      monto_esperado:  form.monto_esperado,
      cuenta_id:       form.cuenta_id || null,
      fuente_id:       form.fuente_id || null,
      dia_esperado:    form.dia_esperado,
      tolerancia_dias: form.tolerancia_dias,
      tipo_fecha:      form.tipo_fecha,
      nota:            form.nota || null,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

/**
 * Aplica el plan calculado a las instancias PENDIENTES. Cada actualización repite el filtro
 * estado='pendiente', así que una instancia que cambió de estado entre tanto no se toca.
 */
export async function aplicarCambiosAInstancias(cambios: CambioInstancia[]): Promise<number> {
  let aplicadas = 0
  for (const c of cambios) {
    const { data, error } = await supabase
      .from('ingresos_esperados')
      .update({
        monto_esperado: c.despues.monto,
        fecha_esperada: c.despues.fecha,
        fecha_min:      c.despues.min,
        fecha_max:      c.despues.max,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', c.id)
      .eq('estado', 'pendiente')
      .select('id')
    if (error) throw error
    aplicadas += data?.length ?? 0
  }
  return aplicadas
}

/**
 * "Ajustar este mes": cambia el monto esperado de UNA instancia pendiente y deja constancia en
 * su nota. No toca el recurrente base ni otros meses.
 */
export async function ajustarInstanciaMes(
  instanciaId: string, montoBase: number, montoNuevo: number, comentario?: string
): Promise<void> {
  const { data, error } = await supabase
    .from('ingresos_esperados')
    .update({
      monto_esperado: montoNuevo,
      nota:           armarNotaAjuste(montoBase, montoNuevo, comentario),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', instanciaId)
    .eq('estado', 'pendiente')
    .select('id')
  if (error) throw error
  if (!data || data.length !== 1) throw new Error('Solo se puede ajustar una instancia pendiente')
}

/** Quita el ajuste de un mes: la instancia vuelve al monto base. */
export async function quitarAjusteInstancia(instanciaId: string, montoBase: number): Promise<void> {
  const { data, error } = await supabase
    .from('ingresos_esperados')
    .update({ monto_esperado: montoBase, nota: null, updated_at: new Date().toISOString() })
    .eq('id', instanciaId)
    .eq('estado', 'pendiente')
    .select('id')
  if (error) throw error
  if (!data || data.length !== 1) throw new Error('Solo se puede modificar una instancia pendiente')
}

/**
 * Asigna la categoría a un movimiento recién creado por una confirmación, solo si aún no tiene
 * categoría. No toca montos ni saldos.
 */
export async function asignarCategoriaMovimiento(movimientoId: string, categoriaId: string): Promise<void> {
  const { error } = await supabase
    .from('movimientos')
    .update({ categoria_id: categoriaId })
    .eq('id', movimientoId)
    .is('categoria_id', null)
  if (error) throw error
}
