import { useState } from 'react'
import { MoreVertical, CheckCircle, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCLP } from '@/utils/currency'
import { fechaFinCuota, fechaProximaCuota, formatMesAnio } from '@/utils/periodo'
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

  const proximaCuota   = !completada
    ? formatMesAnio(fechaProximaCuota(cuota.fecha_inicio, cuota.cuotas_pagadas))
    : null
  const fechaFin       = formatMesAnio(fechaFinCuota(cuota.fecha_inicio, cuota.cuotas_total))

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`¿Eliminar "${cuota.nombre}"?`)) return
    deleteMutation.mutate(cuota.id)
  }

  return (
    <Card padding="sm" className={completada ? 'opacity-70' : ''}>
      {/* Cabecera */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-slate-100">
          {cuota.emoji ?? '🛍️'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 truncate">{cuota.nombre}</p>
            {completada && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-700 flex-shrink-0">
                Completada
              </span>
            )}
            {cuota.para_tercero && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning-50 text-warning-700 flex-shrink-0">
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
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {!completada && (
                  <button
                    onClick={() => { setMenuOpen(false); pagarMutation.mutate(cuota.id) }}
                    disabled={pagarMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-success-700 hover:bg-success-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Registrar cuota pagada
                  </button>
                )}
                {cuota.cuotas_pagadas > 0 && (
                  <button
                    onClick={() => { setMenuOpen(false); deshacerMutation.mutate(cuota.id) }}
                    disabled={deshacerMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-warning-700 hover:bg-warning-50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Deshacer último pago
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onEdit(cuota) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="h-4 w-4 text-slate-400" />
                  Editar
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cuotas */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pendiente</p>
          <p className="text-lg font-bold text-slate-900">{formatCLP(montoPendiente)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">
            {cuota.cuotas_pagadas}/{cuota.cuotas_total} cuotas
          </p>
          <p className="text-xs text-slate-500">{formatCLP(cuota.monto_cuota)}/mes</p>
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

      {/* Metadatos: próxima cuota y fin estimado */}
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-slate-400">Pagado</p>
          <p className="text-xs font-semibold text-success-600 mt-0.5">{formatCLP(montoPagado)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Próxima</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {proximaCuota ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Último pago</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">{fechaFin}</p>
        </div>
      </div>

      {/* Costo financiero real cuando hay comisión */}
      {cuota.comision > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            Costo real ({formatCLP(cuota.monto_total)} + {formatCLP(cuota.comision)} comisión)
          </span>
          <span className="text-xs font-bold text-slate-700">
            {formatCLP(cuota.monto_total + cuota.comision)}
          </span>
        </div>
      )}

      {/* Botón rápido pagar cuota (solo activas, visible en card) */}
      {!completada && (
        <button
          onClick={() => pagarMutation.mutate(cuota.id)}
          disabled={pagarMutation.isPending}
          className="mt-3 w-full py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {pagarMutation.isPending ? 'Registrando…' : `✓ Registrar cuota ${cuota.cuotas_pagadas + 1} de ${cuota.cuotas_total}`}
        </button>
      )}
    </Card>
  )
}
