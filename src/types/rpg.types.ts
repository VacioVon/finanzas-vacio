// ── RPG Motor de Progreso — HITO 06.4 ──────────────────────────
// XP curve: Nivel 20 = 18.150 XP (curva congelada)
// Stats: 0-100, nunca negativos, escritura solo vía RPC backend

// Curva congelada — índice = nivel (1-based)
export const RPG_XP_CURVA: readonly number[] = [
  0,      // nivel 1
  100,    // nivel 2
  250,    // nivel 3
  450,    // nivel 4
  700,    // nivel 5
  1050,   // nivel 6
  1500,   // nivel 7
  2100,   // nivel 8
  2850,   // nivel 9
  3700,   // nivel 10
  4650,   // nivel 11
  5750,   // nivel 12
  6950,   // nivel 13
  8250,   // nivel 14
  9650,   // nivel 15
  11150,  // nivel 16
  12750,  // nivel 17
  14450,  // nivel 18
  16250,  // nivel 19
  18150,  // nivel 20
] as const

// 20 rangos — orden exacto de la spec congelada
export const RPG_RANGOS: readonly string[] = [
  'Discípulo Marcial',
  'Discípulo Marcial Intermedio',
  'Discípulo Marcial Avanzado',
  'Discípulo Superior',
  'Experto Marcial',
  'Experto Marcial Intermedio',
  'Experto Marcial Avanzado',
  'Maestro Marcial',
  'Maestro Marcial Intermedio',
  'Maestro Marcial Avanzado',
  'Gran Maestro Marcial',
  'Gran Maestro Marcial Intermedio',
  'Gran Maestro Marcial Avanzado',
  'Soberano Marcial',
  'Soberano Marcial Intermedio',
  'Soberano Marcial Avanzado',
  'Emperador Marcial',
  'Emperador Marcial Intermedio',
  'Emperador Marcial Avanzado',
  'Emperador Marcial Supremo',
] as const

export type TipoEventoRPG =
  // Presupuestos
  | 'PRESUPUESTO_CREADO'
  | 'PRESUPUESTO_CUMPLIDO_100'
  | 'PRESUPUESTO_CUMPLIDO_90'
  | 'PRESUPUESTO_CUMPLIDO_75'
  | 'PRESUPUESTO_EXCEDIDO'
  | 'PRESUPUESTO_RACHA_3M'
  | 'PRESUPUESTO_RACHA_6M'
  | 'PRESUPUESTO_RACHA_12M'
  // Objetivos
  | 'OBJETIVO_CREADO'
  | 'OBJETIVO_HITO_25'
  | 'OBJETIVO_HITO_50'
  | 'OBJETIVO_HITO_75'
  | 'OBJETIVO_COMPLETADO'
  | 'OBJETIVO_ABANDONADO'
  // Deudas
  | 'DEUDA_REGISTRADA'
  | 'DEUDA_CUOTA_TIEMPO'
  | 'DEUDA_CUOTA_ADELANTADA'
  | 'DEUDA_CUOTA_ATRASADA'
  | 'DEUDA_COMPLETADA'
  | 'DEUDA_RACHA_6M'
  | 'DEUDA_RACHA_12M'
  // Cuotas CMR
  | 'CMR_CUOTA_TIEMPO'
  | 'CMR_CUOTA_ATRASADA'
  | 'CMR_COMPLETADA'
  // Compromisos / Suscripciones
  | 'COMPROMISO_REGISTRADO'
  | 'COMPROMISO_CUMPLIDO'
  | 'COMPROMISO_VENCIDO'
  | 'COMPROMISO_CANCELADO'
  // Cobros
  | 'COBRO_REGISTRADO'
  | 'COBRO_TOTAL'
  | 'COBRO_PARCIAL'
  | 'COBRO_INCOBRABLE'
  // Movimientos
  | 'INGRESO_REGISTRADO'
  // Futuros (preparados, no activos aún)
  | 'PLANIFICACION_INICIADA'
  | 'APRENDIZAJE_LECCION'

export interface RPGStats {
  finanzas:     number  // 0-100 — Raíces. Token: mover #00C2CB
  disciplina:   number  // 0-100 — Tronco. Token: brand #2979FF
  vitalidad:    number  // 0-100 — Copa/Hojas. Token: ingreso #10D97F
  conocimiento: number  // 0-100 — Flores. Token: ahorro #9B5DE5
  trabajo:      number  // 0-100 — Frutos. Token: xp #FFB703
}

export interface RPGPerfil {
  usuario_id:         string
  nivel:              number     // 1-20
  rango:              string     // uno de RPG_RANGOS
  xp_total:           number
  stat_finanzas:      number
  stat_disciplina:    number
  stat_vitalidad:     number
  stat_conocimiento:  number
  stat_trabajo:       number
  vida:               number     // 0-100; inicial 80
  created_at:         string
  updated_at:         string
}

export interface RPGEvento {
  id:                 string
  usuario_id:         string
  tipo_evento:        TipoEventoRPG
  referencia_id:      string | null
  referencia_tipo:    string | null
  xp_otorgada:        number
  delta_finanzas:     number
  delta_disciplina:   number
  delta_vitalidad:    number
  delta_conocimiento: number
  delta_trabajo:      number
  delta_vida:         number
  resultado:          RPGEventoResultado | null
  created_at:         string
}

export interface RPGEventoResultado {
  nivel_anterior: number
  nivel_nuevo:    number
  xp_total:       number
  subio_nivel:    boolean
}

export interface RPGLogro {
  id:           string
  usuario_id:   string
  logro_tipo:   string
  referencia_id: string | null
  obtenido_en:  string
}

export interface RPGLogroCatalogo {
  logro_tipo:  string
  nombre:      string
  descripcion: string
  emoji:       string
  xp_bonus:    number
  oculto:      boolean
}

export interface RPGRacha {
  usuario_id:   string
  tipo_racha:   string
  inicio_racha: string | null
  ultimo_evento: string | null
  contador:     number
  mejor_racha:  number
}

// Respuesta del RPC process_rpg_event
export interface RPGEventoRespuesta {
  success:        boolean
  skip?:          boolean
  motivo?:        string
  xp_ganada?:     number
  xp_total?:      number
  nivel_anterior?: number
  nivel_nuevo?:   number
  subio_nivel?:   boolean
  rango?:         string
  logros_nuevos?: string[]
  stats?:         RPGStats
  vida?:          number
}

// XP necesaria para pasar de nivel actual al siguiente
export function rpgXpParaSiguienteNivel(nivel: number): number {
  if (nivel >= 20) return 0
  return RPG_XP_CURVA[nivel] - RPG_XP_CURVA[nivel - 1]
}

// XP acumulada dentro del nivel actual (para la barra de progreso)
export function rpgXpEnNivelActual(xpTotal: number, nivel: number): number {
  const base = RPG_XP_CURVA[nivel - 1] ?? 0
  return xpTotal - base
}

// % de progreso dentro del nivel actual (0-100)
export function rpgProgresoPorcentaje(xpTotal: number, nivel: number): number {
  if (nivel >= 20) return 100
  const base      = RPG_XP_CURVA[nivel - 1] ?? 0
  const siguiente = RPG_XP_CURVA[nivel]     ?? 1
  return Math.round(((xpTotal - base) / (siguiente - base)) * 100)
}

// Colores de tier — 7 etapas visuales (aura + sello)
const RPG_TIER_PALETA: readonly [number, number, string][] = [
  [1,  2,  '#8B8DA8'],  // niebla
  [3,  4,  '#10D97F'],  // brote
  [5,  7,  '#00C2CB'],  // raíz despierta
  [8,  10, '#2979FF'],  // árbol joven
  [11, 14, '#9B5DE5'],  // árbol del pulso
  [15, 18, '#FFB703'],  // árbol ancestral
  [19, 20, '#FFFFFF'],  // entidad del firmamento
] as const

export function rpgTierColor(nivel: number): string {
  return RPG_TIER_PALETA.find(([min, max]) => nivel >= min && nivel <= max)?.[2] ?? '#8B8DA8'
}

export function rpgNivelDesdeXP(xp: number): number {
  let nivel = 1
  for (let i = 0; i < RPG_XP_CURVA.length; i++) {
    if (xp >= RPG_XP_CURVA[i]) nivel = i + 1
    else break
  }
  return Math.min(nivel, 20)
}
