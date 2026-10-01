import { supabase } from '@/lib/supabase'
import type { Movimiento } from '@/types/app.types'
import { getCuentas } from '@/services/cuentas.service'
import { getDeudas } from '@/services/deudas.service'
import { getGastosCompartidos } from '@/services/gastos-compartidos.service'
import { getCuentasPorCobrar } from '@/services/cobros.service'
import { construirLibro, generarXlsx, type DatosExport, type PresupuestoExport } from '@/utils/exportExcel'

const MOV_SELECT = `
  *,
  categoria:categorias(id, nombre, emoji, tipo, color),
  subcategoria:subcategorias(id, nombre),
  cuenta:cuentas!movimientos_cuenta_id_fkey(id, nombre, tipo, color),
  cuenta_destino:cuentas!movimientos_cuenta_destino_id_fkey(id, nombre, tipo, color)
`

/** Todos los movimientos del usuario, paginando (Supabase limita cada consulta a 1.000 filas). */
async function getTodosLosMovimientos(userId: string): Promise<Movimiento[]> {
  const PAGINA = 1000
  const todos: Movimiento[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from('movimientos')
      .select(MOV_SELECT)
      .eq('usuario_id', userId)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) throw error
    todos.push(...(data as Movimiento[]))
    if (!data || data.length < PAGINA) break
  }
  return todos
}

/** Solo lectura: no modifica nada en la base de datos. */
export async function exportarExcel(
  userId: string,
  opciones: { fechaSueldo: number; desde: string | null; hasta: string | null }
): Promise<{ blob: Blob; movimientos: number }> {
  const [movimientos, cuentas, deudas, compartidos, cobrar, pres, comp] = await Promise.all([
    getTodosLosMovimientos(userId),
    getCuentas(userId),
    getDeudas(userId),
    getGastosCompartidos(userId),
    getCuentasPorCobrar(userId),
    supabase.from('presupuestos').select('mes, anio, categoria_id, monto_presupuestado, categoria:categorias(nombre)').eq('usuario_id', userId),
    supabase.from('suscripciones').select('id, nombre').eq('usuario_id', userId),
  ])
  if (pres.error) throw pres.error
  if (comp.error) throw comp.error

  const presupuestos: PresupuestoExport[] = (pres.data ?? []).map(p => ({
    mes: p.mes, anio: p.anio, categoria_id: p.categoria_id,
    monto_presupuestado: Number(p.monto_presupuestado),
    categoria_nombre: (p.categoria as unknown as { nombre?: string } | null)?.nombre ?? 'Sin categoría',
  }))

  const datos: DatosExport = {
    movimientos, cuentas, deudas, compartidos, cobrar, presupuestos,
    compromisos: (comp.data ?? []) as { id: string; nombre: string }[],
    fechaSueldo: opciones.fechaSueldo || 1,
    desde: opciones.desde, hasta: opciones.hasta, generado: new Date(),
  }

  const hojas = construirLibro(datos)
  const blob = await generarXlsx(hojas)
  return { blob, movimientos: hojas.find(h => h.nombre === 'Movimientos')?.filas.length ?? 0 }
}
