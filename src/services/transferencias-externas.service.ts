import { supabase } from '@/lib/supabase'
import type { TransferenciaExterna, TransferenciaExternaFormData } from '@/types/app.types'

export async function getTransferenciasExternas(userId: string): Promise<TransferenciaExterna[]> {
  const { data, error } = await supabase
    .from('transferencias_externas')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TransferenciaExterna[]
}

export async function createTransferenciaExterna(
  userId: string,
  form: TransferenciaExternaFormData
): Promise<{ movimiento_id: string; transferencia_id: string }> {
  // 1. Crear el movimiento de ingreso
  const { data: mov, error: movErr } = await supabase
    .from('movimientos')
    .insert({
      usuario_id:      userId,
      tipo:            'ingreso',
      fecha:           form.fecha,
      cuenta_id:       form.cuenta_id,
      monto:           form.monto,
      nota:            form.nota ?? null,
      fondos_tercero:  false,   // es dinero que llega, no en nombre de alguien
      origen_dinero:   'transferencia_externa',
    })
    .select('id')
    .single()

  if (movErr || !mov) throw movErr ?? new Error('Error al crear movimiento')

  // 2. Actualizar saldo de la cuenta
  const { error: saldoErr } = await supabase.rpc('ajustar_saldo_cuenta', {
    p_cuenta_id: form.cuenta_id,
    p_delta:     form.monto,
  })
  if (saldoErr) throw saldoErr

  // 3. Crear metadata de la transferencia externa
  const { data: tx, error: txErr } = await supabase
    .from('transferencias_externas')
    .insert({
      usuario_id:      userId,
      movimiento_id:   mov.id,
      persona_nombre:  form.persona_nombre,
      persona_tipo:    form.persona_tipo,
      proposito:       form.proposito ?? null,
      es_devolucion:   form.es_devolucion ?? false,
      deuda_origen_id: form.deuda_origen_id ?? null,
    })
    .select('id')
    .single()

  if (txErr || !tx) throw txErr ?? new Error('Error al registrar transferencia')

  return { movimiento_id: mov.id, transferencia_id: tx.id }
}

export async function deleteTransferenciaExterna(
  txId: string,
  movimientoId: string,
  cuentaId: string,
  monto: number
): Promise<void> {
  // Revertir saldo
  await supabase.rpc('ajustar_saldo_cuenta', {
    p_cuenta_id: cuentaId,
    p_delta:     -monto,
  })
  // Eliminar movimiento (transferencia_externa se elimina en cascada)
  const { error } = await supabase
    .from('movimientos')
    .delete()
    .eq('id', movimientoId)
  if (error) throw error
  void txId
}
