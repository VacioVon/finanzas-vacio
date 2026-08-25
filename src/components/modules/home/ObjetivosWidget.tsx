import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useObjetivos } from '@/hooks/useObjetivos'
import { formatCLP } from '@/utils/currency'

export function ObjetivosWidget() {
  const navigate = useNavigate()
  const { data: objetivos, isLoading } = useObjetivos()

  if (isLoading) return null

  const activos = (objetivos ?? []).filter(o => o.estado !== 'completado' && o.monto_actual < o.monto_objetivo)

  if (activos.length === 0) {
    return (
      <Card padding="md" className="mx-4 lg:mx-0">
        <button className="w-full flex items-center gap-3" onClick={() => navigate('/objetivos')}>
          <span className="text-2xl">🏆</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Objetivos de Ahorro</p>
            <p className="text-xs text-slate-500">Sin objetivos activos</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </Card>
    )
  }

  const preview = activos.slice(0, 3)

  return (
    <Card variant="gold" padding="md" className="mx-4 lg:mx-0">
      <button className="w-full mb-3" onClick={() => navigate('/objetivos')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <p className="text-sm font-semibold text-gold-500">Objetivos de Ahorro</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">{activos.length} activos</span>
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </div>
        </div>
      </button>

      <div className="space-y-2.5">
        {preview.map(obj => {
          const pct = obj.monto_objetivo > 0
            ? Math.min(100, (obj.monto_actual / obj.monto_objetivo) * 100)
            : 0
          return (
            <button
              key={obj.id}
              className="w-full text-left"
              onClick={() => navigate('/objetivos')}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{obj.emoji ?? '🎯'}</span>
                <span className="text-xs font-medium text-slate-300 truncate flex-1">{obj.nombre}</span>
                <span className="text-xs text-slate-500 flex-shrink-0">{Math.round(pct)}%</span>
              </div>
              {/* Barra de progreso */}
              <div className="h-1.5 bg-night-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: obj.color }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-slate-500">{formatCLP(obj.monto_actual)}</span>
                <span className="text-[10px] text-slate-500">{formatCLP(obj.monto_objetivo)}</span>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
