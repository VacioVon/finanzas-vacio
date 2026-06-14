import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatCLP } from '@/utils/currency'
import { fechaProximaCuota, formatMesAnio } from '@/utils/periodo'
import { useCuotas } from '@/hooks/useCuotas'

export function CuotasWidget() {
  const navigate = useNavigate()
  const { data: cuotas, isLoading } = useCuotas()

  if (isLoading) return <div className="px-4"><SkeletonCard /></div>

  const activas = (cuotas ?? []).filter(c => c.estado === 'activa')

  // Compromiso mensual total = suma de cuotas pendientes activas
  const compromisoMensual = activas.reduce((s, c) => s + c.monto_cuota, 0)
  const totalPendiente    = activas.reduce((s, c) => s + c.monto_cuota * (c.cuotas_total - c.cuotas_pagadas), 0)

  if (activas.length === 0) return null   // no mostrar widget si no hay cuotas

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Compras en cuotas</h3>
        <button
          onClick={() => navigate('/cuotas')}
          className="text-xs text-primary-600 font-medium flex items-center gap-0.5"
        >
          Ver todas <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <Card padding="none">
        {/* Resumen */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400">Cuota mensual total</p>
            <p className="text-sm font-bold text-slate-800">{formatCLP(compromisoMensual)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Pendiente total</p>
            <p className="text-xs font-semibold text-danger-600">{formatCLP(totalPendiente)}</p>
          </div>
        </div>

        {/* Lista compacta (máx. 3) */}
        {activas.slice(0, 3).map((cuota, i) => {
          const pendientes   = cuota.cuotas_total - cuota.cuotas_pagadas
          const pct          = Math.min(100, (cuota.cuotas_pagadas / cuota.cuotas_total) * 100)
          const proxima      = formatMesAnio(fechaProximaCuota(cuota.fecha_inicio, cuota.cuotas_pagadas))

          return (
            <div
              key={cuota.id}
              className={`px-4 py-3 flex items-center gap-3 ${i < Math.min(activas.length, 3) - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="text-xl flex-shrink-0">{cuota.emoji ?? '🛍️'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 truncate">{cuota.nombre}</p>
                  <p className="text-xs text-slate-500 flex-shrink-0 ml-2">
                    {pendientes} cuota{pendientes !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{proxima}</span>
                </div>
              </div>
            </div>
          )
        })}

        {activas.length > 3 && (
          <button
            onClick={() => navigate('/cuotas')}
            className="w-full py-2.5 text-xs text-primary-600 font-medium border-t border-slate-100 hover:bg-slate-50 transition-colors rounded-b-2xl"
          >
            Ver {activas.length - 3} más
          </button>
        )}
      </Card>
    </div>
  )
}
