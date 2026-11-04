import { useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useCreateMovimiento } from '@/hooks/useMovimientos'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import { validarPagoMultiple } from '@/utils/pagoVariasDeudas'
import { repartirPago, ETIQUETA_ESTRATEGIA, type EstrategiaReparto, type ResumenTarjetas, type LineaReparto } from '@/utils/deudasTarjeta'

interface Props {
  isOpen:  boolean
  onClose: () => void
  resumen: ResumenTarjetas
}

/**
 * Pagas UN monto a la tarjeta y la app lo reparte entre tus deudas (con la regla que elijas).
 * Cada reparto queda como su propio pago de deuda, así después ves a qué deuda se aplicó cada peso.
 */
export function PagarMontoTarjetaModal({ isOpen, onClose, resumen }: Props) {
  const { data: cuentas } = useCuentas()
  const crear = useCreateMovimiento()

  const [monto, setMonto]       = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [fecha, setFecha]       = useState(todayISO())
  const [estrategia, setEstrategia] = useState<EstrategiaReparto>('cuotas')
  const [errores, setErrores]   = useState<string[]>([])
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado] = useState<{ hechas: LineaReparto[]; fallo?: string; total: number } | null>(null)

  const items = useMemo(() => resumen.tarjetas.flatMap(t => t.deudas), [resumen])
  const montoNum = Math.max(0, Math.round(Number(monto) || 0))
  const reparto = useMemo(() => repartirPago(montoNum, items, estrategia), [montoNum, items, estrategia])
  const cuentasPago = (cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito' && c.tipo !== 'inversion')
  const cuenta = cuentasPago.find(c => c.id === cuentaId) ?? null

  async function pagar() {
    const errs = validarPagoMultiple(
      reparto.lineas.map(l => ({ deudaId: l.deudaId, nombre: l.nombre, pendiente: l.pendiente, monto: l.monto })), cuenta)
    if (montoNum <= 0) errs.unshift('Escribe cuánto vas a pagar')
    if (reparto.sobrante > 0) errs.push(`El monto supera lo que debes en tarjeta por ${formatCLP(reparto.sobrante)}`)
    setErrores(errs)
    if (errs.length) return

    setEjecutando(true)
    const hechas: LineaReparto[] = []
    try {
      for (let i = 0; i < reparto.lineas.length; i++) {
        const l = reparto.lineas[i]
        await crear.mutateAsync({
          tipo: 'pago_deuda', fecha, monto: l.monto, cuenta_id: cuenta!.id, deuda_id: l.deudaId,
          contexto_pago: 'deuda_propia',
          nota: `Pago de tarjeta ${formatCLP(montoNum)} (${i + 1}/${reparto.lineas.length}) · ${l.nombre}`,
        })
        hechas.push(l)
      }
      setResultado({ hechas, total: montoNum })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'Error al registrar el pago')
      setResultado({ hechas, total: hechas.reduce((s, l) => s + l.monto, 0), fallo: `${reparto.lineas[hechas.length]?.nombre ?? ''}: ${msg}` })
    } finally {
      setEjecutando(false)
    }
  }

  function cerrar() {
    setMonto(''); setCuentaId(''); setErrores([]); setResultado(null); setEstrategia('cuotas'); setFecha(todayISO())
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={cerrar} title="Pagar un monto a la tarjeta" theme="dark" accent="#F4645F">
      {resultado ? (
        <div className="space-y-4" data-testid="resultado-pago-tarjeta">
          <div className="flex items-center gap-2">
            {resultado.fallo ? <AlertCircle className="h-5 w-5 text-xp-400" /> : <CheckCircle2 className="h-5 w-5 text-ingreso-400" />}
            <p className="text-sm font-semibold text-white">
              {resultado.fallo ? 'Se registró una parte y otra falló' : `Pagaste ${formatCLP(resultado.total)}`}
            </p>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 tabular-nums">
            {resultado.hechas.map(l => (
              <li key={l.deudaId} className="flex justify-between gap-2">
                <span className="truncate">✓ {l.nombre}</span>
                <span className="flex-shrink-0">−{formatCLP(l.monto)} → debes {formatCLP(l.pendienteDespues)}</span>
              </li>
            ))}
          </ul>
          {resultado.fallo && (
            <p className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl p-3">
              No se pudo registrar: {resultado.fallo}. Lo de arriba ya quedó guardado; revisa el resto en Deudas.
            </p>
          )}
          <Button type="button" variant="primary" fullWidth onClick={cerrar}>Listo</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1.5">¿Cuánto pagas?</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 pointer-events-none">$</span>
              <input
                type="number" inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)} placeholder="100000"
                data-testid="monto-tarjeta"
                className="w-full h-14 pl-10 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border border-night-border bg-night-3 text-white outline-none focus:border-gasto-500 placeholder:text-slate-600"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 tabular-nums">Debes {formatCLP(resumen.totalPendiente)} en tarjeta · cuotas del mes {formatCLP(resumen.cuotasDelMes)}</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1.5">Cómo repartirlo</label>
            <div className="grid grid-cols-2 gap-1 bg-night-3/40 rounded-xl p-1" role="radiogroup">
              {(Object.keys(ETIQUETA_ESTRATEGIA) as EstrategiaReparto[]).map(k => (
                <button
                  key={k} type="button" role="radio" aria-checked={estrategia === k} onClick={() => setEstrategia(k)}
                  className={['py-2 rounded-lg text-[11px] font-semibold transition-all', estrategia === k ? 'bg-night-2 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-400'].join(' ')}
                >
                  {ETIQUETA_ESTRATEGIA[k].titulo}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{ETIQUETA_ESTRATEGIA[estrategia].ayuda}</p>
          </div>

          {montoNum > 0 && (
            <div className="rounded-2xl border border-night-border bg-night-3/40 p-3 space-y-1.5" data-testid="vista-reparto">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Así se repartiría</p>
              {reparto.lineas.map(l => (
                <div key={l.deudaId} className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                  <span className="text-slate-300 truncate">{l.nombre}</span>
                  <span className="text-slate-400 flex-shrink-0">
                    <span className="text-ingreso-400">−{formatCLP(l.monto)}</span> · quedaría {formatCLP(l.pendienteDespues)}
                  </span>
                </div>
              ))}
              {reparto.sobrante > 0 && (
                <p className="text-[11px] text-xp-300">Sobran {formatCLP(reparto.sobrante)}: es más de lo que debes en tarjeta.</p>
              )}
            </div>
          )}

          <AccountPicker
            label="Pagar desde"
            cuentas={cuentasPago}
            selectedId={cuentaId}
            onChange={setCuentaId}
          />
          {cuenta && montoNum > 0 && (
            <p className="text-[11px] text-slate-500 tabular-nums">
              Saldo de {cuenta.nombre.trim()}: {formatCLP(cuenta.saldo_actual)} → {formatCLP(cuenta.saldo_actual - reparto.asignado)}
            </p>
          )}

          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1.5">Fecha del pago</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none" />
          </div>

          {errores.length > 0 && (
            <ul className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl p-3 space-y-1" data-testid="errores-pago-tarjeta">
              {errores.map(e => <li key={e}>• {e}</li>)}
            </ul>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={cerrar}>Cancelar</Button>
            <Button type="button" variant="primary" fullWidth loading={ejecutando} onClick={pagar} disabled={montoNum <= 0}>
              Pagar {montoNum > 0 ? formatCLP(Math.min(montoNum, reparto.asignado || montoNum)) : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
