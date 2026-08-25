import { Card } from '@/components/ui/Card'
import { formatCLP } from '@/utils/currency'
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

interface MesSummaryProps {
  ingresos:          number
  gastos:            number
  ahorros:           number
  ahorrosObjetivos?: number
}

export function MesSummary({ ingresos, gastos, ahorros, ahorrosObjetivos = 0 }: MesSummaryProps) {
  const ahorrosContables = ahorros - ahorrosObjetivos
  const mostrarDesglose  = ahorrosObjetivos > 0 && ahorrosContables > 0

  return (
    <div className="px-4 lg:px-0">
      <h3 className="text-sm font-semibold text-slate-400 mb-3">Resumen del mes</h3>
      <Card padding="none">
        <div className="grid grid-cols-3 divide-x divide-night-border/40">
          {/* Ingresos */}
          <div className="flex flex-col items-center py-4 px-2">
            <div className="w-8 h-8 rounded-full bg-ingreso-500/15 flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 text-ingreso-400" />
            </div>
            <p className="text-xs text-slate-500 mb-0.5">Ingresos</p>
            <p className="text-sm font-bold text-ingreso-400 tabular-nums">{formatCLP(ingresos)}</p>
          </div>

          {/* Gastos */}
          <div className="flex flex-col items-center py-4 px-2">
            <div className="w-8 h-8 rounded-full bg-gasto-500/15 flex items-center justify-center mb-2">
              <TrendingDown className="h-4 w-4 text-gasto-400" />
            </div>
            <p className="text-xs text-slate-500 mb-0.5">Gastos</p>
            <p className="text-sm font-bold text-gasto-400 tabular-nums">{formatCLP(gastos)}</p>
          </div>

          {/* Ahorros */}
          <div className="flex flex-col items-center py-4 px-2">
            <div className="w-8 h-8 rounded-full bg-ahorro-500/15 flex items-center justify-center mb-2">
              <PiggyBank className="h-4 w-4 text-ahorro-400" />
            </div>
            <p className="text-xs text-slate-500 mb-0.5">Ahorros</p>
            <p className="text-sm font-bold text-ahorro-400 tabular-nums">{formatCLP(ahorros)}</p>
          </div>
        </div>

        {mostrarDesglose && (
          <div className="border-t border-night-border/40 px-4 py-2.5 flex justify-end gap-4">
            <span className="text-[10px] text-slate-500">
              Movimientos&nbsp;
              <span className="font-semibold text-slate-400">{formatCLP(ahorrosContables)}</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Objetivos&nbsp;
              <span className="font-semibold text-ahorro-400">{formatCLP(ahorrosObjetivos)}</span>
            </span>
          </div>
        )}

        {ahorrosObjetivos > 0 && ahorrosContables === 0 && (
          <div className="border-t border-night-border/40 px-4 py-2 text-center">
            <span className="text-[10px] text-ahorro-400">🎯 Ahorro intencional en objetivos</span>
          </div>
        )}
      </Card>
    </div>
  )
}
