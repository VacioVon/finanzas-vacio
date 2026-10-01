import { supabase } from '@/lib/supabase'
import type { GastoCompartido, GastoCompartidoFormData } from '@/types/app.types'
import { registrarCobro } from '@/services/cobros.service'

export async function getGastosCompartidos(userId: string): Promise<GastoCompartido[]> {
  const { data, error } = await supabase
    .from('gastos_compartidos')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as GastoCompartido[]
}

export async function createGastoCompartido(
  userId: string,
  form: GastoCompartidoFormData
): Promise<GastoCompartido> {
  const { data, error } = await supabase
    .from('gastos_compartidos')
    .insert({
      usuario_id:    userId,
      movimiento_id: form.movimiento_id,
      monto_total:   form.monto_total,
      monto_usuario: form.monto_usuario,
      participantes: form.participantes,
      descripcion:   form.descripcion ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as GastoCompartido
}

export async function deleteGastoCompartido(id: string): Promise<void> {
  const { error } = await supabase
    .from('gastos_compartidos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Modelo "yo pagué el total" ──────────────────────────────────
// El movimiento gasto ya existe por el monto total (sale completo de la cuenta).
// Cada participante genera una cuenta_por_cobrar enlazada al movimiento; los reembolsos
// se registran con registrar_cobro_recibido (ingreso "Recuperación de dinero", no ingreso personal).

export interface ParticipanteCompartidoInput {
  nombre:   string
  monto:    number
  recibido: boolean   // true = ya me entregó el dinero
}

export interface GastoCompartidoPagadoParams {
  movimiento_id:    string
  fecha:            string
  descripcion:      string
  monto_total:      number
  participantes:    ParticipanteCompartidoInput[]
  cuenta_recibe_id: string   // cuenta donde entra el reembolso (si recibido)
}

export async function registrarGastoCompartidoPagadoTotal(
  userId: string,
  p: GastoCompartidoPagadoParams
): Promise<GastoCompartido> {
  const otros = p.participantes.filter(x => x.nombre.trim() && x.monto > 0)
  const montoOtros = otros.reduce((s, x) => s + x.monto, 0)
  if (otros.length === 0) throw new Error('Agrega al menos una persona con su parte')
  if (montoOtros >= p.monto_total) throw new Error('La parte de los demás debe ser menor al total del gasto')

  // 1. Una cuenta por cobrar por participante, enlazada al movimiento del gasto
  const { data: cobrar, error: cobrarError } = await supabase
    .from('cuentas_por_cobrar')
    .insert(otros.map(x => ({
      usuario_id:           userId,
      movimiento_origen_id: p.movimiento_id,
      persona:              x.nombre.trim(),
      descripcion:          `Gasto compartido: ${p.descripcion}`,
      monto_original:       x.monto,
      fecha:                p.fecha,
    })))
    .select('id')
  if (cobrarError) throw cobrarError
  const cobrarIds = (cobrar ?? []).map(c => c.id as string)

  // 2. Detalle del gasto compartido (total, mi parte, participantes)
  const participantes = otros.map((x, i) => ({ nombre: x.nombre.trim(), monto: x.monto, cobrar_id: cobrarIds[i] }))
  const { data: gc, error: gcError } = await supabase
    .from('gastos_compartidos')
    .insert({
      usuario_id:    userId,
      movimiento_id: p.movimiento_id,
      monto_total:   p.monto_total,
      monto_usuario: p.monto_total - montoOtros,
      participantes,
      descripcion:   p.descripcion,
    })
    .select()
    .single()
  if (gcError) {
    await supabase.from('cuentas_por_cobrar').delete().in('id', cobrarIds)   // revertir lo recién creado
    throw gcError
  }

  // 3. Reembolsos ya recibidos
  for (let i = 0; i < otros.length; i++) {
    if (!otros[i].recibido) continue
    await registrarCobro(userId, cobrarIds[i], otros[i].monto, p.cuenta_recibe_id, p.fecha,
      `Reembolso de gasto compartido · ${otros[i].nombre.trim()} · ${p.descripcion}`)
  }

  return gc as GastoCompartido
}
