import { useMemo, useState, useRef, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { formatCLP } from '@/utils/currency'
import { useSuscripciones } from '@/hooks/useSuscripciones'
import { useCuotas } from '@/hooks/useCuotas'
import { useDeudas } from '@/hooks/useDeudas'
import { useCuentasPorCobrar } from '@/hooks/useCobros'
import { useCuentas } from '@/hooks/useCuentas'
import { useObjetivos } from '@/hooks/useObjetivos'
import { usePlanificaciones } from '@/hooks/usePlanificaciones'
import { useAuthStore } from '@/store/authStore'
import {
  addDays, addMonths, differenceInDays, format, parseISO,
  setDate, startOfMonth, getDaysInMonth, getDay, isSameMonth,
  isSameDay, isToday
} from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, TrendingDown, TrendingUp, Wallet, Target } from 'lucide-react'
import type { TipoCuenta, TipoPlanificacion } from '@/types/app.types'
import { DiaSheet, type EventoDia } from '@/components/modules/planificaciones/DiaSheet'

// ── Constantes ───────────────────────────────────────────────────
const CUENTAS_LIQUIDEZ: TipoCuenta[] = ['bancaria', 'digital', 'debito', 'efectivo']
const RANGOS = [15, 30, 60] as const
type Rango = typeof RANGOS[number]

// ── Tipos internos ───────────────────────────────────────────────
type EventoTipo = 'compromiso' | 'cuota' | 'deuda' | 'sueldo' | 'cobro_esperado'

interface EventoCalendario {
  fecha:       string
  tipo:        EventoTipo
  emoji:       string
  titulo:      string
  subtitulo?:  string
  monto:       number | null   // null = sueldo (monto desconocido)
  delta:       number          // impacto en saldo: negativo = egreso, 0 = informativo
  esEstimado?: boolean         // true = monto_tipo 'estimado', mostrar ~ y tratar distinto en proyección
}

// Color por tipo de evento comprometido
const TIPO_COLOR: Record<EventoTipo, { dot: string; badge: string; icon: string; border: string }> = {
  sueldo:         { dot: 'bg-ingreso-500',  badge: 'bg-ingreso-500/15 text-ingreso-400 border-ingreso-500/30',  icon: 'text-ingreso-400',  border: 'border-ingreso-500/25' },
  compromiso:     { dot: 'bg-mover-500',    badge: 'bg-mover-500/15 text-mover-400 border-mover-500/30',        icon: 'text-mover-400',    border: 'border-mover-500/25'   },
  cuota:          { dot: 'bg-brand-500',    badge: 'bg-brand-500/15 text-brand-400 border-brand-500/30',        icon: 'text-brand-400',    border: 'border-brand-500/25'   },
  deuda:          { dot: 'bg-gasto-500',    badge: 'bg-gasto-500/15 text-gasto-400 border-gasto-500/30',        icon: 'text-gasto-400',    border: 'border-gasto-500/25'   },
  cobro_esperado: { dot: 'border border-ingreso-500', badge: 'bg-ingreso-500/10 text-ingreso-400 border-ingreso-500/30', icon: 'text-ingreso-400',  border: 'border-ingreso-500/30' },
}

// Color por tipo de planificación (dots outline)
const PLAN_DOT: Record<TipoPlanificacion, string> = {
  gasto:   'border border-gasto-500',
  ingreso: 'border border-ingreso-500',
  ahorro:  'border border-ahorro-500',
  mover:   'border border-mover-500',
}

const TIPO_LABEL: Record<EventoTipo, string> = {
  sueldo: 'Sueldo', compromiso: 'Compromiso', cuota: 'Cuota', deuda: 'Deuda',
  cobro_esperado: 'Cobro esperado'
}

// ── Utilidades ───────────────────────────────────────────────────
function fechaRelativa(fechaStr: string): string {
  const hoy  = new Date()
  const f    = parseISO(fechaStr)
  const dias = differenceInDays(f, hoy)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias < 7)   return format(f, 'EEEE', { locale: es })
  return format(f, "d 'de' MMMM", { locale: es })
}

function groupByDate(eventos: EventoCalendario[]) {
  const map = new Map<string, EventoCalendario[]>()
  for (const e of eventos) {
    const list = map.get(e.fecha) ?? []
    list.push(e)
    map.set(e.fecha, list)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

// ── Componente ProyeccionCard ────────────────────────────────────
interface Proyeccion {
  saldoInicial:         number
  totalCompromisos:     number
  totalCompromisosEstimados: number
  totalPlanificado:     number
  saldoFinal:           number
  saldoMinimo:          number
  fechaMinimo:          string | null
  eventoMinimo:         string | null
  enRojo:               boolean
  montoNecesario:       number
}

function ProyeccionCard({ p, rango }: { p: Proyeccion; rango: Rango }) {
  const enRiesgo = p.enRojo || p.saldoMinimo < p.saldoInicial * 0.2

  return (
    <div className="rounded-2xl border border-night-border bg-night-1 overflow-hidden"
      style={{ boxShadow: '0 0 20px rgba(41,121,255,0.06)' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b border-night-border/60 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Proyección · {rango} días
        </p>
        {p.enRojo
          ? <span className="flex items-center gap-1 text-[10px] font-semibold text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" /> Riesgo de sobregiro
            </span>
          : <span className="text-[10px] text-slate-600">Basada en datos conocidos</span>
        }
      </div>

      {/* Filas */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-400">Liquidez disponible hoy</span>
          </div>
          <span className="text-sm font-bold text-white">{formatCLP(p.saldoInicial)}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-gasto-500" />
            <span className="text-xs text-slate-400">Compromisos confirmados</span>
          </div>
          <span className="text-sm font-semibold text-gasto-400">−{formatCLP(p.totalCompromisos)}</span>
        </div>

        {p.totalCompromisosEstimados > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500">Compromisos estimados (~)</span>
            </div>
            <span className="text-sm font-semibold text-slate-400">≈−{formatCLP(p.totalCompromisosEstimados)}</span>
          </div>
        )}

        {p.totalPlanificado > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-brand-500/60" />
              <span className="text-xs text-slate-500">Planificado (pendiente)</span>
            </div>
            <span className="text-sm font-semibold text-brand-400/70">−{formatCLP(p.totalPlanificado)}</span>
          </div>
        )}

        <div className="h-px bg-night-border/60" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-3.5 w-3.5 ${p.saldoFinal >= 0 ? 'text-ingreso-500' : 'text-gasto-500'}`} />
            <span className="text-xs text-slate-300 font-medium">Saldo proyectado</span>
          </div>
          <span className={`text-base font-bold ${p.saldoFinal >= 0 ? 'text-ingreso-400' : 'text-gasto-400'}`}>
            {formatCLP(p.saldoFinal)}
          </span>
        </div>
      </div>

      {/* Saldo mínimo */}
      {p.fechaMinimo && p.saldoMinimo !== p.saldoInicial && (
        <div className={[
          'mx-3 mb-3 rounded-xl border px-3 py-2.5',
          p.enRojo
            ? 'bg-gasto-500/10 border-gasto-500/30'
            : 'bg-night-2 border-night-border/60'
        ].join(' ')}>
          {p.enRojo ? (
            <>
              <p className="text-xs font-semibold text-gasto-400 mb-0.5">
                🔴 El día {format(parseISO(p.fechaMinimo), "d 'de' MMMM", { locale: es })} necesitarías {formatCLP(p.montoNecesario)} adicionales
              </p>
              <p className="text-[10px] text-gasto-500/80">
                Motivo: {p.eventoMinimo}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] text-slate-500 mb-0.5">Saldo mínimo proyectado</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-xp-400">{formatCLP(p.saldoMinimo)}</span>
                <span className="text-[10px] text-slate-500">
                  {format(parseISO(p.fechaMinimo), "d MMM", { locale: es })} · {p.eventoMinimo}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center pb-3 px-4">
        ⚠ Sueldo no incluido en la proyección — monto no configurado
      </p>
    </div>
  )
}

// ── Componente QueHacer ──────────────────────────────────────────
function QueHacer({
  disponible,
  objetivos
}: {
  disponible: number
  objetivos: { nombre: string; emoji: string | null; faltante: number }[]
}) {
  const objetivo = objetivos[0]
  if (!objetivo || disponible <= 0) return null

  const sugerencia  = Math.min(Math.round(disponible * 0.15 / 1000) * 1000, objetivo.faltante)
  const trasSugerir = disponible - sugerencia

  return (
    <div className="rounded-2xl border border-ahorro-500/20 bg-ahorro-500/5 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-ahorro-400" />
        <p className="text-xs font-semibold text-ahorro-300">¿Qué puedo hacer con mi dinero?</p>
      </div>
      <div className="space-y-1.5 text-xs text-slate-400">
        <p>
          Tienes <span className="text-white font-semibold">{formatCLP(disponible)}</span> disponibles después de tus compromisos.
        </p>
        {objetivo.faltante > 0 && (
          <p>
            Para tu objetivo {objetivo.emoji} <span className="text-slate-300">{objetivo.nombre}</span> te faltan{' '}
            <span className="text-ahorro-400 font-semibold">{formatCLP(objetivo.faltante)}</span>.
          </p>
        )}
        {sugerencia > 0 && trasSugerir > 0 && (
          <p className="text-slate-300 pt-0.5">
            Si apartas <span className="text-ahorro-400 font-semibold">{formatCLP(sugerencia)}</span> este mes,
            mantendrías <span className="text-white font-semibold">{formatCLP(trasSugerir)}</span> disponibles.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Componente MiniCalendario ────────────────────────────────────
function MiniCalendario({
  eventosPorFecha,
  plansPorFecha,
  diaSeleccionado,
  onSelectDia
}: {
  eventosPorFecha: Map<string, EventoTipo[]>
  plansPorFecha:   Map<string, TipoPlanificacion[]>
  diaSeleccionado: string | null
  onSelectDia:     (fecha: string) => void
}) {
  const hoy       = new Date()
  const inicio    = startOfMonth(hoy)
  const totalDias = getDaysInMonth(hoy)
  const offsetInicio = (getDay(inicio) + 6) % 7

  const celdas: (Date | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => addDays(inicio, i))
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)

  const semanas: (Date | null)[][] = []
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))

  const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div className="rounded-2xl border border-night-border bg-night-1 p-3">
      <p className="text-xs font-semibold text-slate-400 text-center mb-2 uppercase tracking-wider">
        {format(hoy, 'MMMM yyyy', { locale: es })}
      </p>

      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-600">{d}</div>
        ))}
      </div>

      {semanas.map((semana, si) => (
        <div key={si} className="grid grid-cols-7">
          {semana.map((dia, di) => {
            if (!dia) return <div key={di} />
            const key       = format(dia, 'yyyy-MM-dd')
            const tipos     = eventosPorFecha.get(key) ?? []
            const plans     = plansPorFecha.get(key) ?? []
            const esHoy     = isToday(dia)
            const esMes     = isSameMonth(dia, hoy)
            const selec     = diaSeleccionado === key
            const tieneAlgo = tipos.length > 0 || plans.length > 0

            return (
              <button
                key={di}
                onClick={() => onSelectDia(key)}
                className={[
                  'flex flex-col items-center py-1 rounded-lg transition-all cursor-pointer hover:bg-white/5',
                  selec   ? 'bg-brand-500/20 ring-1 ring-brand-500/50' : '',
                  !esMes  ? 'opacity-30' : ''
                ].join(' ')}
              >
                <span className={[
                  'text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full',
                  esHoy   ? 'bg-brand-500 text-white font-bold' :
                  selec   ? 'text-brand-300' :
                            'text-slate-400'
                ].join(' ')}>
                  {format(dia, 'd')}
                </span>
                {/* Dots: sólidos = comprometido, outline = planificado */}
                <div className="flex gap-0.5 h-2 items-center mt-0.5">
                  {tipos.slice(0, 2).map((t, ti) => (
                    <div key={`ev-${ti}`} className={`w-1 h-1 rounded-full ${TIPO_COLOR[t].dot}`} />
                  ))}
                  {plans.slice(0, tieneAlgo ? 1 : 2).map((p, pi) => (
                    <div key={`pl-${pi}`} className={`w-1 h-1 rounded-full bg-transparent ${PLAN_DOT[p]}`} style={{ boxSizing: 'border-box' }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      ))}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1 border-t border-night-border/40 pt-2">
        <p className="w-full text-[9px] text-slate-600 mb-0.5">● comprometido · ○ planificado</p>
        {(Object.entries(TIPO_COLOR) as [EventoTipo, typeof TIPO_COLOR[EventoTipo]][]).map(([tipo, c]) => (
          <div key={tipo} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            <span className="text-[10px] text-slate-600">{TIPO_LABEL[tipo]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export function CalendarioPage() {
  const { profile }                        = useAuthStore()
  const { data: suscripciones = [] }       = useSuscripciones()
  const { data: cuotas        = [] }       = useCuotas()
  const { data: deudas        = [] }       = useDeudas()
  const { data: cuentas       = [] }       = useCuentas()
  const { data: objetivos     = [] }       = useObjetivos()
  const { planificaciones }                = usePlanificaciones()
  const { data: cobros         = [] }       = useCuentasPorCobrar()

  const [rango,           setRango]        = useState<Rango>(30)
  const [diaSeleccionado, setDiaSelec]     = useState<string | null>(null)
  const [diaSheetFecha,   setDiaSheetFecha] = useState<string | null>(null)

  const grupoRefs = useRef<Map<string, HTMLElement>>(new Map())
  const setGrupoRef = useCallback((fecha: string) => (el: HTMLElement | null) => {
    if (el) grupoRefs.current.set(fecha, el)
    else    grupoRefs.current.delete(fecha)
  }, [])

  const hoy    = new Date()
  const limite = addDays(hoy, rango)

  // ── Saldo de liquidez ─────────────────────────────────────────
  const saldoLiquidez = useMemo(() =>
    cuentas
      .filter(c => c.activa && CUENTAS_LIQUIDEZ.includes(c.tipo))
      .reduce((s, c) => s + c.saldo_actual, 0),
    [cuentas]
  )

  // ── Eventos comprometidos ─────────────────────────────────────
  const eventos = useMemo<EventoCalendario[]>(() => {
    const lista: EventoCalendario[] = []

    if (profile?.fecha_sueldo) {
      let fechaSueldo = setDate(hoy, profile.fecha_sueldo)
      if (fechaSueldo <= hoy) fechaSueldo = addMonths(fechaSueldo, 1)
      if (fechaSueldo <= limite) {
        lista.push({
          fecha:     format(fechaSueldo, 'yyyy-MM-dd'),
          tipo:      'sueldo',
          emoji:     '💵',
          titulo:    'Día de sueldo',
          subtitulo: `Día ${profile.fecha_sueldo} de cada mes · monto no configurado`,
          monto:     null,
          delta:     0
        })
      }
    }

    for (const s of suscripciones) {
      if (!s.activa || !s.proxima_fecha) continue
      const fecha = parseISO(s.proxima_fecha)
      if (fecha > hoy && fecha <= limite) {
        lista.push({
          fecha:      s.proxima_fecha,
          tipo:       'compromiso',
          emoji:      s.emoji ?? '🔄',
          titulo:     s.nombre,
          subtitulo:  s.cuenta?.nombre,
          monto:      s.monto,
          delta:      -s.monto,
          esEstimado: s.monto_tipo === 'estimado',
        })
      }
    }

    for (const c of cuotas) {
      if (c.estado !== 'activa') continue
      const fechaBase   = parseISO(c.fecha_inicio)
      const proximoPago = addMonths(fechaBase, c.cuotas_pagadas)
      if (proximoPago > hoy && proximoPago <= limite) {
        lista.push({
          fecha:     format(proximoPago, 'yyyy-MM-dd'),
          tipo:      'cuota',
          emoji:     c.emoji ?? '💳',
          titulo:    c.nombre,
          subtitulo: `Cuota ${c.cuotas_pagadas + 1} de ${c.cuotas_total} · ${c.cuenta?.nombre ?? ''}`,
          monto:     c.monto_cuota,
          delta:     -c.monto_cuota
        })
      }
    }

    for (const d of deudas) {
      if (d.estado !== 'activa' || !d.fecha_prox_pago) continue
      const fecha = parseISO(d.fecha_prox_pago)
      if (fecha > hoy && fecha <= limite) {
        const monto = d.cuota_mensual ?? d.monto_pendiente
        lista.push({
          fecha:     d.fecha_prox_pago,
          tipo:      'deuda',
          emoji:     '🏦',
          titulo:    d.nombre,
          subtitulo: d.cuota_mensual ? undefined : 'Monto pendiente total',
          monto,
          delta:     -monto
        })
      }
    }

    // Cobros esperados (fecha_vencimiento de cuentas_por_cobrar pendientes)
    for (const c of cobros) {
      if (c.estado !== 'pendiente' || !c.fecha_vencimiento) continue
      const fecha = parseISO(c.fecha_vencimiento)
      if (fecha > hoy && fecha <= limite) {
        const monto = c.monto_original - c.monto_pagado
        lista.push({
          fecha:     c.fecha_vencimiento,
          tipo:      'cobro_esperado',
          emoji:     '💸',
          titulo:    c.persona,
          subtitulo: c.descripcion ?? undefined,
          monto,
          delta:     monto   // ingreso esperado
        })
      }
    }

    return lista
  }, [profile, suscripciones, cuotas, deudas, cobros, hoy, limite])

  // ── Planificaciones en el rango ───────────────────────────────
  // Solo pendientes dentro del rango de proyección.
  // Delta de liquidez:
  //   gasto:   -monto
  //   ingreso: +monto
  //   ahorro:  -monto (disponible baja; patrimonio sube via objetivo)
  //   mover:   delta neto según tipos de cuenta (liquidez→liquidez = 0, liquidez→inversion = -monto)
  const planificacionesEnRango = useMemo(() => {
    return planificaciones.filter(p => {
      const f = parseISO(p.fecha)
      return f > hoy && f <= limite
    })
  }, [planificaciones, hoy, limite])

  const planificacionesDelta = useMemo(() => {
    return planificacionesEnRango.map(p => {
      let delta = 0
      if (p.tipo === 'gasto' || p.tipo === 'ahorro') {
        delta = -p.monto
      } else if (p.tipo === 'ingreso') {
        delta = p.monto
      } else if (p.tipo === 'mover') {
        // Delta neto sobre liquidez según tipo de cuentas involucradas
        const origenEsLiquidez  = p.cuenta?.tipo && CUENTAS_LIQUIDEZ.includes(p.cuenta.tipo)
        const destinoEsLiquidez = p.cuenta_destino?.tipo && CUENTAS_LIQUIDEZ.includes(p.cuenta_destino.tipo)
        if (origenEsLiquidez && !destinoEsLiquidez) delta = -p.monto   // sale de liquidez
        else if (!origenEsLiquidez && destinoEsLiquidez) delta = p.monto  // entra a liquidez
        else delta = 0  // transferencia interna entre cuentas del mismo pool
      }
      return { plan: p, delta }
    })
  }, [planificacionesEnRango])

  // ── Proyección cronológica (compromisos + planificaciones) ────
  const proyeccion = useMemo<Proyeccion>(() => {
    // Fuente 1: eventos comprometidos
    const items = [
      ...eventos.map(ev => ({ fecha: ev.fecha, titulo: ev.titulo, delta: ev.delta, esCompromiso: true, esEstimado: ev.esEstimado ?? false })),
      ...planificacionesDelta.map(({ plan, delta }) => ({
        fecha: plan.fecha,
        titulo: plan.comercio || plan.descripcion || plan.tipo,
        delta,
        esCompromiso: false,
        esEstimado: false,
      }))
    ].sort((a, b) => a.fecha.localeCompare(b.fecha))

    let saldo          = saldoLiquidez
    let minSaldo       = saldoLiquidez
    let fechaMinimo:   string | null = null
    let eventoMinimo:  string | null = null
    let totalCompromisos          = 0
    let totalCompromisosEstimados = 0
    let totalPlanificado          = 0

    for (const item of items) {
      if (item.delta === 0) continue
      saldo += item.delta

      if (item.esCompromiso && item.delta < 0) {
        if (item.esEstimado) totalCompromisosEstimados += Math.abs(item.delta)
        else                 totalCompromisos          += Math.abs(item.delta)
      }
      if (!item.esCompromiso && item.delta < 0) totalPlanificado += Math.abs(item.delta)

      if (saldo < minSaldo) {
        minSaldo     = saldo
        fechaMinimo  = item.fecha
        eventoMinimo = item.titulo
      }
    }

    return {
      saldoInicial:              saldoLiquidez,
      totalCompromisos,
      totalCompromisosEstimados,
      totalPlanificado,
      saldoFinal:                saldo,
      saldoMinimo:      minSaldo,
      fechaMinimo,
      eventoMinimo,
      enRojo:           minSaldo < 0,
      montoNecesario:   minSaldo < 0 ? Math.abs(minSaldo) : 0
    }
  }, [eventos, planificacionesDelta, saldoLiquidez])

  // ── ¿Qué puedo hacer? ────────────────────────────────────────
  const disponible = proyeccion.saldoFinal
  const objetivosActivos = useMemo(() =>
    objetivos
      .filter(o => o.estado === 'activo' && o.monto_actual < o.monto_objetivo)
      .map(o => ({
        nombre:   o.nombre,
        emoji:    o.emoji,
        faltante: o.monto_objetivo - o.monto_actual
      })),
    [objetivos]
  )

  // ── Mapas para MiniCalendario ─────────────────────────────────
  const eventosPorFecha = useMemo(() => {
    const map = new Map<string, EventoTipo[]>()
    for (const ev of eventos) {
      const list = map.get(ev.fecha) ?? []
      list.push(ev.tipo)
      map.set(ev.fecha, list)
    }
    return map
  }, [eventos])

  const plansPorFecha = useMemo(() => {
    const map = new Map<string, TipoPlanificacion[]>()
    for (const p of planificaciones) {
      const list = map.get(p.fecha) ?? []
      list.push(p.tipo)
      map.set(p.fecha, list)
    }
    return map
  }, [planificaciones])

  // ── Timeline de compromisos ───────────────────────────────────
  const grupos = groupByDate(eventos)

  function abrirDiaSheet(fecha: string) {
    setDiaSelec(fecha)
    setDiaSheetFecha(fecha)
  }

  function selectDiaCalendario(fecha: string) {
    setDiaSelec(fecha)
    // Si hay eventos comprometidos en esa fecha, también hace scroll
    const el = grupoRefs.current.get(fecha)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Siempre abre el sheet
    setDiaSheetFecha(fecha)
  }

  // Construir EventoDia[] para el DiaSheet de la fecha seleccionada
  const eventosDiaSheet: EventoDia[] = useMemo(() => {
    if (!diaSheetFecha) return []
    return eventos
      .filter(ev => ev.fecha === diaSheetFecha)
      .map(ev => ({
        id:        `${ev.tipo}-${ev.fecha}-${ev.titulo}`,
        tipo:      ev.tipo,
        titulo:    ev.titulo,
        subtitulo: ev.subtitulo,
        emoji:     ev.emoji,
        monto:     ev.monto,
      }))
  }, [eventos, diaSheetFecha])

  return (
    <AppLayout>
      <Header title="Calendario financiero" />

      <div className="px-4 lg:px-0 pt-4 pb-8 space-y-4">

        {/* Toggle de rango */}
        <div className="flex gap-1.5 p-1 bg-night-1 rounded-2xl border border-night-border w-fit mx-auto lg:mx-0">
          {RANGOS.map(r => (
            <button
              key={r}
              onClick={() => { setRango(r); setDiaSelec(null) }}
              className={[
                'px-4 py-1.5 rounded-xl text-xs font-semibold transition-all',
                rango === r
                  ? 'bg-brand-500 text-white shadow-glow-brand'
                  : 'text-slate-500 hover:text-slate-300'
              ].join(' ')}
            >
              {r} días
            </button>
          ))}
        </div>

        {/* Desktop: 2 columnas — panel izquierdo (resumen) + panel derecho (timeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-5 items-start">

          {/* Columna izquierda: Proyección + ¿Qué puedo hacer? + Mini calendario */}
          <div className="space-y-4">
            <ProyeccionCard p={proyeccion} rango={rango} />

            {disponible > 0 && objetivosActivos.length > 0 && (
              <QueHacer disponible={disponible} objetivos={objetivosActivos} />
            )}

            <MiniCalendario
              eventosPorFecha={eventosPorFecha}
              plansPorFecha={plansPorFecha}
              diaSeleccionado={diaSeleccionado}
              onSelectDia={selectDiaCalendario}
            />
          </div>

          {/* Columna derecha: Timeline de compromisos */}
          <div className="space-y-4">
            {grupos.length === 0 ? (
              <div className="rounded-2xl border border-night-border bg-night-1 px-4 py-10 text-center">
                <p className="text-3xl mb-3">📅</p>
                <p className="text-sm font-semibold text-slate-400">Sin compromisos en {rango} días</p>
                <p className="text-xs text-slate-600 mt-1">
                  Toca cualquier día del calendario para planificar.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {grupos.map(([fecha, items]) => (
                    <div
                      key={fecha}
                      ref={setGrupoRef(fecha)}
                      className={[
                        'scroll-mt-4 rounded-2xl border overflow-hidden transition-all cursor-pointer',
                        diaSeleccionado === fecha
                          ? 'border-brand-500/40 shadow-glow-brand'
                          : 'border-night-border'
                      ].join(' ')}
                      onClick={() => abrirDiaSheet(fecha)}
                    >
                      {/* Header del grupo */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-night-2 border-b border-night-border/60">
                        <div>
                          <span className="text-xs font-bold text-white capitalize">
                            {fechaRelativa(fecha)}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            {format(parseISO(fecha), "d 'de' MMMM", { locale: es })}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600">
                          {items.filter(i => i.monto !== null).reduce((s, i) => s + (i.monto ?? 0), 0) > 0
                            ? formatCLP(items.filter(i => i.monto !== null).reduce((s, i) => s + (i.monto ?? 0), 0))
                            : ''
                          }
                        </span>
                      </div>

                      {/* Eventos del día */}
                      <div className="bg-night-1 divide-y divide-night-border/40">
                        {items.map((ev, i) => {
                          const c = TIPO_COLOR[ev.tipo]
                          return (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 bg-night-2 border ${c.border}`}>
                                {ev.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{ev.titulo}</p>
                                {ev.subtitulo && (
                                  <p className="text-[11px] text-slate-500 truncate">{ev.subtitulo}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {ev.monto !== null ? (
                                  <span className={`text-sm font-bold tabular-nums ${ev.delta > 0 ? 'text-ingreso-400' : ev.esEstimado ? 'text-slate-400' : 'text-gasto-400'}`}>
                                    {ev.delta > 0 ? '+' : '−'}
                                    {ev.esEstimado && <span className="font-normal">~</span>}
                                    {formatCLP(ev.monto)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-600 italic">monto ?</span>
                                )}
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${c.badge}`}>
                                  {TIPO_LABEL[ev.tipo]}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {eventos.length > 0 && (
                  <p className="text-[10px] text-slate-500 text-center lg:text-left pb-2">
                    Proyección basada en compromisos conocidos · Sueldo no incluido
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sheet de día */}
      <DiaSheet
        isOpen={diaSheetFecha !== null}
        onClose={() => { setDiaSheetFecha(null); setDiaSelec(null) }}
        fecha={diaSheetFecha ?? format(hoy, 'yyyy-MM-dd')}
        eventos={eventosDiaSheet}
      />
    </AppLayout>
  )
}
