import { useEffect, useRef } from 'react'
import { formatCLP } from '@/utils/currency'
import type { Cuenta, TipoCuenta } from '@/types/app.types'

const TIPO_CONFIG: Record<TipoCuenta, { icon: string; color: string; label: string }> = {
  bancaria:  { icon: '🏦', color: '#2979FF', label: 'Banco'     },
  digital:   { icon: '📱', color: '#00C2CB', label: 'Digital'   },
  debito:    { icon: '🏧', color: '#10D97F', label: 'Débito'    },
  credito:   { icon: '💳', color: '#F4645F', label: 'Crédito'   },
  efectivo:  { icon: '💵', color: '#FFB703', label: 'Efectivo'  },
  inversion: { icon: '📈', color: '#9B5DE5', label: 'Inversión' },
}

let acPickCSSInjected = false
function useAcPickCSS() {
  const ref = useRef(false)
  useEffect(() => {
    if (acPickCSSInjected || ref.current) return
    ref.current = true
    acPickCSSInjected = true
    const s = document.createElement('style')
    s.textContent = `
      @keyframes acPickBounce {
        0%   { transform: scale(1); }
        40%  { transform: scale(0.93); }
        70%  { transform: scale(1.04); }
        100% { transform: scale(1); }
      }
      .ac-bounce { animation: acPickBounce 220ms ease; }
    `
    document.head.appendChild(s)
  }, [])
}

interface AccountPickerProps {
  cuentas:    Cuenta[]
  selectedId: string
  onChange:   (id: string) => void
  error?:     string
  label?:     string
  exclude?:   TipoCuenta[]
  only?:      TipoCuenta[]
  allowNull?: boolean
  nullLabel?:  string
}

export function AccountPicker({
  cuentas, selectedId, onChange, error, label,
  exclude, only, allowNull, nullLabel = 'Sin vincular'
}: AccountPickerProps) {
  useAcPickCSS()

  const filtered = cuentas.filter(c => {
    if (!c.activa) return false
    if (only   && only.length   > 0) return only.includes(c.tipo)
    if (exclude && exclude.length > 0) return !exclude.includes(c.tipo)
    return true
  })

  function bounce(id: string) {
    const el = document.getElementById(`acp-${id}`)
    if (!el) return
    el.classList.remove('ac-bounce')
    void el.offsetWidth
    el.classList.add('ac-bounce')
  }

  return (
    <div>
      {label && (
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">{label}</p>
      )}

      {filtered.length === 0 ? (
        <div className="py-6 text-center text-slate-600 text-xs rounded-2xl border border-dashed border-night-border">
          No hay cuentas disponibles
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {allowNull && (
            <button
              type="button"
              id="acp-null"
              onClick={() => { onChange(''); bounce('null') }}
              className={[
                'flex flex-col items-start gap-1.5 p-3 rounded-2xl border transition-all text-left',
                selectedId === ''
                  ? 'border-2 border-night-border bg-night-2'
                  : 'border border-night-border bg-night-3 hover:bg-night-2'
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">✕</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-night-3 text-slate-500">
                  Ninguna
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-400 leading-tight">{nullLabel}</p>
              <p className="text-xs text-slate-600">—</p>
            </button>
          )}

          {filtered.map(cuenta => {
            const cfg      = TIPO_CONFIG[cuenta.tipo]
            const color    = cuenta.color || cfg.color
            const isSelected = cuenta.id === selectedId
            const esCredito  = cuenta.tipo === 'credito'
            const saldo      = esCredito
              ? Math.max(0, (cuenta.limite ?? 0) - Math.abs(cuenta.saldo_actual))
              : cuenta.saldo_actual
            const saldoColor = esCredito
              ? '#2979FF'
              : saldo >= 0 ? '#10D97F' : '#F4645F'

            return (
              <button
                key={cuenta.id}
                type="button"
                id={`acp-${cuenta.id}`}
                onClick={() => { onChange(cuenta.id); bounce(cuenta.id) }}
                className={[
                  'relative flex flex-col items-start gap-1.5 p-3 rounded-2xl border transition-all text-left',
                  isSelected
                    ? 'border-2 bg-night-2'
                    : 'border border-night-border bg-night-3 hover:bg-night-2 hover:border-slate-600'
                ].join(' ')}
                style={isSelected ? {
                  borderColor: color,
                  boxShadow:   `0 0 14px ${color}28`,
                } : undefined}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}

                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{cfg.icon}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-200 leading-tight truncate w-full">
                  {cuenta.nombre}
                </p>

                <p className="text-xs font-bold tabular-nums" style={{ color: saldoColor }}>
                  {esCredito ? 'Cupo: ' : ''}{formatCLP(saldo)}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-danger-400 mt-1.5">{error}</p>
      )}
    </div>
  )
}
