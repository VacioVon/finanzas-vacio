import { ChevronDown, ChevronUp, Receipt, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { useHistorialPagosDeuda } from '@/hooks/useDeudas'
import { formatCLP } from '@/utils/currency'
import { PagoDeudaDetalleModal } from './PagoDeudaDetalleModal'
import type { ContextoPago, PagoDeudaHistorial } from '@/types/app.types'

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
  deudaNombre?: string
}

export function HistorialPagosDeuda({ deudaId, deudaNombre = '' }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [detalle, setDetalle] = useState<PagoDeudaHistorial | null>(null)
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
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setDetalle(p)}
                  data-testid="pago-historial"
                  className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl bg-night-3/30 border border-night-border/40 hover:border-brand-500/40 hover:bg-night-3/60 transition-colors"
                >
                  {/* Indicador visual */}
                  <div className="size-1.5 rounded-full bg-ingreso-500 mt-1.5 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200 tabular-nums">
                        {formatCLP(p.monto)}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-500 tabular-nums flex-shrink-0">
                        {p.comprobante_url && <Paperclip className="size-3 text-brand-400" aria-label="Tiene comprobante" />}
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
                </button>
              ))}

              <p className="text-[10px] text-slate-600 text-center pt-1">Toca un pago para ver su detalle o adjuntar el comprobante</p>
              <p className="text-[10px] text-slate-600 text-center tabular-nums">
                {pagos.length} pago{pagos.length !== 1 ? 's' : ''} · total{' '}
                {formatCLP(pagos.reduce((s, p) => s + p.monto, 0))}
              </p>
            </div>
          )}
        </div>
      )}
      {detalle && <PagoDeudaDetalleModal pago={detalle} deuda={deudaNombre} onClose={() => setDetalle(null)} />}
    </div>
  )
}
