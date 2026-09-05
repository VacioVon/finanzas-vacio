import { Pencil, Trash2, CalendarClock, Percent, TrendingUp, TrendingDown } from 'lucide-react'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import type { Cuenta, Valorizacion } from '@/types/app.types'
import { iconoCuenta, labelTipoCuenta } from '@/utils/financial'
import { useDeleteCuenta } from '@/hooks/useCuentas'
import { formatCLP } from '@/utils/currency'

// Color canónico por tipo (fallback si cuenta.color no está definido)
const TIPO_COLOR: Record<string, string> = {
  bancaria:  '#2979FF',
  digital:   '#00C2CB',
  debito:    '#10D97F',
  credito:   '#F4645F',
  efectivo:  '#FFB703',
  inversion: '#9B5DE5',
}

interface CuentaCardProps {
  cuenta:             Cuenta
  onEdit:             (cuenta: Cuenta) => void
  onActualizarValor?: (cuenta: Cuenta) => void
  valorizaciones?:    Valorizacion[]
}

export function CuentaCard({ cuenta, onEdit, onActualizarValor, valorizaciones }: CuentaCardProps) {
  const deleteMutation = useDeleteCuenta()
  const color = cuenta.color || TIPO_COLOR[cuenta.tipo] || '#64748B'

  function handleDelete() {
    if (confirm(`¿Eliminar la cuenta "${cuenta.nombre}"?`)) {
      deleteMutation.mutate(cuenta.id)
    }
  }

  const isCreditCard = cuenta.tipo === 'credito'
  const isInversion  = cuenta.tipo === 'inversion'

  const historial = valorizaciones
    ?.filter(v => v.cuenta_id === cuenta.id)
    .slice(-6) ?? []

  // cupoDisponible es robusto a ambos signos de saldo_actual (la DB puede tener positivo o negativo)
  const cupoDisponible = isCreditCard && cuenta.limite
    ? Math.max(0, cuenta.limite - Math.abs(cuenta.saldo_actual))
    : null

  // Rentabilidad inversión
  const rentabilidad    = isInversion ? cuenta.saldo_actual - cuenta.saldo_inicial : 0
  const rentabilidadPct = isInversion && cuenta.saldo_inicial > 0
    ? (rentabilidad / cuenta.saldo_inicial) * 100
    : 0

  return (
    <div
      className="relative rounded-2xl overflow-hidden border"
      style={{
        background:   `linear-gradient(145deg, ${color}0E 0%, #23212C 55%)`,
        borderColor:  `${color}30`,
      }}
    >
      {/* Barra de acento superior */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}CC 0%, transparent 75%)` }}
      />

      <div className="p-4 pt-5">
        {/* Cabecera: icono + info + balance */}
        <div className="flex items-center gap-3">
          <div
            className="size-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              backgroundColor: `${color}1A`,
              boxShadow:       `0 0 14px ${color}35`,
            }}
          >
            {iconoCuenta(cuenta.tipo)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100">{cuenta.nombre}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: `${color}BB` }}>
              {labelTipoCuenta(cuenta.tipo)}
            </p>
            {cuenta.institucion && (
              <p className="text-[11px] text-slate-500">{cuenta.institucion}</p>
            )}
          </div>

          {/* Balance */}
          <div className="text-right flex-shrink-0">
            {isCreditCard ? (
              <>
                <p className="text-[10px] text-slate-500 mb-0.5">Deuda actual</p>
                <p className="text-base font-bold tabular-nums text-gasto-400">
                  {formatCLP(Math.abs(cuenta.saldo_actual))}
                </p>
              </>
            ) : (
              <>
                <CurrencyDisplay amount={cuenta.saldo_actual} size="sm" />
                {isInversion && cuenta.saldo_inicial > 0 && (
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {rentabilidad >= 0
                      ? <TrendingUp className="h-3 w-3 text-ingreso-400" />
                      : <TrendingDown className="h-3 w-3 text-gasto-400" />
                    }
                    <span className={`text-[10px] font-semibold tabular-nums ${rentabilidad >= 0 ? 'text-ingreso-400' : 'text-gasto-400'}`}>
                      {rentabilidad >= 0 ? '+' : ''}{rentabilidadPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Breakdown cupo — solo tarjetas de crédito */}
        {isCreditCard && cuenta.limite && (
          <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: `${color}20` }}>
            {/* Barra de utilización */}
            {(() => {
              const deuda    = Math.abs(cuenta.saldo_actual)
              const utilPct  = Math.min(100, (deuda / cuenta.limite!) * 100)
              const barColor = utilPct > 80 ? '#F4645F' : utilPct > 50 ? '#FFB703' : '#10D97F'
              return (
                <>
                  <div className="flex h-1.5 bg-night-0 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${utilPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <p className="text-[9px] text-slate-500">Utilizado</p>
                      <p className="text-[11px] font-bold tabular-nums text-gasto-400">
                        {formatCLP(deuda)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">Disponible</p>
                      <p className="text-[11px] font-bold tabular-nums text-ingreso-400">
                        {formatCLP(cupoDisponible ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">Cupo total</p>
                      <p className="text-[11px] font-bold tabular-nums text-slate-300">
                        {formatCLP(cuenta.limite!)}
                      </p>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Metadata tarjeta de crédito */}
        {isCreditCard && (cuenta.dia_facturacion || cuenta.dia_vencimiento || cuenta.pago_minimo_pct) && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: `${color}20` }}>
            {cuenta.dia_facturacion && (
              <div
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                style={{ backgroundColor: `${color}10`, color: `${color}BB` }}
              >
                <CalendarClock className="h-3 w-3" />
                Cierra día {cuenta.dia_facturacion}
              </div>
            )}
            {cuenta.dia_vencimiento && (
              <div
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                style={{ backgroundColor: '#FFB70310', color: '#FFB703BB' }}
              >
                <CalendarClock className="h-3 w-3" />
                Vence día {cuenta.dia_vencimiento}
              </div>
            )}
            {cuenta.pago_minimo_pct && cuenta.pago_minimo_pct > 0 && cuenta.saldo_actual !== 0 && (
              <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-gasto-500/10 text-gasto-400">
                <Percent className="h-3 w-3" />
                Mín: {formatCLP(Math.ceil(Math.abs(cuenta.saldo_actual) * cuenta.pago_minimo_pct / 100))}
              </div>
            )}
          </div>
        )}

        {/* Sección inversión: sparkline + actualizar */}
        {isInversion && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: `${color}20` }}>
            {historial.length >= 2 && (
              <div className="flex items-end gap-0.5 h-8 mb-2.5">
                {historial.map((v, i) => {
                  const max   = Math.max(...historial.map(h => h.valor))
                  const min   = Math.min(...historial.map(h => h.valor))
                  const range = max - min || 1
                  const pct   = ((v.valor - min) / range) * 100
                  const isLast = i === historial.length - 1
                  return (
                    <div
                      key={v.id}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height:          `${Math.max(15, pct)}%`,
                        backgroundColor: isLast ? color : `${color}45`,
                        boxShadow:       isLast ? `0 0 8px ${color}60` : 'none',
                      }}
                    />
                  )
                })}
              </div>
            )}
            <button
              onClick={() => onActualizarValor?.(cuenta)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl border transition-all"
              style={{
                borderColor:     `${color}35`,
                color:           color,
                backgroundColor: `${color}0A`,
              }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Actualizar valor
            </button>
          </div>
        )}

        {/* Acciones */}
        <div
          className="flex items-center justify-end gap-1 mt-3 pt-3 border-t"
          style={{ borderColor: `${color}15` }}
        >
          <button
            onClick={() => onEdit(cuenta)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-gasto-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gasto-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
