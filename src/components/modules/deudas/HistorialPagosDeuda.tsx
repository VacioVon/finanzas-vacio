import { ChevronDown, ChevronUp, Receipt } from 'lucide-react'
import { useState } from 'react'
import { useHistorialPagosDeuda } from '@/hooks/useDeudas'
import { formatCLP } from '@/utils/currency'
import type { ContextoPago } from '@/types/app.types'

const CONTEXTO_LABEL: Record<ContextoPago, string> = {
  deuda_propia:        'Deuda propia',
  devolucion_prestamo: 'Devolución',
  deuda_compartida:    'Compartida',
  otro:                'Otro',
}

function formatFecha(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  deudaId: string
}

export function HistorialPagosDeuda({ deudaId }: Props) {
  const [abierto, setAbierto] = useState(false)
  const { data: pagos, isLoading } = useHistorialPagosDeuda(abierto ? deudaId : null)

  return (
    <div className="border-t border-night-border/40">
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-night-3/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Receipt className="size-3.5" />
          Historial de pagos
        </span>
        {abierto
          ? <ChevronUp className="size-3.5 text-slate-600" />
          : <ChevronDown className="size-3.5 text-slate-600" />
        }
      </button>

      {abierto && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-10 rounded-xl bg-night-3/40 animate-pulse" />
              ))}
            </div>
          ) : !pagos || pagos.length === 0 ? (
            <p className="text-xs text-slate-600 py-2 text-center">Sin pagos registrados</p>
          ) : (
            <div className="space-y-2">
              {pagos.map(p => (
                <div
                  key={p.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-night-3/30 border border-night-border/40"
                >
                  {/* Indicador visual */}
                  <div className="size-1.5 rounded-full bg-ingreso-500 mt-1.5 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200 tabular-nums">
                        {formatCLP(p.monto)}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums flex-shrink-0">
                        {formatFecha(p.fecha)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.cuenta_nombre && (
                        <span className="text-[10px] text-slate-500">
                          {p.cuenta_nombre}
                        </span>
                      )}
                      {p.contexto_pago && (
                        <span className="text-[10px] text-brand-400/80">
                          {CONTEXTO_LABEL[p.contexto_pago]}
                        </span>
                      )}
                      {p.capital !== null && p.capital !== undefined && (
                        <span className="text-[10px] text-slate-600 tabular-nums">
                          Capital {formatCLP(p.capital)}
                        </span>
                      )}
                      {p.nota && (
                        <span className="text-[10px] text-slate-600 italic truncate max-w-[120px]">
                          {p.nota}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-slate-600 text-center pt-1 tabular-nums">
                {pagos.length} pago{pagos.length !== 1 ? 's' : ''} · total{' '}
                {formatCLP(pagos.reduce((s, p) => s + p.monto, 0))}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
