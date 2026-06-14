import { supabase } from '@/lib/supabase'
import type { Cuenta, CuentaFormData, TipoCuenta } from '@/types/app.types'

// Tipo dedicado para actualización — mapea directamente a columnas DB
export interface CuentaUpdateData {
  nombre?:      string
  tipo?:        TipoCuenta
  institucion?: string
  saldo_actual?: number   // ← nombre exacto del campo en la tabla
  limite?:      number | null
  color?:       string
}

export async function getCuentas(userId: string): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('*')
    .eq('usuario_id', userId)
    .eq('activa', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Cuenta[]
}

export async function createCuenta(userId: string, form: CuentaFormData): Promise<Cuenta> {
  const { data, error } = await supabase
    .from('cuentas')
    .insert({
      usuario_id:    userId,
      nombre:        form.nombre,
      tipo:          form.tipo,
      institucion:   form.institucion ?? null,
      saldo_actual:  form.saldo_inicial,
      saldo_inicial: form.saldo_inicial,
      limite:        form.limite ?? null,
      color:         form.color,
      activa:        true
    })
    .select()
    .single()

  if (error) throw error
  return data as Cuenta
}

export async function updateCuenta(id: string, updates: CuentaUpdateData): Promise<Cuenta> {
  const { data, error } = await supabase
    .from('cuentas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Cuenta
}

export async function deleteCuenta(id: string): Promise<void> {
  const { error } = await supabase
    .from('cuentas')
    .update({ activa: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
