/**
 * Ajuste de saldos del 2026-11-04 (aprobado por el usuario).
 *
 * Problema: el pago de $100.000 a la tarjeta («Pagué a la tarjeta (sin asignar)») se guardó como movimiento,
 * pero la función procesar_movimiento vigente en la base no tiene el caso 'pago_tarjeta', así que NO bajó
 * Banco Falabella Débito ni subió la tarjeta. Además, la app no tiene registrados cargos y compras antiguas que
 * el banco sí cobra (servicio de administración, intereses, etc.).
 *
 *  1. Banco Falabella Débito:  $367.641 → $267.641   (sale el pago de $100.000)
 *  2. Cmr Falabella:           −$313.834 → −$387.696 (= cupo utilizado según el banco el 04/11/2026,
 *                               ya descontado el pago; incluye los cargos no registrados)
 *
 * Seguridad: solo escribe si los saldos actuales son exactamente los esperados (si cambiaron, aborta sin tocar nada)
 * y actualiza solo esas 2 cuentas. No borra ni crea movimientos.
 * Uso: node supabase/scripts/ajuste_saldos_2026-11-04.mjs [--aplicar]   (sin --aplicar solo muestra lo que haría)
 */
import { supabase } from './_supabase.mjs'

const aplicar = process.argv.includes('--aplicar')
const CAMBIOS = [
  { nombre: 'Banco Falabella Débito', tipo: 'debito', esperado: 367641, nuevo: 267641 },
  { nombre: 'Cmr Falabella',          tipo: 'credito', esperado: -313834, nuevo: -387696 },
]

const { data: cuentas, error } = await supabase.from('cuentas').select('id, nombre, tipo, saldo_actual, activa').eq('activa', true)
if (error) throw error

const plan = []
for (const c of CAMBIOS) {
  const hall = cuentas.filter(x => x.nombre.trim() === c.nombre && x.tipo === c.tipo)
  if (hall.length !== 1) throw new Error(`${c.nombre}: se esperaba exactamente 1 cuenta y hay ${hall.length}`)
  const cuenta = hall[0]
  if (Number(cuenta.saldo_actual) !== c.esperado) {
    throw new Error(`${c.nombre}: el saldo actual es ${cuenta.saldo_actual} y se esperaba ${c.esperado}. Cambió desde que se revisó; no se toca nada.`)
  }
  plan.push({ ...c, id: cuenta.id })
}

console.log(`Modo: ${aplicar ? 'APLICAR' : 'SIMULACIÓN'}`)
for (const p of plan) console.log(`~ ${p.nombre}: ${p.esperado} → ${p.nuevo}  (${p.nuevo - p.esperado >= 0 ? '+' : ''}${p.nuevo - p.esperado})`)

if (aplicar) {
  for (const p of plan) {
    // Condición sobre el saldo anterior: si alguien lo cambió en el medio, no actualiza ninguna fila
    const { data, error: e } = await supabase.from('cuentas')
      .update({ saldo_actual: p.nuevo, updated_at: new Date().toISOString() })
      .eq('id', p.id).eq('saldo_actual', p.esperado).select('id')
    if (e) throw e
    if (!data?.length) throw new Error(`${p.nombre}: el saldo cambió mientras se aplicaba; revisa antes de repetir.`)
    console.log(`✓ ${p.nombre} actualizado`)
  }
  console.log('Listo.')
} else {
  console.log('Simulación terminada: nada se escribió.')
}
