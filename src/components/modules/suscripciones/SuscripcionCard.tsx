import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight, CreditCard, CheckCircle2 } from 'lucide-react'
import { formatCLP } from '@/utils/currency'
import { useDeleteSuscripcion, useToggleSuscripcion } from '@/hooks/useSuscripciones'
import type { PagoCompromisoHistorial } from '@/hooks/useSuscripciones'
import { SuscripcionForm } from './SuscripcionForm'
import { PagarCompromisoModal } from './PagarCompromisoModal'
import type { Suscripcion } from '@/types/app.types'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_COLOR: Record<string, string> = {
  servicio:   '#00C2CB',
  gasto_fijo: '#FFB703',
  membresia:  '#9B5DE5',
  seguro:     '#2979FF',
  arriendo:   '#F4645F',
  educacion:  '#10D97F',
  salud:      '#F4645F',
  pareja:     '#9B5DE5',
  mascotas:   '#10D97F',
  otro:       '#64748B',
}

const TIPO_LABEL: Record<string, string> = {
  servicio:   'Servicio',
  gasto_fijo: 'Hogar',
  membresia:  'Membresía',
  seguro:     'Seguro',
  arriendo:   'Arriendo',
  educacion:  'Educación',
  salud:      'Salud',
  pareja:     'Pareja',
  mascotas:   'Mascotas',
  otro:       'Otro',
}

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal:    'Semanal',
  quincenal:  'Quincenal',
  mensual:    'Mensual',
  bimestral:  'Bimestral',
  trimestral: 'Trimestral',
  semestral:  'Semestral',
  anual:      'Anual',
}

function diasRestantes(proxima_fecha: string | null): number | null {
  if (!proxima_fecha) return null
  return differenceInDays(parseISO(proxima_fecha), new Date())
}

function badgeDias(dias: number | null) {
  if (dias === null) return null
  if (dias < 0)   return { label: `Vencida hace ${Math.abs(dias)}d`, bg: '#F4645F18', color: '#F4645F' }
  if (dias === 0) return { label: 'Hoy',                             bg: '#F4645F18', color: '#F4645F' }
  if (dias <= 3)  return { label: `En ${dias}d`,                     bg: '#FFB70318', color: '#FFB703' }
  if (dias <= 7)  return { label: `En ${dias}d`,                     bg: '#2979FF18', color: '#2979FF' }
  return           { label: `En ${dias}d`,                           bg: '#35334430', color: '#64748B' }
}

interface Props {
  suscripcion: Suscripcion
  historial?:  PagoCompromisoHistorial[]
}

export function SuscripcionCard({ suscripcion: s, historial = [] }: Props) {
  const [editOpen,  setEditOpen]  = useState(false)
  const [pagarOpen, setPagarOpen] = useState(false)

  const deleteMutation = useDeleteSuscripcion()
  const toggleMutation = useToggleSuscripcion()

  const dias       = diasRestantes(s.proxima_fecha)
  const badge      = badgeDias(dias)
  const esEstimado = s.monto_tipo === 'estimado'
  const color      = s.activa ? (TIPO_COLOR[s.tipo ?? 'servicio'] ?? '#00C2CB') : '#475569'
  const tipoLabel  = TIPO_LABEL[s.tipo ?? 'servicio'] ?? s.tipo

  // Detectar si ya está pagado para el período actual:
  // si hay pago registrado Y la próxima fecha es futura → ya se pagó este ciclo
  const hoy = new Date()
  const pagadoEstePeriodo = !!(
    s.ultimo_pago_fecha &&
    s.proxima_fecha &&
    differenceInDays(parseISO(s.proxima_fecha), hoy) > 0
  )
  const proximaLabel = s.proxima_fecha
    ? format(parseISO(s.proxima_fecha), 'MMMM', { locale: es })
    : null

  function handleDelete() {
    if (!confirm(`¿Eliminar compromiso "${s.nombre}"?`)) return
    deleteMutation.mutate(s.id)
  }

  function handleToggle() {
    toggleMutation.mutate({ id: s.id, activa: !s.activa })
  }

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden border transition-opacity"
        style={{
          background:  s.activa
            ? `linear-gradient(145deg, ${color}0C 0%, #23212C 65%)`
            : 'transparent',
          borderColor: `${color}25`,
          opacity:     s.activa ? 1 : 0.55,
        }}
      >
        {/* Barra de acento superior */}
        {s.activa && (
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${color}CC 0%, transparent 70%)` }}
          />
        )}

        <div className="p-3.5 pt-5 space-y-0">
          {/* Fila principal */}
          <div className="flex items-center gap-3">
            {/* Ícono */}
            <div
              className="size-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{
                backgroundColor: `${color}18`,
                boxShadow:       s.activa ? `0 0 12px ${color}30` : 'none',
              }}
            >
              {s.emoji ?? s.categoria?.emoji ?? '🔄'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <p className="text-sm font-semibold text-slate-100 truncate">{s.nombre}</p>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  {tipoLabel}
                </span>
                {!s.activa && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-night-3 text-slate-400 flex-shrink-0">
                    Pausada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(s.subcategoria ?? s.categoria) && (
                  <>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {s.subcategoria?.nombre ?? s.categoria?.nombre}
                    </span>
                    <span className="text-slate-700">·</span>
                  </>
                )}
                <span className="text-[11px] text-slate-400">
                  {FRECUENCIA_LABEL[s.frecuencia] ?? s.frecuencia}
                </span>
                {s.cuenta && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-[11px] text-slate-400">{s.cuenta.nombre}</span>
                  </>
                )}
                {s.proxima_fecha && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-[11px] text-slate-400">
                      {format(parseISO(s.proxima_fecha), 'd MMM', { locale: es })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Monto + badge días */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-sm font-bold tabular-nums text-white">
                {esEstimado && <span className="text-slate-400 font-normal text-xs">~</span>}
                {formatCLP(s.monto)}
              </span>
              {badge && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: badge.bg, color: badge.color }}
                >
                  {badge.label}
                </span>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div
            className="flex items-center gap-1 pt-3 mt-3 border-t"
            style={{ borderColor: `${color}15` }}
          >
            {pagadoEstePeriodo ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ color: '#10D97F', backgroundColor: '#10D97F0D' }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pagado
                {proximaLabel && (
                  <span className="text-slate-500 font-normal">· próximo {proximaLabel}</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setPagarOpen(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ color, backgroundColor: `${color}0D` }}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Registrar pago
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              aria-label={s.activa ? 'Pausar' : 'Activar'}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {s.activa
                ? <ToggleRight className="h-4 w-4" style={{ color }} />
                : <ToggleLeft  className="h-4 w-4 text-slate-500" />
              }
            </button>
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Editar"
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              aria-label="Eliminar"
              className="p-1.5 rounded-lg hover:bg-gasto-500/10 transition-colors text-slate-500 hover:text-gasto-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Histórico de pagos */}
        {historial.length > 0 && (
          <div
            className="mx-3.5 pb-3 pt-2 border-t"
            style={{ borderColor: `${color}15` }}
          >
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Pagos anteriores
            </p>
            <div className="flex gap-2 flex-wrap">
              {historial.slice(0, 5).map(p => (
                <div
                  key={p.id}
                  className="flex flex-col items-center px-2 py-1 rounded-lg bg-night-3 border border-night-border/50"
                >
                  <span className="text-[9px] text-slate-500 capitalize leading-none">
                    {format(parseISO(p.fecha), 'MMM', { locale: es })}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-slate-300 leading-snug">
                    {formatCLP(p.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SuscripcionForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editing={s}
      />

      <PagarCompromisoModal
        isOpen={pagarOpen}
        onClose={() => setPagarOpen(false)}
        compromiso={s}
      />
    </>
  )
}
