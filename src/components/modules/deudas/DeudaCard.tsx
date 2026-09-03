import { useState } from 'react'
import { MoreVertical, Pencil, Trash2, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { HistorialPagosDeuda } from '@/components/modules/deudas/HistorialPagosDeuda'
import { formatCLP } from '@/utils/currency'
import { useDeleteDeuda, useUpdateEstadoDeuda } from '@/hooks/useDeudas'
import type { Deuda } from '@/types/app.types'

const ESTADO_COLOR = {
  activa:  '#F4645F',
  en_mora: '#FFB703',
  pagada:  '#10D97F',
}

const ESTADO_LABEL = {
  activa:  'Activa',
  en_mora: 'En mora',
  pagada:  'Pagada',
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

interface DeudaCardProps {
  deuda:   Deuda
  onEdit:  (d: Deuda) => void
  onPagar: (d: Deuda) => void
}

export function DeudaCard({ deuda, onEdit, onPagar }: DeudaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const deleteMutation = useDeleteDeuda()
  const estadoMutation = useUpdateEstadoDeuda()

  const color     = ESTADO_COLOR[deuda.estado] ?? '#F4645F'
  const pagado    = deuda.monto_pagado_real    ?? Math.max(0, deuda.monto_total - deuda.monto_pendiente)
  const pendiente = deuda.monto_pendiente_real ?? Math.max(0, deuda.monto_total - pagado)
  const porcentaje = deuda.monto_total > 0
    ? Math.min(100, (pagado / deuda.monto_total) * 100)
    : 0
  const cuotasText = deuda.cuotas_total > 1
    ? `${deuda.cuotas_pagadas} de ${deuda.cuotas_total} cuotas`
    : null

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`¿Eliminar deuda "${deuda.nombre}"?\nNo se puede deshacer.`)) return
    deleteMutation.mutate(deuda.id)
  }

  function handleMarcarPagada() {
    setMenuOpen(false)
    estadoMutation.mutate({ id: deuda.id, estado: 'pagada' })
  }

  function handleMarcarMora() {
    setMenuOpen(false)
    estadoMutation.mutate({ id: deuda.id, estado: 'en_mora' })
  }

  function handleReactivar() {
    setMenuOpen(false)
    estadoMutation.mutate({ id: deuda.id, estado: 'activa' })
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden border"
      style={{
        background:  `linear-gradient(145deg, ${color}0C 0%, #23212C 60%)`,
        borderColor: `${color}28`,
      }}
    >
      {/* Barra de acento superior */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}DD 0%, transparent 70%)` }}
      />

      {/* Franja lateral izquierda */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: `linear-gradient(180deg, ${color}CC, ${color}40)` }}
      />

      <div className="pl-5 pr-4 pt-5 pb-4">

        {/* Cabecera */}
        <div className="flex items-start gap-3">
          <div
            className="size-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
            style={{
              backgroundColor: `${color}18`,
              boxShadow:       `0 0 12px ${color}35`,
            }}
          >
            {deuda.categoria?.emoji ?? '💳'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{deuda.nombre}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {ESTADO_LABEL[deuda.estado]}
              </span>
              {cuotasText && (
                <span className="text-[11px] text-slate-500">{cuotasText}</span>
              )}
            </div>
          </div>

          {/* Menú contextual */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Opciones de deuda"
              className="size-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/8"
            >
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-50 w-48 bg-night-1 rounded-2xl shadow-xl border border-night-border/80 overflow-hidden backdrop-blur-sm">
                  {deuda.estado !== 'pagada' && (
                    <button
                      onClick={() => { setMenuOpen(false); onPagar(deuda) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 text-brand-400" />
                      Registrar pago
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(deuda) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <Pencil className="h-4 w-4 text-slate-400" />
                    Editar
                  </button>
                  {deuda.estado === 'activa' && (
                    <button
                      onClick={handleMarcarMora}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-xp-400 hover:bg-xp-500/10 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Marcar en mora
                    </button>
                  )}
                  {deuda.estado === 'activa' && (
                    <button
                      onClick={handleMarcarPagada}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ingreso-400 hover:bg-ingreso-500/10 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Marcar como pagada
                    </button>
                  )}
                  {(deuda.estado === 'pagada' || deuda.estado === 'en_mora') && (
                    <button
                      onClick={handleReactivar}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-brand-400 hover:bg-brand-500/10 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Reactivar
                    </button>
                  )}
                  <div className="border-t border-night-border/60" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gasto-400 hover:bg-gasto-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Montos */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${color}80` }}>
              Pendiente
            </p>
            <p
              className="text-2xl font-bold tabular-nums leading-tight"
              style={{ color: deuda.estado === 'pagada' ? '#10D97F' : '#F1F5F9' }}
            >
              {formatCLP(pendiente)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500 tabular-nums">
              de {formatCLP(deuda.monto_total)}
            </p>
            <p className="text-[11px] tabular-nums" style={{ color: `${color}90` }}>
              {formatCLP(pagado)} pagado
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-2.5">
          <ProgressBar
            value={pagado}
            max={deuda.monto_total}
            color={deuda.estado === 'en_mora' ? 'orange' : 'green'}
            size="sm"
            showLabel
          />
        </div>

        {/* Metadatos */}
        <div
          className="mt-3 pt-3 border-t grid grid-cols-3 gap-2"
          style={{ borderColor: `${color}15` }}
        >
          <div
            className="rounded-xl p-2 text-center"
            style={{ backgroundColor: `${color}08` }}
          >
            <p className="text-[10px] text-slate-500">Interés</p>
            <p className="text-xs font-bold text-slate-300 mt-0.5">
              {deuda.interes > 0 ? `${deuda.interes}%` : '—'}
            </p>
          </div>
          <div
            className="rounded-xl p-2 text-center"
            style={{ backgroundColor: `${color}08` }}
          >
            <p className="text-[10px] text-slate-500">Cuota</p>
            <p className="text-xs font-bold text-slate-300 tabular-nums mt-0.5">
              {deuda.cuota_mensual ? formatCLP(deuda.cuota_mensual) : '—'}
            </p>
          </div>
          <div
            className="rounded-xl p-2 text-center"
            style={{ backgroundColor: `${color}08` }}
          >
            <p className="text-[10px] text-slate-500">Próx. pago</p>
            <p className="text-xs font-bold text-slate-300 mt-0.5">
              {formatFecha(deuda.fecha_prox_pago)}
            </p>
          </div>
        </div>
      </div>

      {/* Historial de pagos — full-bleed al fondo */}
      <div className="border-t" style={{ borderColor: `${color}15` }}>
        <HistorialPagosDeuda deudaId={deuda.id} />
      </div>
    </div>
  )
}
