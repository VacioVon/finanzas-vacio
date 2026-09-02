import { useState } from 'react'
import { MoreVertical, CheckCircle, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCLP } from '@/utils/currency'
import { fechaFinCuota, fechaProximaCuota, formatMesAnio } from '@/utils/periodo'
import { calcularTCT } from '@/utils/financial'
import { usePagarCuota, useDeshacerPagoCuota, useDeleteCuota } from '@/hooks/useCuotas'
import type { CuotaCredito } from '@/types/app.types'

interface CuotaCardProps {
  cuota:   CuotaCredito
  onEdit:  (c: CuotaCredito) => void
}

export function CuotaCard({ cuota, onEdit }: CuotaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const pagarMutation    = usePagarCuota()
  const deshacerMutation = useDeshacerPagoCuota()
  const deleteMutation   = useDeleteCuota()

  const pendientes     = cuota.cuotas_total - cuota.cuotas_pagadas
  const montoPagado    = cuota.monto_cuota * cuota.cuotas_pagadas
  const montoPendiente = cuota.monto_cuota * pendientes
  const completada     = cuota.estado === 'completada'
  const tct            = calcularTCT(cuota.monto_total, cuota.interes, cuota.comision, cuota.cuotas_total)

  const proximaCuota = !completada
    ? formatMesAnio(fechaProximaCuota(cuota.fecha_inicio, cuota.cuotas_pagadas))
    : null
  const fechaFin = formatMesAnio(fechaFinCuota(cuota.fecha_inicio, cuota.cuotas_total))

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`¿Eliminar "${cuota.nombre}"?`)) return
    deleteMutation.mutate(cuota.id)
  }

  const borderL = completada
    ? 'border-l-[3px] border-l-ingreso-400/60'
    : 'border-l-[3px] border-l-brand-400'

  return (
    <Card padding="sm" className={`${borderL} ${completada ? 'opacity-70' : ''}`}>
      {/* Cabecera */}
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-night-3">
          {cuota.emoji ?? '🛍️'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-200 truncate">{cuota.nombre}</p>
            {completada && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ingreso-500/15 text-ingreso-400 flex-shrink-0">
                Completada
              </span>
            )}
            {cuota.para_tercero && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-xp-500/15 text-xp-400 flex-shrink-0">
                👥{cuota.tercero_nombre ? ` ${cuota.tercero_nombre}` : ' Tercero'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {cuota.cuenta?.nombre ?? 'Tarjeta'} ·{' '}
            {cuota.interes > 0 ? `${cuota.interes}% interés` : 'Sin interés'}
            {cuota.comision > 0 && ` · comisión ${formatCLP(cuota.comision)}`}
          </p>
        </div>

        {/* Menú */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Opciones de cuota"
            className="size-7 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 w-48 bg-night-1 rounded-2xl shadow-lg border border-night-border overflow-hidden">
                {!completada && (
                  <button
                    onClick={() => { setMenuOpen(false); pagarMutation.mutate(cuota.id) }}
                    disabled={pagarMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ingreso-400 hover:bg-ingreso-500/10 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Registrar cuota pagada
                  </button>
                )}
                {cuota.cuotas_pagadas > 0 && (
                  <button
                    onClick={() => { setMenuOpen(false); deshacerMutation.mutate(cuota.id) }}
                    disabled={deshacerMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-xp-400 hover:bg-xp-500/10 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Deshacer último pago
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onEdit(cuota) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-night-3/60 transition-colors"
                >
                  <Pencil className="h-4 w-4 text-slate-400" />
                  Editar
                </button>
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
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pendiente</p>
          <p className="text-lg font-bold text-white tabular-nums">{formatCLP(montoPendiente)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 tabular-nums">
            {cuota.cuotas_pagadas}/{cuota.cuotas_total} cuotas
          </p>
          <p className="text-xs text-slate-500 tabular-nums">{formatCLP(cuota.monto_cuota)}/mes</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2">
        <ProgressBar
          value={cuota.cuotas_pagadas}
          max={cuota.cuotas_total}
          color={completada ? 'green' : 'blue'}
          size="sm"
          showLabel
        />
      </div>

      {/* Metadatos */}
      <div className="mt-3 pt-3 border-t border-night-border/40 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-slate-500">Pagado</p>
          <p className="text-xs font-semibold text-ingreso-400 tabular-nums mt-0.5">{formatCLP(montoPagado)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Próxima</p>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">{proximaCuota ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Último pago</p>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">{fechaFin}</p>
        </div>
      </div>

      {/* TCT y costo financiero real */}
      {tct !== null && (
        <div className="mt-2 pt-2 border-t border-night-border/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Tasa de Costo Total (TCT)</span>
            <span className="text-xs font-bold text-gasto-400 tabular-nums">{tct}% anual</span>
          </div>
          {cuota.comision > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Costo total ({formatCLP(cuota.monto_total)} + {formatCLP(cuota.comision)} comisión)
              </span>
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                {formatCLP(cuota.monto_total + cuota.comision)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Botón rápido pagar cuota */}
      {!completada && (
        <button
          onClick={() => pagarMutation.mutate(cuota.id)}
          disabled={pagarMutation.isPending}
          className="mt-3 w-full py-2 text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/25 rounded-xl hover:bg-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {pagarMutation.isPending ? 'Registrando…' : `✓ Registrar cuota ${cuota.cuotas_pagadas + 1} de ${cuota.cuotas_total}`}
        </button>
      )}
    </Card>
  )
}
