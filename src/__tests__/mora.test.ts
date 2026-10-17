import { describe, it, expect } from 'vitest'
import { parseMora, totalConMora, categoriaParaMora, notaMora } from '@/utils/mora'

describe('mora', () => {
  it('parseMora acepta números y descarta vacíos o negativos', () => {
    expect(parseMora('1092')).toBe(1092)
    expect(parseMora(1092.4)).toBe(1092)
    expect(parseMora('')).toBe(0)
    expect(parseMora(undefined)).toBe(0)
    expect(parseMora(-5)).toBe(0)
    expect(parseMora('abc')).toBe(0)
  })
  it('total = cuota + mora (caso Universidad: 137.637 + 1.092)', () => {
    expect(totalConMora(137637, 1092)).toBe(138729)
    expect(totalConMora(137637, 0)).toBe(137637)
  })
  it('categoría: prefiere mora, luego intereses; null si no hay', () => {
    const cats = [{ id: 'a', nombre: 'Alimentación' }, { id: 'b', nombre: 'Intereses y comisiones' }, { id: 'c', nombre: 'Mora' }]
    expect(categoriaParaMora(cats)?.id).toBe('c')
    expect(categoriaParaMora(cats.slice(0, 2))?.id).toBe('b')
    expect(categoriaParaMora([cats[0]])).toBeNull()
  })
  it('nota incluye el nombre de la deuda', () => {
    expect(notaMora(' Universidad ')).toBe('Mora por atraso · Universidad')
  })
})
