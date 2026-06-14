import { supabase } from '@/lib/supabase'
import type { CuotaCredito, CuotaFormData } from '@/types/app.types'

export async function getCuotas(userId: string): Promise<CuotaCredito[]> {
  const { data, error } = await supabase
    .from('cuotas_credito')
    .select('*, cuenta:cuentas(id, nombre, tipo, color)')
    .eq('usuario_id', userId)
    .order('fecha_inicio', { ascending: false })

  if (error) throw error
  return data as CuotaCredito[]
}

export async function createCuota(
  userId: string,
  form: CuotaFormData
): Promise<CuotaCredito> {
  const pagadas = form.cuotas_pagadas_inicial ?? 0
  const estado  = pagadas >= form.cuotas_total ? 'completada' : 'activa'

  const cuotaPayload = {
    usuario_id:     userId,
    cuenta_id:      form.cuenta_id,
    nombre:         form.nombre,
    emoji:          form.emoji   ?? null,
    monto_total:    form.monto_total,
    monto_cuota:    form.monto_cuota,
    cuotas_total:   form.cuotas_total,
    cuotas_pagadas: pagadas,
    interes:        form.interes      ?? 0,
    comision:       form.comision     ?? 0,
    para_tercero:   form.para_tercero ?? false,
    tercero_nombre: form.tercero_nombre || null,
    fecha_inicio:   form.fecha_inicio,
    nota:           form.nota         ?? null,
    estado
  }

  const { data, error } = await supabase
    .from('cuotas_credito')
    .insert(cuotaPayload)
    .select('*, cuenta:cuentas(id, nombre, tipo, color)')
    .single()

  if (error) throw error
  return data as CuotaCredito
}

export async function updateCuota(
  id: string,
  form: Partial<CuotaFormData>
): Promise<CuotaCredito> {
  const { data, error } = await supabase
    .from('cuotas_credito')
    .update({
      ...(form.nombre       !== undefined && { nombre:       form.nombre }),
      ...(form.emoji        !== undefined && { emoji:        form.emoji || null }),
      ...(form.cuenta_id    !== undefined && { cuenta_id:    form.cuenta_id }),
      ...(form.monto_total  !== undefined && { monto_total:  form.monto_total }),
      ...(form.monto_cuota  !== undefined && { monto_cuota:  form.monto_cuota }),
      ...(form.cuotas_total !== undefined && { cuotas_total: form.cuotas_total }),
      ...(form.interes        !== undefined && { interes:        form.interes }),
      ...(form.comision       !== undefined && { comision:       form.comision }),
      ...(form.para_tercero   !== undefined && { para_tercero:   form.para_tercero }),
      ...(form.tercero_nombre !== undefined && { tercero_nombre: form.tercero_nombre || null }),
      ...(form.fecha_inicio   !== undefined && { fecha_inicio:   form.fecha_inicio }),
      ...(form.nota           !== undefined && { nota:           form.nota || null }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*, cuenta:cuentas(id, nombre, tipo, color)')
    .single()

  if (error) throw error
  return data as CuotaCredito
}

export async function deleteCuota(id: string): Promise<void> {
  const { error } = await supabase
    .from('cuotas_credito')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/** Registra el pago de una cuota (incrementa cuotas_pagadas, auto-completa) */
export async function pagarCuota(id: string): Promise<CuotaCredito> {
  const { data, error } = await supabase
    .rpc('pagar_cuota', { p_cuota_id: id })

  if (error) throw error
  return data as CuotaCredito
}

/** Deshace el último pago de una cuota */
export async function deshacerPagoCuota(id: string): Promise<CuotaCredito> {
  const { data, error } = await supabase
    .rpc('deshacer_pago_cuota', { p_cuota_id: id })

  if (error) throw error
  return data as CuotaCredito
}
