import { useNavigate } from 'react-router-dom'
import { ChevronRight, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatCLP } from '@/utils/currency'
import { useDeudas } from '@/hooks/useDeudas'

export function DeudasWidget() {
  const navigate            = useNavigate()
  const { data: deudas, isLoading } = useDeudas()

  if (isLoading) {
    return <div className="px-4 lg:px-0"><SkeletonCard /></div>
  }

  const activas = (deudas ?? []).filter(d => d.estado === 'activa')
  const enMora  = (deudas ?? []).filter(d => d.estado === 'en_mora')
  const todas   = [...enMora, ...activas]

  const totalPendiente = todas.reduce((s, d) => s + (d.monto_pendiente_real ?? Math.max(0, d.monto_total - (d.monto_pagado_real ?? 0))), 0)

  if (todas.length === 0) {
    return (
      <div className="px-4 lg:px-0">
        <button
          onClick={() => navigate('/deudas')}
          className="w-full flex items-center justify-between mb-3 group"
        >
          <h3 className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">Deudas</h3>
          <span className="text-xs text-brand-400 font-medium flex items-center gap-0.5 group-hover:text-brand-300 transition-colors">
            Ver todas <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
        <Card padding="sm">
          <p className="text-sm text-slate-500 text-center py-3">Sin deudas activas 🎉</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4">
      {/* Header — área completa navegable */}
      <button
        onClick={() => navigate('/deudas')}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h3 className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">Deudas</h3>
        <span className="text-xs text-brand-400 font-medium flex items-center gap-0.5 group-hover:text-brand-300 transition-colors">
          Ver todas <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <Card padding="none" className="border-t-[3px] border-t-gasto-400/60">
        {/* Resumen total */}
        <div className="px-4 py-3 border-b border-night-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gasto-400" />
            <span className="text-xs text-slate-500">{todas.length} deuda{todas.length !== 1 ? 's' : ''} activa{todas.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-sm font-bold text-gasto-400">{formatCLP(totalPendiente)}</span>
        </div>

        {/* Filas de deuda — cada una navegable */}
        {todas.slice(0, 3).map((deuda, i) => {
          const pagado  = deuda.monto_pagado_real ?? Math.max(0, deuda.monto_total - deuda.monto_pendiente)
          const pct     = deuda.monto_total > 0
            ? Math.min(100, (pagado / deuda.monto_total) * 100)
            : 0

          return (
            <button
              key={deuda.id}
              onClick={() => navigate('/deudas')}
              className={[
                'w-full px-4 py-3 flex items-center gap-3 hover:bg-night-3/40 active:bg-night-3/60 transition-colors text-left',
                i < Math.min(todas.length, 3) - 1 ? 'border-b border-night-border/40' : ''
              ].join(' ')}
            >
              <div
                className="size-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: `${deuda.categoria?.color ?? '#6B7280'}20` }}
              >
                {deuda.categoria?.emoji ?? '💳'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300 truncate">{deuda.nombre}</p>
                  <p className="text-xs font-bold text-gasto-400 flex-shrink-0 ml-2">
                    {formatCLP(deuda.monto_pendiente_real ?? Math.max(0, deuda.monto_total - pagado))}
                  </p>
                </div>
                <div className="mt-1 h-1 bg-night-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ingreso-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          )
        })}

        {todas.length > 3 && (
          <button
            onClick={() => navigate('/deudas')}
            className="w-full py-2.5 text-xs text-brand-400 font-medium border-t border-night-border/40 hover:bg-night-3/50 active:bg-night-3/70 transition-colors rounded-b-2xl"
          >
            Ver {todas.length - 3} más
          </button>
        )}
      </Card>
    </div>
  )
}
