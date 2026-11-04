import { useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useCreateMovimiento } from '@/hooks/useMovimientos'
import { useAsignarPagoTarjeta } from '@/hooks/useDeudas'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import { notaSinAsignar, validarAsignacion } from '@/utils/pagosSinAsignar'
import { repartirPago, ETIQUETA_ESTRATEGIA, type EstrategiaReparto, type ResumenTarjetas } from '@/utils/deudasTarjeta'
import type { Movimiento } from '@/types/app.types'

/* ─── Registrar un pago a la tarjeta sin decir a qué deuda ─────────────────────────────────────── */

export function PagoTarjetaSinAsignarModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: cuentas } = useCuentas()
  const crear = useCreateMovimiento()
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [tarjetaId, setTarjetaId] = useState('')
  const [fecha, setFecha] = useState(todayISO())
  const [error, setError] = useState('')

  const origenes = (cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito' && c.tipo !== 'inversion')
  const tarjetas = (cuentas ?? []).filter(c => c.activa && c.tipo === 'credito')
  const tarjetaElegida = tarjetaId || (tarjetas.length === 1 ? tarjetas[0].id : '')
  const montoNum = Math.max(0, Math.round(Number(monto) || 0))
  const origen = origenes.find(c => c.id === cuentaId) ?? null

  async function guardar() {
    if (montoNum <= 0) return setError('Escribe cuánto pagaste')
    if (!origen) return setError('Elige la cuenta desde donde pagaste')
    if (!tarjetaElegida) return setError('Elige la tarjeta')
    setError('')
    try {
      await crear.mutateAsync({ tipo: 'pago_tarjeta', fecha, monto: montoNum, cuenta_id: origen.id, cuenta_destino_id: tarjetaElegida, nota: notaSinAsignar() })
      cerrar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'No se pudo registrar el pago'))
    }
  }
  function cerrar() { setMonto(''); setCuentaId(''); setTarjetaId(''); setError(''); setFecha(todayISO()); onClose() }

  return (
    <Modal isOpen={isOpen} onClose={cerrar} title="Pagué a la tarjeta" theme="dark" accent="#F4645F">
      <div className="space-y-4" data-testid="pago-tarjeta-sin-asignar">
        <p className="text-xs text-slate-400 leading-relaxed">
          Registra lo que pagaste a la tarjeta sin elegir deudas. Queda como <span className="text-slate-200">pago sin asignar</span> y
          lo asignas cuando llegue el estado de cuenta y veas qué se pagó.
        </p>
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1.5">¿Cuánto pagaste?</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 pointer-events-none">$</span>
            <input type="number" inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)} placeholder="100000"
              data-testid="monto-sin-asignar"
              className="w-full h-14 pl-10 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border border-night-border bg-night-3 text-white outline-none focus:border-gasto-500 placeholder:text-slate-600" />
          </div>
        </div>
        <AccountPicker label="Pagué desde" cuentas={origenes} selectedId={cuentaId} onChange={setCuentaId} />
        {tarjetas.length > 1 && (
          <AccountPicker label="Tarjeta" cuentas={tarjetas} selectedId={tarjetaElegida} onChange={setTarjetaId} />
        )}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1.5">Fecha del pago</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none" />
        </div>
        {origen && montoNum > 0 && (
          <p className="text-[11px] text-slate-500 tabular-nums">Saldo de {origen.nombre.trim()}: {formatCLP(origen.saldo_actual)} → {formatCLP(origen.saldo_actual - montoNum)}</p>
        )}
        {error && <p className="text-xs text-gasto-400" data-testid="error-sin-asignar">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={cerrar}>Cancelar</Button>
          <Button type="button" variant="primary" fullWidth loading={crear.isPending} onClick={guardar}>Registrar pago</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Asignar un pago sin asignar a las deudas que dice el estado de cuenta ───────────────────── */

interface AsignarProps { pago: Movimiento | null; resumen: ResumenTarjetas; onClose: () => void }

export function AsignarPagoTarjetaModal({ pago, resumen, onClose }: AsignarProps) {
  const asignar = useAsignarPagoTarjeta()
  const items = useMemo(() => resumen.tarjetas.flatMap(t => t.deudas), [resumen])
  const [montos, setMontos] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<string[]>([])
  const [resultado, setResultado] = useState<{ asignado: number; restante: number; fallo?: string } | null>(null)

  if (!pago) return null
  const disponible = pago.monto
  const lineas = items.map(e => ({ deudaId: e.deuda.id, nombre: e.deuda.nombre.trim(), pendiente: e.pendiente, monto: Math.round(parseFloat(montos[e.deuda.id]) || 0) }))
  const v = validarAsignacion(disponible, lineas)

  function sugerir(estrategia: EstrategiaReparto) {
    const r = repartirPago(disponible, items, estrategia)
    setMontos(Object.fromEntries(r.lineas.map(l => [l.deudaId, String(l.monto)])))
    setErrores([])
  }

  async function confirmar() {
    setErrores(v.errores)
    if (v.errores.length) return
    try {
      const r = await asignar.mutateAsync({ pago: pago!, lineas: lineas.filter(l => l.monto > 0) })
      setResultado({ asignado: r.asignado, restante: r.restante })
    } catch (e: unknown) {
      setResultado({ asignado: 0, restante: disponible, fallo: e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'Error al asignar') })
    }
  }
  function cerrar() { setMontos({}); setErrores([]); setResultado(null); onClose() }

  return (
    <Modal isOpen onClose={cerrar} title="Asignar pago a la tarjeta" theme="dark" accent="#F4645F">
      {resultado ? (
        <div className="space-y-4" data-testid="resultado-asignacion">
          <div className="flex items-center gap-2">
            {resultado.fallo ? <AlertCircle className="h-5 w-5 text-xp-400" /> : <CheckCircle2 className="h-5 w-5 text-ingreso-400" />}
            <p className="text-sm font-semibold text-white">{resultado.fallo ? 'No se pudo completar' : `Asignaste ${formatCLP(resultado.asignado)}`}</p>
          </div>
          {resultado.fallo
            ? <p className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl p-3">{resultado.fallo}. Revisa en Deudas qué quedó registrado: lo que no se asignó vuelve a quedar como pago sin asignar.</p>
            : resultado.restante > 0 && <p className="text-xs text-slate-300">Quedan {formatCLP(resultado.restante)} como pago sin asignar.</p>}
          <Button type="button" variant="primary" fullWidth onClick={cerrar}>Listo</Button>
        </div>
      ) : (
        <div className="space-y-4" data-testid="asignar-pago">
          <div className="text-center">
            <p className="text-[11px] text-slate-500">Pagaste</p>
            <p className="text-3xl font-bold text-white tabular-nums">{formatCLP(disponible)}</p>
            <p className="text-[11px] text-slate-500">el {pago.fecha}</p>
          </div>
          <div className="flex gap-2">
            {(Object.keys(ETIQUETA_ESTRATEGIA) as EstrategiaReparto[]).map(k => (
              <button key={k} type="button" onClick={() => sugerir(k)}
                className="flex-1 py-1.5 text-[11px] rounded-xl border border-night-border bg-night-3 text-slate-300 hover:border-gasto-500/40">
                Sugerir: {ETIQUETA_ESTRATEGIA[k].titulo}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Pon cuánto se pagó de cada deuda según tu estado de cuenta.</p>
          <ul className="space-y-2">
            {items.map(e => (
              <li key={e.deuda.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-night-border bg-night-3/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{e.deuda.nombre.trim()}</p>
                  <p className="text-[11px] text-slate-500 tabular-nums">debes {formatCLP(e.pendiente)}{e.cuota ? ` · cuota ${formatCLP(e.cuota)}` : ''}</p>
                </div>
                <div className="relative w-28 flex-shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
                  <input type="number" inputMode="numeric" value={montos[e.deuda.id] ?? ''} placeholder="0"
                    onChange={ev => setMontos(p => ({ ...p, [e.deuda.id]: ev.target.value }))}
                    data-testid={`asignar-${e.deuda.id}`}
                    className="w-full h-9 pl-5 pr-2 text-right text-sm tabular-nums rounded-lg border border-night-border bg-night-0 text-white outline-none focus:border-gasto-500" />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs tabular-nums text-slate-300" data-testid="restante-asignar">
            Asignado {formatCLP(v.asignado)} · sin asignar {formatCLP(v.restante)}
          </p>
          {errores.length > 0 && (
            <ul className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl p-3 space-y-1">{errores.map(e => <li key={e}>• {e}</li>)}</ul>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={cerrar}>Cancelar</Button>
            <Button type="button" variant="primary" fullWidth loading={asignar.isPending} onClick={confirmar}>Asignar</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
