/**
 * Ajuste puntual aprobado por el usuario (2026-11-04), según el estado de cuenta CMR del 19/10/2026.
 *  1. Liga Waffle diego y Regalo anillo a la tarjeta CMR (solo cambia deudas.cuenta_id).
 *  2. Crea las deudas de tarjeta Mercado Libre, Estacionamiento Saba y Skechers (con el pago previo de Mercado Libre, sin cuenta: no mueve saldos).
 * No toca saldos, ni borra nada. Idempotente: si las deudas ya existen, no las vuelve a crear.
 * Uso: node supabase/scripts/ajuste_tarjeta_2026-11-04.mjs [--aplicar]   (sin --aplicar solo muestra lo que haría)
 */
import { supabase } from './_supabase.mjs'

const aplicar = process.argv.includes('--aplicar')
const CMR_ID = '0db7af4b-04e8-4b7e-88da-aa4574caa99f'
const LIGAR = [
  { id: '1df9859c-20e2-4592-802a-053fda2818dd', nombre: 'Waffle diego' },
  { id: '9f57f90d-e5a0-4a23-bb07-5058b2c182e1', nombre: 'Regalo anillo' },
]

const { data: cmr, error: e0 } = await supabase.from('cuentas').select('id, nombre, tipo, usuario_id').eq('id', CMR_ID).single()
if (e0 || cmr.tipo !== 'credito') throw new Error('La cuenta CMR no es la esperada: ' + (e0?.message ?? cmr.tipo))
const usuarioId = cmr.usuario_id
console.log(`Modo: ${aplicar ? 'APLICAR' : 'SIMULACIÓN'} · tarjeta: ${cmr.nombre.trim()}`)

// 1. Ligar a la tarjeta
for (const d of LIGAR) {
  const { data: fila, error } = await supabase.from('deudas').select('id, nombre, cuenta_id, usuario_id, tipo_deuda').eq('id', d.id).single()
  if (error) throw error
  if (fila.usuario_id !== usuarioId) throw new Error(`${d.nombre}: no pertenece al mismo usuario`)
  if (fila.cuenta_id === CMR_ID) { console.log(`= ${d.nombre}: ya estaba ligada`); continue }
  if (fila.cuenta_id) throw new Error(`${d.nombre}: ya tiene otra cuenta (${fila.cuenta_id}); no se toca`)
  console.log(`~ ${d.nombre}: cuenta_id vacío → CMR`)
  if (aplicar) {
    const { error: eu } = await supabase.from('deudas').update({ cuenta_id: CMR_ID, updated_at: new Date().toISOString() }).eq('id', d.id).is('cuenta_id', null)
    if (eu) throw eu
  }
}

// 2. Crear deudas nuevas
const NUEVAS = [
  { nombre: 'Mercado Libre', monto_total: 72348, pagado_previo: 36174, cuotas_total: 6, cuota_mensual: 12058,
    fecha_compra: '2026-07-05', fecha_prox_pago: '2026-11-05',
    nota: 'Mp *mercado libre · 6 cuotas de $12.058 · la 4/6 se cobra en el estado de cuenta de oct (vence 05/11). Pagado previo: 3 cuotas.' },
  { nombre: 'Estacionamiento Saba', monto_total: 1000, pagado_previo: 0, cuotas_total: 1, cuota_mensual: 1000,
    fecha_compra: '2026-09-29', fecha_prox_pago: '2026-11-05',
    nota: 'Saba estacionamientos (La Serena) · 1 cuota de $1.000 · se cobra en el estado de cuenta de oct (vence 05/11).' },
  { nombre: 'Skechers', monto_total: 37980, pagado_previo: 0, cuotas_total: 3, cuota_mensual: 12660,
    fecha_compra: '2026-10-07', fecha_prox_pago: '2026-11-05',
    nota: 'Skechers Vitacura · 3 cuotas de $12.660 · la 1/3 se cobra en el estado de cuenta de oct (vence 05/11).' },
]
for (const n of NUEVAS) {
  const { data: ya } = await supabase.from('deudas').select('id').eq('usuario_id', usuarioId).ilike('nombre', n.nombre)
  if (ya?.length) { console.log(`= ${n.nombre}: ya existe, no se crea`); continue }
  console.log(`+ ${n.nombre}: total ${n.monto_total}, pagado previo ${n.pagado_previo}, pendiente ${n.monto_total - n.pagado_previo}, cuota ${n.cuota_mensual} × ${n.cuotas_total}`)
  if (!aplicar) continue
  const { data: d, error } = await supabase.from('deudas').insert({
    usuario_id: usuarioId, nombre: n.nombre, tipo_deuda: 'tarjeta_credito', cuenta_id: CMR_ID,
    monto_total: n.monto_total, monto_pendiente: n.monto_total - n.pagado_previo, cuotas_total: n.cuotas_total, cuotas_pagadas: 0,
    cuota_mensual: n.cuota_mensual, interes: 0, fecha_compra: n.fecha_compra, fecha_prox_pago: n.fecha_prox_pago,
    nota: n.nota, estado: 'activa',
  }).select('id').single()
  if (error) throw error
  if (n.pagado_previo > 0) {
    // Igual que createDeuda: pago histórico SIN cuenta y sin procesar_movimiento → ningún saldo cambia
    const { error: em } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId, tipo: 'pago_deuda', fecha: n.fecha_compra, deuda_id: d.id,
      monto: n.pagado_previo, nota: 'Pago previo al registro en QloB', contexto_pago: 'deuda_propia',
    })
    if (em) { await supabase.from('deudas').delete().eq('id', d.id); throw em }
  }
}
console.log(aplicar ? 'Listo.' : 'Simulación terminada: nada se escribió.')
