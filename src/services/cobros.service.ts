import { supabase } from '@/lib/supabase'
import type { CuentaPorCobrar } from '@/types/app.types'

export async function getCuentasPorCobrar(userId: string): Promise<CuentaPorCobrar[]> {
  const { data, error } = await supabase
    .from('cuentas_por_cobrar')
    .select('*, pagos_cobrar(*)')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as CuentaPorCobrar[]
}

export interface CrearGastoTerceroParams {
  fecha:            string
  categoria_id:     string | null
  subcategoria_id:  string | null
  cuenta_id:        string
  monto:            number
  comercio:         string | null
  nota:             string | null
  comprobante_url:  string | null
  comision:         number
  persona:          string
  descripcion:      string | null
  fecha_vencimiento: string | null
}

export async function crearGastoTercero(
  userId: string,
  params: CrearGastoTerceroParams
): Promise<{ movimiento_id: string; cobrar_id: string }> {
  const { data, error } = await supabase.rpc('crear_gasto_tercero', {
    p_usuario_id:       userId,
    p_fecha:            params.fecha,
    p_categoria_id:     params.categoria_id,
    p_subcategoria_id:  params.subcategoria_id,
    p_cuenta_id:        params.cuenta_id,
    p_monto:            params.monto,
    p_comercio:         params.comercio,
    p_nota:             params.nota,
    p_comprobante_url:  params.comprobante_url,
    p_comision:         params.comision,
    p_persona:          params.persona || 'Sin nombre',
    p_descripcion:      params.descripcion,
    p_fecha_vencimiento: params.fecha_vencimiento
  })

  if (error) throw error
  return data as { movimiento_id: string; cobrar_id: string }
}

export async function registrarCobro(
  userId: string,
  cobraId: string,
  monto: number,
  cuentaId: string,
  fecha: string,
  nota: string | null
): Promise<{ movimiento_id: string; estado: string; monto_pagado: number }> {
  const { data, error } = await supabase.rpc('registrar_cobro_recibido', {
    p_cobrar_id:  cobraId,
    p_usuario_id: userId,
    p_monto:      monto,
    p_cuenta_id:  cuentaId,
    p_fecha:      fecha,
    p_nota:       nota
  })

  if (error) throw error
  return data as { movimiento_id: string; estado: string; monto_pagado: number }
}

export async function cancelarCobro(id: string): Promise<void> {
  const { error } = await supabase
    .from('cuentas_por_cobrar')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
