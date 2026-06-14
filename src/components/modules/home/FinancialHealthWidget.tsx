import { Card } from '@/components/ui/Card'
import { etiquetaSaludFinanciera } from '@/utils/financial'
import { TrendingUp } from 'lucide-react'

interface FinancialHealthWidgetProps {
  puntaje: number | null
}

export function FinancialHealthWidget({ puntaje }: FinancialHealthWidgetProps) {
  if (puntaje === null) {
    return (
      <div className="px-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Salud Financiera</p>
              <p className="text-sm text-slate-500 mt-1">Sin datos suficientes aún</p>
              <p className="text-xs text-slate-400 mt-0.5">Registra movimientos para calcular tu puntaje</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const { label, color, bgColor } = etiquetaSaludFinanciera(puntaje)
  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference - (puntaje / 100) * circumference

  return (
    <div className="px-4">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Salud Financiera</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-slate-900">{puntaje}</span>
              <span className="text-slate-400 text-sm">/ 100</span>
            </div>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${bgColor} ${color}`}>
              {label}
            </span>
          </div>

          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="22" fill="none" stroke="#F1F5F9" strokeWidth="4" />
              <circle
                cx="26" cy="26" r="22"
                fill="none"
                stroke={puntaje >= 75 ? '#16A34A' : puntaje >= 50 ? '#EA580C' : '#DC2626'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
              {puntaje}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
