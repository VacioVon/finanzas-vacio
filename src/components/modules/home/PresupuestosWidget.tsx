import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { usePresupuestosMes } from '@/hooks/usePresupuestos'
import { getCurrentMesAnio, labelMesAnio } from '@/utils/periodo'
import { formatCLP } from '@/utils/currency'

export function PresupuestosWidget() {
  const navigate = useNavigate()
  const { mes, anio } = getCurrentMesAnio()
  const { data: presupuestos, isLoading } = usePresupuestosMes(mes, anio)

  if (isLoading) return null

  const total = presupuestos?.length ?? 0

  if (total === 0) {
    return (
      <Card padding="md" className="mx-4">
        <button className="w-full flex items-center gap-3" onClick={() => navigate('/presupuestos')}>
          <span className="text-2xl">🎯</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-900">Presupuestos</p>
            <p className="text-xs text-slate-400">Sin presupuestos para {labelMesAnio(mes, anio)}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </Card>
    )
  }

  const totalPresupuestado = presupuestos!.reduce((s, p) => s + p.monto_presupuestado, 0)
  const totalGastado       = presupuestos!.reduce((s, p) => s + p.gastado, 0)
  const excedidos          = presupuestos!.filter(p => p.excedido).length
  const pct                = totalPresupuestado > 0 ? Math.min(100, (totalGastado / totalPresupuestado) * 100) : 0

  return (
    <Card padding="md" className="mx-4">
      <button className="w-full" onClick={() => navigate('/presupuestos')}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <p className="text-sm font-semibold text-slate-900">Presupuestos</p>
          </div>
          <div className="flex items-center gap-2">
            {excedidos > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger-50 text-danger-700">
                {excedidos} excedido{excedidos > 1 ? 's' : ''}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        </div>

        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${excedidos > 0 ? 'bg-danger-500' : pct >= 80 ? 'bg-warning-500' : 'bg-success-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>{formatCLP(totalGastado)} gastados</span>
          <span>de {formatCLP(totalPresupuestado)}</span>
        </div>
      </button>
    </Card>
  )
}
