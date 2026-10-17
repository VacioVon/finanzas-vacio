/**
 * Mora / interés por pago atrasado de una cuota. Se escribe a mano (varía según los días de atraso)
 * y se registra como un gasto aparte: NO reduce la deuda, que solo baja por el capital pagado.
 */
import { claveComercio } from '@/utils/comercios'

/** Mora válida en pesos enteros (>0) o 0 si está vacía/ inválida. */
export function parseMora(valor: unknown): number {
  const n = Math.round(Number(valor))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Lo que sale de la cuenta en total: cuota (capital) + mora. */
export const totalConMora = (cuota: number, mora: number) => Math.max(0, Math.round(cuota)) + parseMora(mora)

/** Categoría de gasto que mejor calza con "mora/intereses" si el usuario ya la tiene; si no, null (sin categoría). */
export function categoriaParaMora<T extends { id: string; nombre: string }>(categorias: T[]): T | null {
  const preferidos = [/mora/, /interes/, /financ/, /banc/, /deuda/]
  for (const re of preferidos) {
    const c = categorias.find(x => re.test(claveComercio(x.nombre)))
    if (c) return c
  }
  return null
}

export const notaMora = (nombreDeuda: string) => `Mora por atraso · ${nombreDeuda.trim()}`
