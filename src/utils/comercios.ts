/**
 * Sugerencias de comercio/tienda a partir de los que ya se han ingresado.
 * Lógica pura: agrupa variantes ("lider", "Líder ") y ordena por relevancia.
 */

export interface UsoComercio { comercio: string | null; categoria_id: string | null }
export interface ComercioSugerido { nombre: string; usos: number; enCategoria: number }

/** Clave para comparar: sin tildes, sin mayúsculas, sin espacios repetidos. */
export function claveComercio(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Comercios únicos con su frecuencia. El nombre mostrado es la variante más usada
 * (a igualdad, la que aparece primero). Orden: más usados en la categoría elegida, luego más usados en total.
 */
export function comerciosUnicos(usos: UsoComercio[], categoriaId?: string | null): ComercioSugerido[] {
  const mapa = new Map<string, { variantes: Map<string, number>; usos: number; enCategoria: number }>()
  for (const u of usos) {
    const nombre = u.comercio?.replace(/\s+/g, ' ').trim()
    if (!nombre) continue
    const clave = claveComercio(nombre)
    let e = mapa.get(clave)
    if (!e) { e = { variantes: new Map(), usos: 0, enCategoria: 0 }; mapa.set(clave, e) }
    e.variantes.set(nombre, (e.variantes.get(nombre) ?? 0) + 1)
    e.usos++
    if (categoriaId && u.categoria_id === categoriaId) e.enCategoria++
  }
  const res: ComercioSugerido[] = []
  for (const e of mapa.values()) {
    let mejor = '', n = -1
    for (const [v, c] of e.variantes) if (c > n) { mejor = v; n = c }
    res.push({ nombre: mejor, usos: e.usos, enCategoria: e.enCategoria })
  }
  return res.sort((a, b) => b.enCategoria - a.enCategoria || b.usos - a.usos || a.nombre.localeCompare(b.nombre, 'es'))
}

/**
 * Sugerencias para lo que se está escribiendo: sin texto, los más usados (de la categoría primero);
 * con texto, los que lo contienen (empezando por él primero). Nunca sugiere lo que ya está escrito exacto.
 */
export function filtrarSugerencias(lista: ComercioSugerido[], texto: string, max = 6): ComercioSugerido[] {
  const q = claveComercio(texto)
  if (!q) return lista.slice(0, max)
  return lista
    .filter(c => { const k = claveComercio(c.nombre); return k.includes(q) && k !== q })
    .sort((a, b) => Number(claveComercio(b.nombre).startsWith(q)) - Number(claveComercio(a.nombre).startsWith(q)))
    .slice(0, max)
}
