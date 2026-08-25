import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCLP } from '@/utils/currency'
import { useDeleteSuscripcion, useToggleSuscripcion } from '@/hooks/useSuscripciones'
import { SuscripcionForm } from './SuscripcionForm'
import { PagarCompromisoModal } from './PagarCompromisoModal'
import type { Suscripcion } from '@/types/app.types'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal:    'Semanal',
  quincenal:  'Quincenal',
  mensual:    'Mensual',
  bimestral:  'Bimestral',
  trimestral: 'Trimestral',
  semestral:  'Semestral',
  anual:      'Anual',
}

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  servicio:   { label: 'Servicio',    cls: 'bg-mover-500/15 text-mover-400'  },
  gasto_fijo: { label: 'Gasto fijo',  cls: 'bg-xp-500/15 text-xp-400'       },
}

function diasRestantes(proxima_fecha: string | null): number | null {
  if (!proxima_fecha) return null
  return differenceInDays(parseISO(proxima_fecha), new Date())
}

function badgeDias(dias: number | null) {
  if (dias === null) return null
  if (dias < 0)   return { label: `Vencida hace ${Math.abs(dias)}d`, color: 'bg-gasto-500/15 text-gasto-400'  }
  if (dias === 0) return { label: 'Hoy',                             color: 'bg-gasto-500/15 text-gasto-400'  }
  if (dias <= 3)  return { label: `En ${dias}d`,                     color: 'bg-xp-500/15 text-xp-400'        }
  if (dias <= 7)  return { label: `En ${dias}d`,                     color: 'bg-brand-500/15 text-brand-400'  }
  return           { label: `En ${dias}d`,                           color: 'bg-night-3 text-slate-500'       }
}

interface Props { suscripcion: Suscripcion }

export function SuscripcionCard({ suscripcion: s }: Props) {
  const [editOpen,  setEditOpen]  = useState(false)
  const [pagarOpen, setPagarOpen] = useState(false)

  const deleteMutation = useDeleteSuscripcion()
  const toggleMutation = useToggleSuscripcion()

  const dias     = diasRestantes(s.proxima_fecha)
  const badge    = badgeDias(dias)
  const tipoBadge = TIPO_BADGE[s.tipo ?? 'servicio']
  const esEstimado = s.monto_tipo === 'estimado'

  function handleDelete() {
    if (!confirm(`¿Eliminar compromiso "${s.nombre}"?`)) return
    deleteMutation.mutate(s.id)
  }

  function handleToggle() {
    toggleMutation.mutate({ id: s.id, activa: !s.activa })
  }

  return (
    <>
      <Card padding="sm" className={!s.activa ? 'opacity-50' : ''}>
        <div className="flex items-center gap-3">
          {/* Ícono */}
          <div
            className="size-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: `${s.categoria?.color ?? '#6B7280'}18` }}
          >
            {s.emoji ?? s.categoria?.emoji ?? '🔄'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-200 truncate">{s.nombre}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${tipoBadge.cls}`}>
                {tipoBadge.label}
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
                  <span className="text-xs text-slate-500 font-medium">
                    {s.subcategoria?.nombre ?? s.categoria?.nombre}
                  </span>
                  <span className="text-slate-600">·</span>
                </>
              )}
              <span className="text-xs text-slate-400">{FRECUENCIA_LABEL[s.frecuencia] ?? s.frecuencia}</span>
              {s.cuenta && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400">{s.cuenta.nombre}</span>
                </>
              )}
              {s.proxima_fecha && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400">
                    {format(parseISO(s.proxima_fecha), 'd MMM', { locale: es })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Monto + badge */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-sm font-bold text-white tabular-nums">
              {esEstimado && <span className="text-slate-400 font-normal">~</span>}
              {formatCLP(s.monto)}
            </span>
            {badge && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-night-border/40">
          <button
            onClick={() => setPagarOpen(true)}
            className="flex items-center gap-1 text-[11px] text-ingreso-400 hover:text-ingreso-300 px-2 py-1 rounded-lg hover:bg-ingreso-500/10 transition-colors"
          >
            <CreditCard className="h-3 w-3" />
            Registrar pago
          </button>
          <div className="flex-1" />
          <button
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            aria-label={s.activa ? 'Pausar' : 'Activar'}
            className="p-1.5 rounded-lg hover:bg-night-3 transition-colors"
          >
            {s.activa
              ? <ToggleRight className="h-4 w-4 text-brand-400" />
              : <ToggleLeft  className="h-4 w-4 text-slate-500" />
            }
          </button>
          <button
            onClick={() => setEditOpen(true)}
            aria-label="Editar"
            className="p-1.5 rounded-lg hover:bg-night-3 transition-colors text-slate-400"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            aria-label="Eliminar"
            className="p-1.5 rounded-lg hover:bg-gasto-500/10 transition-colors text-slate-400 hover:text-gasto-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

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
