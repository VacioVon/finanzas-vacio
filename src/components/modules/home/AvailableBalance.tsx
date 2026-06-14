import { useState } from 'react'
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import { useCuentas } from '@/hooks/useCuentas'
import { calcularDineroDisponible } from '@/utils/financial'
import { iconoCuenta } from '@/utils/financial'
import { formatCLP } from '@/utils/currency'

export function AvailableBalance() {
  const { data: cuentas, isLoading } = useCuentas()
  const [hidden, setHidden] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return <div className="px-4"><SkeletonCard /></div>

  const cuentasFiltradas = (cuentas ?? []).filter(
    c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito'
  )
  const total = calcularDineroDisponible(cuentas ?? [])

  return (
    <div className="px-4">
      <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-card-lg">
        <div className="flex items-start justify-between mb-1">
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wide">
            Dinero Disponible
          </p>
          <button
            onClick={() => setHidden(h => !h)}
            className="text-primary-200 hover:text-white transition-colors"
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-1 mb-3">
          {hidden ? (
            <div className="h-9 flex items-center">
              <div className="bg-white/20 rounded-lg h-7 w-36" />
            </div>
          ) : (
            <CurrencyDisplay amount={total} size="2xl" className="text-white font-bold" />
          )}
        </div>

        {cuentasFiltradas.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-primary-200 text-xs hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Ocultar desglose' : `Ver desglose (${cuentasFiltradas.length} cuentas)`}
          </button>
        )}

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-white/20 pt-3">
            {cuentasFiltradas.map(cuenta => (
              <div key={cuenta.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{iconoCuenta(cuenta.tipo)}</span>
                  <span className="text-primary-100 text-xs">{cuenta.nombre}</span>
                </div>
                <span className="text-white text-xs font-medium">
                  {hidden ? '•••••' : formatCLP(cuenta.saldo_actual)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
