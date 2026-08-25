import { useState } from 'react'
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import { useCuentas } from '@/hooks/useCuentas'
import { calcularDineroDisponible } from '@/utils/financial'
import { iconoCuenta } from '@/utils/financial'
import { formatCLP } from '@/utils/currency'

export function AvailableBalance() {
  const { data: cuentas, isLoading } = useCuentas()
  const [hidden,   setHidden]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return <div className="px-4 lg:px-0"><SkeletonCard /></div>

  const cuentasFiltradas = (cuentas ?? []).filter(
    c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito'
  )
  const total = calcularDineroDisponible(cuentas ?? [])

  // Color semántico del indicador según estado del saldo
  const isPositive = total > 0
  const isNegative = total < 0
  const indicatorColor = isNegative ? 'text-gasto-400' : isPositive ? 'text-ingreso-400' : 'text-slate-400'
  const indicatorLabel = isNegative ? 'saldo negativo' : isPositive ? 'disponible' : 'sin movimientos'

  return (
    <div className="px-4 lg:px-0">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1245C4 0%, #2979FF 50%, #3F84FF 100%)',
          boxShadow: '0 0 32px rgba(41,121,255,0.25), 0 4px 16px rgba(0,0,0,0.3)'
        }}
      >
        {/* Nebulosa cósmica — ambientación, no protagonista */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 90% -10%, rgba(155,93,229,0.20) 0%, transparent 60%)'
          }}
        />

        <div className="relative p-5 lg:p-6">
          <div className="flex items-start justify-between mb-1">
            <p className="text-blue-200 text-[11px] font-semibold uppercase tracking-widest">
              Dinero Disponible
            </p>
            <button
              onClick={() => setHidden(h => !h)}
              aria-label={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}
              className="text-blue-200 hover:text-white transition-colors"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Monto — protagonista en blanco, grande */}
          <div className="mt-2 mb-1">
            {hidden ? (
              <div className="h-10 flex items-center">
                <div className="bg-white/20 rounded-lg h-8 w-40" />
              </div>
            ) : (
              <CurrencyDisplay amount={total} size="2xl" className="text-white font-extrabold tabular-nums" />
            )}
          </div>

          {/* Indicador semántico secundario */}
          {!hidden && (
            <p className={`text-xs font-medium mb-3 ${indicatorColor}`}>
              {indicatorLabel}
            </p>
          )}

          {cuentasFiltradas.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-blue-200/80 text-xs hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Ocultar desglose' : `${cuentasFiltradas.length} cuentas`}
            </button>
          )}

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-white/15 pt-3">
              {cuentasFiltradas.map(cuenta => (
                <div key={cuenta.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{iconoCuenta(cuenta.tipo)}</span>
                    <span className="text-blue-100/90 text-xs">{cuenta.nombre}</span>
                  </div>
                  <span className="text-white text-xs font-medium tabular-nums">
                    {hidden ? '•••••' : formatCLP(cuenta.saldo_actual)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
