import { describe, it, expect } from 'vitest'
import { comerciosUnicos, filtrarSugerencias, claveComercio } from '@/utils/comercios'

const usos = [
  { comercio: 'Líder', categoria_id: 'ali' },
  { comercio: 'lider ', categoria_id: 'ali' },
  { comercio: 'Líder', categoria_id: 'ali' },
  { comercio: 'Uber', categoria_id: 'tra' },
  { comercio: 'Uber', categoria_id: 'tra' },
  { comercio: 'Uber', categoria_id: 'tra' },
  { comercio: 'Uber', categoria_id: 'tra' },
  { comercio: 'Jumbo', categoria_id: 'ali' },
  { comercio: null, categoria_id: 'ali' },
  { comercio: '   ', categoria_id: 'ali' },
]

describe('comercios', () => {
  it('agrupa variantes y usa la más frecuente como nombre', () => {
    const l = comerciosUnicos(usos)
    expect(l.find(c => claveComercio(c.nombre) === 'lider')).toMatchObject({ nombre: 'Líder', usos: 3 })
    expect(l).toHaveLength(3)
  })
  it('ignora vacíos', () => {
    expect(comerciosUnicos([{ comercio: null, categoria_id: null }, { comercio: ' ', categoria_id: null }])).toEqual([])
  })
  it('sin categoría ordena por uso total', () => {
    expect(comerciosUnicos(usos).map(c => c.nombre)).toEqual(['Uber', 'Líder', 'Jumbo'])
  })
  it('con categoría pone primero los de esa categoría', () => {
    expect(comerciosUnicos(usos, 'ali').map(c => c.nombre)).toEqual(['Líder', 'Jumbo', 'Uber'])
  })
  it('filtra por lo escrito, sin tildes ni mayúsculas, sin sugerir lo exacto', () => {
    const l = comerciosUnicos(usos)
    expect(filtrarSugerencias(l, 'LI').map(c => c.nombre)).toEqual(['Líder'])
    expect(filtrarSugerencias(l, 'líder')).toEqual([])
    expect(filtrarSugerencias(l, 'xyz')).toEqual([])
  })
  it('sin texto devuelve los primeros', () => {
    expect(filtrarSugerencias(comerciosUnicos(usos), '', 2)).toHaveLength(2)
  })
})
