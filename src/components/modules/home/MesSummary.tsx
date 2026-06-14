import { Card } from '@/components/ui/Card'
import { formatCLP } from '@/utils/currency'
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

interface MesSummaryProps {
  ingresos:          number
  gastos:            number
  ahorros:           number
  /** Subconjunto de 'ahorros' que proviene de aportes a objetivos (ahorro intencional) */
  ahorrosObjetivos?: number
}

export function MesSummary({
  ingresos,
  gastos,
  ahorros,
  ahorrosObjetivos = 0
}: MesSummaryProps) {
  const ahorrosContables = ahorros - ahorrosObjetivos
  const mostrarDesglose  = ahorrosObjetivos > 0 && ahorrosContables > 0

  return (
    <div className="px-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumen del mes</h3>
      <Card padding="none">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {/* Ingresos */}
          <div className="flex flex-col items-center py-4 px-2">
            <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 text-success-600" />
            </div>
            <p className="text-xs text-slate-400 mb-0.5">Ingresos</p>
            <p className="text-sm font-bold text-success-600">{formatCLP(ingresos)}</p>
          </div>

          {/* Gastos */}
          <div className="flex flex-col items-center py-4 px-2">
            <div className="w-8 h-8 rounded-full bg-danger-50 flex items-center justify-center mb-2">
              <TrendingDown className="h-4 w-4 text-danger-600" />
            </div>
            <p className="text-xs text-slate-400 mb-0.5">Gastos</p>
            <p className="text-sm font-bold text-danger-600">{formatCLP(gastos)}</p>
          </div>

          {/* Ahorros */}
          <div className="flex flex-col items-center py-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center mb-2">
              <PiggyBank className="h-4 w-4 text-primary-600" />
            </div>
            <p className="text-xs text-slate-400 mb-0.5">Ahorros</p>
            <p className="text-sm font-bold text-primary-600">{formatCLP(ahorros)}</p>
          </div>
        </div>

        {/* Desglose solo si hay ambos tipos de ahorro */}
        {mostrarDesglose && (
          <div className="border-t border-slate-100 px-4 py-2.5 flex justify-end gap-4">
            <span className="text-[10px] text-slate-400">
              Movimientos&nbsp;
              <span className="font-semibold text-slate-500">{formatCLP(ahorrosContables)}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Objetivos&nbsp;
              <span className="font-semibold text-primary-500">{formatCLP(ahorrosObjetivos)}</span>
            </span>
          </div>
        )}

        {/* Indicador cuando solo hay aportes a objetivos */}
        {ahorrosObjetivos > 0 && ahorrosContables === 0 && (
          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <span className="text-[10px] text-primary-400">
              🎯 Ahorro intencional en objetivos
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
