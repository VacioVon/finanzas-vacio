import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCLP } from '@/utils/currency'
import { useDeleteSuscripcion, useToggleSuscripcion, useAvanzarProximaFecha } from '@/hooks/useSuscripciones'
import { SuscripcionForm } from './SuscripcionForm'
import type { Suscripcion } from '@/types/app.types'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const FRECUENCIA_LABEL: Record<string, string> = {
  mensual:  'Mensual',
  semanal:  'Semanal',
  anual:    'Anual'
}

function diasRestantes(proxima_fecha: string | null): number | null {
  if (!proxima_fecha) return null
  return differenceInDays(parseISO(proxima_fecha), new Date())
}

function badgeDias(dias: number | null) {
  if (dias === null) return null
  if (dias < 0)  return { label: `Vencida hace ${Math.abs(dias)}d`, color: 'bg-danger-50 text-danger-700' }
  if (dias === 0) return { label: 'Hoy', color: 'bg-danger-50 text-danger-700' }
  if (dias <= 3)  return { label: `En ${dias}d`, color: 'bg-warning-50 text-warning-700' }
  if (dias <= 7)  return { label: `En ${dias}d`, color: 'bg-primary-50 text-primary-700' }
  return { label: `En ${dias}d`, color: 'bg-slate-100 text-slate-500' }
}

interface Props { suscripcion: Suscripcion }

export function SuscripcionCard({ suscripcion: s }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const deleteMutation  = useDeleteSuscripcion()
  const toggleMutation  = useToggleSuscripcion()
  const avanzarMutation = useAvanzarProximaFecha()

  const dias  = diasRestantes(s.proxima_fecha)
  const badge = badgeDias(dias)

  function handleDelete() {
    if (!confirm(`¿Eliminar suscripción "${s.nombre}"?`)) return
    deleteMutation.mutate(s.id)
  }

  function handleToggle() {
    toggleMutation.mutate({ id: s.id, activa: !s.activa })
  }

  function handleAvanzar() {
    if (!confirm(`¿Marcar el cobro de "${s.nombre}" como registrado y avanzar a la siguiente fecha?`)) return
    avanzarMutation.mutate(s)
  }

  return (
    <>
      <Card padding="sm" className={!s.activa ? 'opacity-50' : ''}>
        <div className="flex items-center gap-3">
          {/* Ícono */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: `${s.categoria?.color ?? '#6B7280'}18` }}
          >
            {s.emoji ?? s.categoria?.emoji ?? '🔄'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.nombre}</p>
              {!s.activa && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 flex-shrink-0">
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
                  <span className="text-slate-200">·</span>
                </>
              )}
              <span className="text-xs text-slate-400">{FRECUENCIA_LABEL[s.frecuencia]}</span>
              {s.cuenta && (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="text-xs text-slate-400">{s.cuenta.nombre}</span>
                </>
              )}
              {s.proxima_fecha && (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="text-xs text-slate-400">
                    {format(parseISO(s.proxima_fecha), 'd MMM', { locale: es })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Monto + badge + acciones */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-sm font-bold text-slate-900">{formatCLP(s.monto)}</span>
            {badge && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleAvanzar}
            disabled={avanzarMutation.isPending}
            className="flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-800 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Cobro registrado
          </button>
          <div className="flex-1" />
          <button
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
            title={s.activa ? 'Pausar' : 'Activar'}
          >
            {s.activa
              ? <ToggleRight className="h-4 w-4 text-primary-500" />
              : <ToggleLeft  className="h-4 w-4" />
            }
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-danger-50 transition-colors text-slate-400 hover:text-danger-600"
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
    </>
  )
}
