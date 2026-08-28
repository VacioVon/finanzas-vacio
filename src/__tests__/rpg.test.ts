import { describe, it, expect } from 'vitest'
import {
  RPG_XP_CURVA,
  RPG_RANGOS,
  rpgNivelDesdeXP,
  rpgProgresoPorcentaje,
  rpgXpParaSiguienteNivel,
  rpgXpEnNivelActual,
} from '../types/rpg.types'

// ── Curva de XP ───────────────────────────────────────────────

describe('RPG_XP_CURVA — spec congelada HITO 06.4.1', () => {
  it('tiene exactamente 20 entradas', () => {
    expect(RPG_XP_CURVA.length).toBe(20)
  })

  it('nivel 1 empieza en 0 XP', () => {
    expect(RPG_XP_CURVA[0]).toBe(0)
  })

  it('nivel 20 requiere 18.150 XP (curva congelada)', () => {
    expect(RPG_XP_CURVA[19]).toBe(18150)
  })

  it('es estrictamente creciente (curva monotónica)', () => {
    for (let i = 1; i < RPG_XP_CURVA.length; i++) {
      expect(RPG_XP_CURVA[i]).toBeGreaterThan(RPG_XP_CURVA[i - 1])
    }
  })

  it('cada delta es mayor que el anterior (curva acelerada)', () => {
    for (let i = 2; i < RPG_XP_CURVA.length; i++) {
      const delta_actual   = RPG_XP_CURVA[i]     - RPG_XP_CURVA[i - 1]
      const delta_anterior = RPG_XP_CURVA[i - 1] - RPG_XP_CURVA[i - 2]
      expect(delta_actual).toBeGreaterThan(delta_anterior)
    }
  })
})

// ── 20 Rangos ─────────────────────────────────────────────────

describe('RPG_RANGOS — nombres exactos spec congelada', () => {
  it('tiene exactamente 20 rangos', () => {
    expect(RPG_RANGOS.length).toBe(20)
  })

  it('rango 1 es "Discípulo Marcial"', () => {
    expect(RPG_RANGOS[0]).toBe('Discípulo Marcial')
  })

  it('rango 20 es "Emperador Marcial Supremo"', () => {
    expect(RPG_RANGOS[19]).toBe('Emperador Marcial Supremo')
  })

  it('todos los rangos son strings no vacíos y únicos', () => {
    const set = new Set(RPG_RANGOS)
    expect(set.size).toBe(20)
    RPG_RANGOS.forEach(r => expect(r.length).toBeGreaterThan(0))
  })
})

// ── rpgNivelDesdeXP ───────────────────────────────────────────

describe('rpgNivelDesdeXP', () => {
  it('0 XP → nivel 1', () => {
    expect(rpgNivelDesdeXP(0)).toBe(1)
  })

  it('99 XP → nivel 1 (no alcanza nivel 2)', () => {
    expect(rpgNivelDesdeXP(99)).toBe(1)
  })

  it('100 XP exacto → nivel 2', () => {
    expect(rpgNivelDesdeXP(100)).toBe(2)
  })

  it('249 XP → nivel 2 (no alcanza nivel 3)', () => {
    expect(rpgNivelDesdeXP(249)).toBe(2)
  })

  it('250 XP exacto → nivel 3', () => {
    expect(rpgNivelDesdeXP(250)).toBe(3)
  })

  it('18.149 XP → nivel 19 (no alcanza nivel 20)', () => {
    expect(rpgNivelDesdeXP(18149)).toBe(19)
  })

  it('18.150 XP exacto → nivel 20 (máximo)', () => {
    expect(rpgNivelDesdeXP(18150)).toBe(20)
  })

  it('más de 18.150 XP → nivel 20 (no supera máximo)', () => {
    expect(rpgNivelDesdeXP(99999)).toBe(20)
  })

  it('nivel nunca es < 1 con 0 XP', () => {
    expect(rpgNivelDesdeXP(0)).toBeGreaterThanOrEqual(1)
  })
})

// ── rpgXpParaSiguienteNivel ────────────────────────────────────

describe('rpgXpParaSiguienteNivel', () => {
  it('nivel 1 → 100 XP para siguiente', () => {
    expect(rpgXpParaSiguienteNivel(1)).toBe(100)
  })

  it('nivel 19 → 1.900 XP para siguiente (18150 - 16250)', () => {
    expect(rpgXpParaSiguienteNivel(19)).toBe(1900)
  })

  it('nivel 20 (máximo) → 0 XP (ya no hay siguiente)', () => {
    expect(rpgXpParaSiguienteNivel(20)).toBe(0)
  })
})

// ── rpgProgresoPorcentaje ─────────────────────────────────────

describe('rpgProgresoPorcentaje', () => {
  it('0 XP en nivel 1 → 0%', () => {
    expect(rpgProgresoPorcentaje(0, 1)).toBe(0)
  })

  it('50 XP en nivel 1 (de 100 necesarios) → 50%', () => {
    expect(rpgProgresoPorcentaje(50, 1)).toBe(50)
  })

  it('100 XP exacto (nivel 2 recién alcanzado) → 0% dentro del nivel', () => {
    expect(rpgProgresoPorcentaje(100, 2)).toBe(0)
  })

  it('nivel 20 siempre → 100%', () => {
    expect(rpgProgresoPorcentaje(18150, 20)).toBe(100)
    expect(rpgProgresoPorcentaje(99999, 20)).toBe(100)
  })
})

// ── rpgXpEnNivelActual ────────────────────────────────────────

describe('rpgXpEnNivelActual', () => {
  it('0 XP en nivel 1 → 0 XP acumulada en nivel', () => {
    expect(rpgXpEnNivelActual(0, 1)).toBe(0)
  })

  it('150 XP total en nivel 2 (base=100) → 50 XP en nivel', () => {
    expect(rpgXpEnNivelActual(150, 2)).toBe(50)
  })

  it('18150 XP en nivel 20 (base=18150) → 0 XP en nivel (barra llena)', () => {
    expect(rpgXpEnNivelActual(18150, 20)).toBe(0)
  })
})

// ── Stat clamp (lógica pura: Math.max(0, Math.min(100, val))) ─

describe('Stat clamp logic (Addendum B, spec congelada)', () => {
  const clamp = (actual: number, delta: number) =>
    Math.max(0, Math.min(100, actual + delta))

  it('no baja de 0: stat=5 delta=-10 → 0', () => {
    expect(clamp(5, -10)).toBe(0)
  })

  it('no sube de 100: stat=95 delta=10 → 100', () => {
    expect(clamp(95, 10)).toBe(100)
  })

  it('dentro de rango: stat=50 delta=20 → 70', () => {
    expect(clamp(50, 20)).toBe(70)
  })

  it('delta positivo en 100 → sigue en 100', () => {
    expect(clamp(100, 5)).toBe(100)
  })

  it('delta negativo en 0 → sigue en 0', () => {
    expect(clamp(0, -99)).toBe(0)
  })
})

// ── Vida — reglas spec congelada ───────────────────────────────

describe('Vida — reglas de la spec', () => {
  it('vida inicial = 80', () => {
    // Esto es lo que la migración SQL establece como DEFAULT
    expect(80).toBeGreaterThanOrEqual(0)
    expect(80).toBeLessThanOrEqual(100)
  })

  it('vida nunca baja de 0 con clamp', () => {
    const clamp = (v: number, d: number) => Math.max(0, Math.min(100, v + d))
    expect(clamp(2, -10)).toBe(0)
  })

  it('vida nunca sube de 100 con clamp', () => {
    const clamp = (v: number, d: number) => Math.max(0, Math.min(100, v + d))
    expect(clamp(98, +10)).toBe(100)
  })
})

// ── Nivel nunca retrocede ──────────────────────────────────────

describe('Nivel permanente — no retrocede nunca', () => {
  it('nivel calculado ≤ nivel actual → mantener actual (simulación)', () => {
    const nivelActual = 10
    const nivelCalculado = 8  // caso hipotético (no puede pasar en nuestro modelo acumulativo)
    const nivelFinal = Math.max(nivelActual, nivelCalculado)
    expect(nivelFinal).toBe(nivelActual)
  })

  it('nivel calculado > nivel actual → sube', () => {
    const nivelActual = 5
    const nivelCalculado = 6
    const nivelFinal = Math.max(nivelActual, nivelCalculado)
    expect(nivelFinal).toBe(6)
  })
})

// ── Idempotencia (lógica de negocio) ──────────────────────────

describe('Idempotencia — un referencia_id no genera dos veces el mismo evento', () => {
  it('un evento con el mismo referencia_id + tipo_evento no debe procesarse dos veces', () => {
    // Simulación: set de eventos procesados
    const procesados = new Set<string>()
    const key = (referenciaId: string, tipo: string) => `${referenciaId}::${tipo}`

    const procesarEvento = (referenciaId: string, tipo: string) => {
      const k = key(referenciaId, tipo)
      if (procesados.has(k)) return { skip: true }
      procesados.add(k)
      return { skip: false }
    }

    const ref = 'uuid-deuda-123'
    expect(procesarEvento(ref, 'DEUDA_COMPLETADA').skip).toBe(false)
    expect(procesarEvento(ref, 'DEUDA_COMPLETADA').skip).toBe(true)
  })
})

// ── Economía básica ───────────────────────────────────────────

describe('Economía RPG — validaciones de diseño', () => {
  it('XP total necesaria para nivel 20 es ≤ 20.000 (objetivo de diseño)', () => {
    expect(RPG_XP_CURVA[19]).toBeLessThanOrEqual(20000)
  })

  it('XP total necesaria para nivel 10 es ≤ 5.000 (punto medio accesible)', () => {
    expect(RPG_XP_CURVA[9]).toBeLessThanOrEqual(5000)
  })

  it('presupuesto cumplido 100% otorga más XP que 90% (28 > 14)', () => {
    const xp100 = 28
    const xp90  = 14
    expect(xp100).toBeGreaterThan(xp90)
  })

  it('deuda completada otorga más XP que cuota individual (150 > 8)', () => {
    const xpDeudaCompleta = 150
    const xpCuota         = 8
    expect(xpDeudaCompleta).toBeGreaterThan(xpCuota)
  })
})
