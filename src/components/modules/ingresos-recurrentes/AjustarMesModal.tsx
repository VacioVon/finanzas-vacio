import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  useIngresosRecurrentes, useInstanciasDeRecurrente, useAjustarInstanciaMes, useQuitarAjusteInstancia,
} from '@/hooks/useIngresosRecurrentes'
import { esInstanciaAjustada } from '@/utils/ingresosRecurrentes'
import type { IngresoMes } from '@/types/ingresos-recurrentes.types'

interface Props {
  instancia: IngresoMes
  onClose:   () => void
}

const fmtCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const periodo = (ref: string) => { const [y, m] = ref.split('-').map(Number); return `${MESES[m - 1]} ${y}` }

/**
 * "Ajustar este mes": cambia el monto esperado de UNA instancia pendiente.
 * No modifica el ingreso recurrente base ni los demás meses, y deja constancia como excepción.
 */
export function AjustarMesModal({ instancia, onClose }: Props) {
  const { data: recurrentes = [] } = useIngresosRecurrentes()
  const { data: instancias = [] }  = useInstanciasDeRecurrente(instancia.ingreso_recurrente_id)
  const ajustar = useAjustarInstanciaMes()
  const quitar  = useQuitarAjusteInstancia()

  const montoBase = recurrentes.find(r => r.id === instancia.ingreso_recurrente_id)?.monto_esperado ?? instancia.monto_esperado
  const actual    = instancias.find(i => i.id === instancia.instancia_id)
  const yaAjustada = esInstanciaAjustada(actual?.nota)

  const [monto, setMonto] = useState(String(instancia.monto_esperado))
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const montoNum = parseFloat(monto.replace(/[^\d.]/g, '')) || 0
  const ocupado = ajustar.isPending || quitar.isPending

  async function guardar() {
    setError('')
    if (montoNum <= 0) return setError('El monto debe ser mayor a 0')
    try {
      await ajustar.mutateAsync({ instanciaId: instancia.instancia_id, montoBase, montoNuevo: montoNum, comentario })
      onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo ajustar') }
  }

  async function quitarAjuste() {
    setError('')
    try {
      await quitar.mutateAsync({ instanciaId: instancia.instancia_id, montoBase })
      onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo quitar el ajuste') }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-night-1 border border-night-border shadow-2xl rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-night-border/50">
          <div>
            <p className="text-base font-semibold text-white">Ajustar este mes</p>
            <p className="text-[11px] text-slate-500">{instancia.nombre.trim()} · {periodo(instancia.periodo_ref)}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-night-3/50">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-night-3/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Monto base (configuración)</p>
              <p className="text-sm font-bold text-slate-200 tabular-nums">{fmtCLP(montoBase)}</p>
            </div>
            <div className="bg-night-3/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Esperado este mes</p>
              <p className="text-sm font-bold text-ingreso-400 tabular-nums">{fmtCLP(instancia.monto_esperado)}</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Nuevo monto esperado</label>
            <input type="number" inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ingreso-500 tabular-nums" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Motivo (opcional)</label>
            <input type="text" value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Ej. descuento de este mes"
              className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ingreso-500 placeholder-slate-600" />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Solo cambia <span className="text-slate-300">{periodo(instancia.periodo_ref)}</span>. El ingreso base y los meses
            siguientes no se modifican, y los movimientos reales tampoco. Queda registrado como excepción de este período.
            Lo que realmente recibas lo registras al confirmar.
          </p>

          {error && <p className="text-xs text-gasto-400 bg-gasto-500/10 px-3 py-2 rounded-xl">{error}</p>}

          <div className="space-y-2">
            <button onClick={guardar} disabled={ocupado || montoNum <= 0}
              className="w-full py-2.5 rounded-xl bg-ingreso-500 text-night-0 text-sm font-semibold hover:bg-ingreso-400 disabled:opacity-50 transition-colors">
              {ajustar.isPending ? 'Guardando…' : 'Guardar ajuste'}
            </button>
            {yaAjustada && (
              <button onClick={quitarAjuste} disabled={ocupado}
                className="w-full py-2.5 rounded-xl border border-night-border text-slate-400 text-sm hover:bg-night-3/50 disabled:opacity-50 transition-colors">
                Quitar ajuste (volver a {fmtCLP(montoBase)})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
