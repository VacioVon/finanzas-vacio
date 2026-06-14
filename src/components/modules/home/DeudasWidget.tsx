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
    return <div className="px-4"><SkeletonCard /></div>
  }

  const activas = (deudas ?? []).filter(d => d.estado === 'activa')
  const enMora  = (deudas ?? []).filter(d => d.estado === 'en_mora')
  const todas   = [...enMora, ...activas]

  const totalPendiente = todas.reduce((s, d) => s + d.monto_pendiente, 0)

  if (todas.length === 0) {
    return (
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Deudas</h3>
          <button
            onClick={() => navigate('/deudas')}
            className="text-xs text-primary-600 font-medium flex items-center gap-0.5"
          >
            Ver todas <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <Card padding="sm">
          <p className="text-sm text-slate-400 text-center py-3">Sin deudas activas 🎉</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Deudas</h3>
        <button
          onClick={() => navigate('/deudas')}
          className="text-xs text-primary-600 font-medium flex items-center gap-0.5"
        >
          Ver todas <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <Card padding="none">
        {/* Resumen total */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-danger-500" />
            <span className="text-xs text-slate-500">{todas.length} deuda{todas.length !== 1 ? 's' : ''} activa{todas.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-sm font-bold text-danger-600">{formatCLP(totalPendiente)}</span>
        </div>

        {/* Lista compacta (máx. 3) */}
        {todas.slice(0, 3).map((deuda, i) => {
          const pagado  = deuda.monto_total - deuda.monto_pendiente
          const pct     = deuda.monto_total > 0
            ? Math.min(100, (pagado / deuda.monto_total) * 100)
            : 0

          return (
            <div
              key={deuda.id}
              className={`px-4 py-3 flex items-center gap-3 ${i < Math.min(todas.length, 3) - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: `${deuda.categoria?.color ?? '#6B7280'}20` }}
              >
                {deuda.categoria?.emoji ?? '💳'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 truncate">{deuda.nombre}</p>
                  <p className="text-xs font-bold text-danger-600 flex-shrink-0 ml-2">
                    {formatCLP(deuda.monto_pendiente)}
                  </p>
                </div>
                {/* Barra de progreso mini */}
                <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {todas.length > 3 && (
          <button
            onClick={() => navigate('/deudas')}
            className="w-full py-2.5 text-xs text-primary-600 font-medium border-t border-slate-100 hover:bg-slate-50 transition-colors rounded-b-2xl"
          >
            Ver {todas.length - 3} más
          </button>
        )}
      </Card>
    </div>
  )
}
