import { useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { formatCLP } from '@/utils/currency'
import { useSuscripciones } from '@/hooks/useSuscripciones'
import { useCuotas } from '@/hooks/useCuotas'
import { useDeudas } from '@/hooks/useDeudas'
import { useAuthStore } from '@/store/authStore'
import {
  addDays, addMonths, differenceInDays, format, parseISO, setDate
} from 'date-fns'
import { es } from 'date-fns/locale'

type EventoTipo = 'suscripcion' | 'cuota' | 'deuda' | 'sueldo'

interface EventoCalendario {
  fecha:       string   // 'YYYY-MM-DD'
  tipo:        EventoTipo
  emoji:       string
  titulo:      string
  subtitulo?:  string
  monto?:      number
  colorClass:  string
}

function fechaLabel(fechaStr: string): string {
  const hoy    = new Date()
  const fecha  = parseISO(fechaStr)
  const dias   = differenceInDays(fecha, hoy)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias < 7)   return format(fecha, 'EEEE', { locale: es })
  return format(fecha, 'd MMMM', { locale: es })
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

export function CalendarioPage() {
  const { profile }                      = useAuthStore()
  const { data: suscripciones = [] }     = useSuscripciones()
  const { data: cuotas = [] }            = useCuotas()
  const { data: deudas = [] }            = useDeudas()

  const hoy    = new Date()
  const limite = addDays(hoy, 30)

  const eventos = useMemo<EventoCalendario[]>(() => {
    const lista: EventoCalendario[] = []

    // ── Fecha de sueldo ────────────────────────────────────────
    if (profile?.fecha_sueldo) {
      let fechaSueldo = setDate(hoy, profile.fecha_sueldo)
      if (fechaSueldo < hoy) fechaSueldo = addMonths(fechaSueldo, 1)
      if (fechaSueldo <= limite) {
        lista.push({
          fecha:      format(fechaSueldo, 'yyyy-MM-dd'),
          tipo:       'sueldo',
          emoji:      '💵',
          titulo:     'Día de sueldo',
          subtitulo:  `Día ${profile.fecha_sueldo} de cada mes`,
          colorClass: 'bg-success-50 text-success-700'
        })
      }
    }

    // ── Suscripciones activas ──────────────────────────────────
    for (const s of suscripciones) {
      if (!s.activa || !s.proxima_fecha) continue
      const fecha = parseISO(s.proxima_fecha)
      if (fecha >= hoy && fecha <= limite) {
        lista.push({
          fecha:      s.proxima_fecha,
          tipo:       'suscripcion',
          emoji:      s.emoji ?? '🔄',
          titulo:     s.nombre,
          subtitulo:  s.cuenta?.nombre,
          monto:      s.monto,
          colorClass: 'bg-primary-50 text-primary-700'
        })
      }
    }

    // ── Cuotas activas — próximo pago ──────────────────────────
    for (const c of cuotas) {
      if (c.estado !== 'activa') continue
      // Estimamos la fecha del próximo pago: fecha_inicio + cuotas_pagadas meses
      const fechaBase   = parseISO(c.fecha_inicio)
      const proximoPago = addMonths(fechaBase, c.cuotas_pagadas)
      if (proximoPago >= hoy && proximoPago <= limite) {
        lista.push({
          fecha:      format(proximoPago, 'yyyy-MM-dd'),
          tipo:       'cuota',
          emoji:      c.emoji ?? '💳',
          titulo:     c.nombre,
          subtitulo:  `Cuota ${c.cuotas_pagadas + 1} de ${c.cuotas_total}`,
          monto:      c.monto_cuota,
          colorClass: 'bg-warning-50 text-warning-700'
        })
      }
    }

    // ── Deudas activas — próxima fecha de pago ─────────────────
    for (const d of deudas) {
      if (d.estado !== 'activa' || !d.fecha_prox_pago) continue
      const fecha = parseISO(d.fecha_prox_pago)
      if (fecha >= hoy && fecha <= limite) {
        lista.push({
          fecha:      d.fecha_prox_pago,
          tipo:       'deuda',
          emoji:      '🏦',
          titulo:     d.nombre,
          subtitulo:  d.cuota_mensual ? undefined : 'Pago libre',
          monto:      d.cuota_mensual ?? undefined,
          colorClass: 'bg-danger-50 text-danger-700'
        })
      }
    }

    return lista
  }, [profile, suscripciones, cuotas, deudas, hoy, limite])

  const grupos = groupByDate(eventos)

  const totalProximos = eventos.reduce((s, e) => s + (e.monto ?? 0), 0)

  return (
    <AppLayout>
      <Header title="Próximos 30 días" />

      <div className="px-4 pt-4 space-y-4">

        {/* Resumen */}
        {eventos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Compromisos identificados</p>
              <p className="text-xl font-bold text-slate-900">{formatCLP(Math.round(totalProximos))}</p>
            </div>
            <p className="text-xs text-slate-400">{eventos.length} evento{eventos.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {grupos.length === 0 ? (
          <Card padding="md">
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm font-semibold text-slate-700">Sin compromisos próximos</p>
              <p className="text-xs text-slate-400 mt-1">
                Aquí aparecerán cobros de suscripciones, cuotas y pagos de deudas para los próximos 30 días.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {grupos.map(([fecha, items]) => (
              <div key={fecha}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
                  {fechaLabel(fecha)}
                  <span className="font-normal text-slate-300 ml-2 normal-case">
                    {format(parseISO(fecha), 'd MMM', { locale: es })}
                  </span>
                </p>
                <div className="space-y-2">
                  {items.map((ev, i) => (
                    <Card key={i} padding="sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${ev.colorClass.split(' ')[0]}`}>
                          {ev.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{ev.titulo}</p>
                          {ev.subtitulo && (
                            <p className="text-xs text-slate-400">{ev.subtitulo}</p>
                          )}
                        </div>
                        {ev.monto !== undefined && ev.monto > 0 && (
                          <p className="text-sm font-bold text-slate-800 flex-shrink-0">
                            {formatCLP(ev.monto)}
                          </p>
                        )}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${ev.colorClass}`}>
                          {ev.tipo === 'sueldo'       ? 'Ingreso'
                           : ev.tipo === 'suscripcion' ? 'Suscripción'
                           : ev.tipo === 'cuota'       ? 'Cuota'
                           :                             'Deuda'}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
