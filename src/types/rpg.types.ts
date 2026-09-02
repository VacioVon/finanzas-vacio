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

// ── Narrativa por nivel — HITO 08.1 ─────────────────────────
// Una frase por nivel; el cultivador la lee en su placa.
export const LEVEL_NARRATIVA: Readonly<Record<number, string>> = {
  1:  'La semilla ha sido plantada. Todo gran cultivo comienza aquí.',
  2:  'Tus raíces se afianzan. La tierra reconoce tu intención.',
  3:  'El primer brote emerge. La energía comienza a fluir.',
  4:  'Las hojas se despliegan. Tu camino toma forma.',
  5:  'El árbol joven se alza. Cada raíz refuerza tu propósito.',
  6:  'Los meridianos se abren. La disciplina cobra sentido.',
  7:  'Tu copa recibe la luz. El conocimiento alimenta el crecimiento.',
  8:  'Tu árbol se fortalece. Los frutos del esfuerzo maduran.',
  9:  'La savia fluye con fuerza. Tu perseverancia es visible.',
  10: 'Una década de cultivo. Tu árbol ya proyecta sombra.',
  11: 'Las flores persisten. El conocimiento se convierte en sabiduría.',
  12: 'Tu árbol es antiguo. Sus raíces tocan lo invisible.',
  13: 'La energía fluye sin esfuerzo. Has encontrado tu ritmo.',
  14: 'Tu sombra protege a otros. El cultivador maduro inspira.',
  15: 'El árbol ancestral despierta. Tu qi trasciende lo ordinario.',
  16: 'Las partículas de luz te rodean. La trascendencia se aproxima.',
  17: 'El cosmos responde a tu llamado. Tu árbol conecta mundos.',
  18: 'Los antiguos cultivadores reconocen tu presencia.',
  19: 'La Unión se aproxima. Todo tu ser vibra en armonía.',
  20: 'La Unión. Eres el árbol. El árbol eres tú.',
}

export function rpgNarrativa(nivel: number): string {
  const n = Math.min(Math.max(Math.round(nivel), 1), 20)
  return LEVEL_NARRATIVA[n] ?? LEVEL_NARRATIVA[1]
}

// ── Caminos de misión — preparado para Etapa C ───────────────
// Las cinco vías de cultivo que guiarán las futuras misiones manuales.
export type CaminoMision = 'finanzas' | 'disciplina' | 'vitalidad' | 'conocimiento' | 'trabajo'

export const CAMINO_META: Readonly<Record<CaminoMision, { emoji: string; label: string; color: string }>> = {
  finanzas:     { emoji: '💰', label: 'Finanzas',     color: '#00C2CB' },
  disciplina:   { emoji: '⚔️',  label: 'Disciplina',   color: '#2979FF' },
  vitalidad:    { emoji: '🌱', label: 'Vitalidad',    color: '#10D97F' },
  conocimiento: { emoji: '📚', label: 'Conocimiento', color: '#9B5DE5' },
  trabajo:      { emoji: '🔨', label: 'Trabajo',      color: '#FFB703' },
}

// ── Misiones / Quests — HITO 06.8 ───────────────────────────

export type TipoMision     = 'diaria' | 'semanal' | 'especial'
export type DificultadMision = 'facil' | 'media' | 'dificil' | 'legendaria'
export type EstadoMision   = 'pendiente' | 'en_progreso' | 'completada' | 'expirada'

export interface MisionRPG {
  mision_id:       string
  clave:           string
  nombre:          string
  descripcion:     string
  tipo:            TipoMision
  dificultad:      DificultadMision
  condicion_tipo:  string
  condicion_valor: number
  xp_recompensa:   number
  stat_recompensa: string | null
  stat_delta:      number
  vida_delta:      number
  orden_ui:        number
  instancia_id:    string | null
  estado:          EstadoMision
  progreso:        number
  periodo_inicio:  string
  periodo_fin:     string
  completada_at:   string | null
}

export interface VerificarMisionResultado {
  ok:            boolean
  error?:        string
  ya_completada?: boolean
  completada:    boolean
  progreso:      number
  objetivo:      number
  xp_ganado:     number
  rpg?:          RPGEventoRespuesta
}

// ── Misiones Manuales — HITO 08.2 ───────────────────────────
export interface MisionManual {
  id:             string
  clave:          string
  camino:         CaminoMision
  nombre:         string
  descripcion:    string | null
  emoji:          string
  xp_recompensa:  number
  stat_key:       CaminoMision
  cooldown_horas: number
  orden_ui:       number
}

export interface MisionManualLog {
  id:            string
  mision_id:     string
  xp_otorgada:   number
  dia:           string
  completada_at: string
}

export interface CompletarMisionManualResult {
  ok:             boolean
  error?:         string
  xp_otorgada?:   number
  xp_hoy?:        number
  cap_diario?:    number
  disponible_en?: string
  rpg?:           RPGEventoRespuesta
}
