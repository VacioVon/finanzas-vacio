import { useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { TercerosToggle } from '@/components/ui/TercerosToggle'
import { useDeudas } from '@/hooks/useDeudas'
import { useCuentas } from '@/hooks/useCuentas'
import { useCreateMovimiento } from '@/hooks/useMovimientos'
import { useSuscripciones } from '@/hooks/useSuscripciones'
import { marcarCompromisoPagado } from '@/services/suscripciones.service'
import { useQueryClient } from '@tanstack/react-query'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import {
  agruparDeudasPagables, describirPago, opcionesRapidas, validarPagoMultiple, totalLineas,
  sugerirCompromiso, compromisosAMarcar, compromisoPagadoEsteCiclo,
  type DeudaElegible, type LineaPago,
} from '@/utils/pagoVariasDeudas'

interface Props {
  isOpen:  boolean
  onClose: () => void
}

/**
 * Paga varias deudas de una sola vez. Cada deuda seleccionada queda como su propia línea de movimiento
 * (cuenta de origen − monto, deuda − monto y, si está ligada a una tarjeta, la tarjeta − monto).
 */
export function PagarVariasDeudasModal({ isOpen, onClose }: Props) {
  const { data: deudas }  = useDeudas()
  const { data: cuentas } = useCuentas()
  const crear = useCreateMovimiento()
  const qc = useQueryClient()
  const { data: compromisos } = useSuscripciones()
  const activos = (compromisos ?? []).filter(c => c.activa)

  const [cuentaId, setCuentaId]   = useState('')
  const [fecha, setFecha]         = useState(todayISO())
  const [sel, setSel]             = useState<Record<string, string>>({})    // deudaId → monto (texto)
  const [comp, setComp]           = useState<Record<string, string>>({})    // deudaId → compromiso que cubre ('' = ninguno)
  const [deTerceros, setDeTerceros] = useState(false)
  const [errores, setErrores]     = useState<string[]>([])
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado] = useState<{ hechas: string[]; fallo?: string; marcados?: string[] } | null>(null)

  const grupos = useMemo(() => agruparDeudasPagables(deudas ?? [], cuentas ?? []), [deudas, cuentas])
  const todas = grupos.flatMap(g => g.items)
  const cuentasPago = (cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito' && c.tipo !== 'inversion')
  const cuenta = cuentasPago.find(c => c.id === cuentaId) ?? null

  const lineas: LineaPago[] = todas
    .filter(e => e.deuda.id in sel)
    .map(e => ({ deudaId: e.deuda.id, nombre: e.deuda.nombre.trim(), pendiente: e.pendiente, monto: Math.round(parseFloat(sel[e.deuda.id]) || 0) }))
  const total = totalLineas(lineas)
  const saldoDespues = (cuenta?.saldo_actual ?? 0) - total

  function alternar(e: DeudaElegible) {
    setSel(prev => {
      const next = { ...prev }
      if (e.deuda.id in next) delete next[e.deuda.id]
      else next[e.deuda.id] = String(e.cuotaSugerida)
      return next
    })
    // Al marcar, se sugiere el compromiso que se parece a la deuda (el usuario puede cambiarlo)
    setComp(prev => (e.deuda.id in prev ? prev : { ...prev, [e.deuda.id]: sugerirCompromiso(e.deuda.nombre, activos) }))
  }
  const poner = (id: string, monto: number) => setSel(prev => ({ ...prev, [id]: String(monto) }))
  function marcarGrupo(items: DeudaElegible[]) {
    setSel(prev => { const n = { ...prev }; for (const e of items) n[e.deuda.id] = String(e.cuotaSugerida); return n })
    setComp(prev => { const n = { ...prev }; for (const e of items) if (!(e.deuda.id in n)) n[e.deuda.id] = sugerirCompromiso(e.deuda.nombre, activos); return n })
  }

  async function pagar() {
    const errs = validarPagoMultiple(lineas, cuenta)
    setErrores(errs)
    if (errs.length) return
    setEjecutando(true)
    const hechas: string[] = []
    const enlazados: string[] = []
    try {
      for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i]
        await crear.mutateAsync({
          tipo: 'pago_deuda', fecha, monto: l.monto, cuenta_id: cuenta!.id, deuda_id: l.deudaId,
          contexto_pago: 'deuda_propia', fondos_tercero: deTerceros,
          compromiso_id: comp[l.deudaId] || undefined,
          nota: `Pago de deudas (${i + 1}/${lineas.length}) · ${l.nombre}`,
        })
        hechas.push(l.nombre)
        if (comp[l.deudaId]) enlazados.push(comp[l.deudaId])
        setSel(prev => { const n = { ...prev }; delete n[l.deudaId]; return n })   // ya pagada: sale de la selección
      }
      // Los compromisos enlazados quedan pagados (una sola vez cada uno, sin adelantar uno ya pagado)
      const aMarcar = compromisosAMarcar(enlazados, compromisos ?? [])
      const marcados: string[] = []
      for (const c of aMarcar) { await marcarCompromisoPagado(c, fecha); marcados.push(c.nombre.trim()) }
      qc.invalidateQueries({ queryKey: ['suscripciones'] }); qc.invalidateQueries({ queryKey: ['pagos-compromisos'] })
      setResultado({ hechas, marcados })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'Error al registrar el pago')
      setResultado({ hechas, fallo: `${lineas[hechas.length]?.nombre ?? ''}: ${msg}` })
    } finally {
      setEjecutando(false)
    }
  }

  function cerrar() {
    setSel({}); setComp({}); setErrores([]); setResultado(null); setDeTerceros(false); setCuentaId('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={cerrar} title="Pagar deudas" theme="dark" accent="#F4645F">
      {resultado ? (
        <div className="space-y-4" data-testid="resultado-pago-multiple">
          <div className="flex items-center gap-2">
            {resultado.fallo ? <AlertCircle className="h-5 w-5 text-xp-400" /> : <CheckCircle2 className="h-5 w-5 text-ingreso-400" />}
            <p className="text-sm font-semibold text-white">
              {resultado.fallo ? `Se registraron ${resultado.hechas.length} pagos y uno falló` : `${resultado.hechas.length} pagos registrados`}
            </p>
          </div>
          <ul className="text-xs text-slate-300 space-y-1">
            {resultado.hechas.map(n => <li key={n}>✓ {n}</li>)}
          </ul>
          {!!resultado.marcados?.length && (
            <p className="text-xs text-ingreso-400" data-testid="compromisos-marcados">
              Compromisos que quedaron pagados: {resultado.marcados.join(', ')}
            </p>
          )}
          {resultado.fallo && (
            <p className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl p-3">
              No se pudo registrar: {resultado.fallo}. Los pagos de arriba ya quedaron guardados; lo que falta sigue seleccionado para reintentar.
            </p>
          )}
          <Button type="button" variant="primary" fullWidth onClick={resultado.fallo ? () => setResultado(null) : cerrar}>
            {resultado.fallo ? 'Volver y reintentar' : 'Listo'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <AccountPicker
            label="Pagar desde"
            cuentas={cuentasPago}
            selectedId={cuentaId}
            onChange={setCuentaId}
            exclude={['inversion', 'credito']}
          />

          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Fecha del pago</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none" />
          </div>

          {grupos.length === 0 && (
            <p className="text-xs text-slate-400 bg-night-3 rounded-xl p-3">No hay deudas pendientes para pagar.</p>
          )}

          {grupos.map(g => (
            <section key={g.titulo} className="space-y-2" data-testid="grupo-deudas">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {g.titulo} <span className="text-slate-600 normal-case font-normal">· {g.items.length} {g.items.length === 1 ? 'deuda' : 'deudas'} · pendiente {formatCLP(g.items.reduce((s, i) => s + i.pendiente, 0))}</span>
                </p>
                <button type="button" onClick={() => marcarGrupo(g.items)} className="text-[11px] text-brand-400 hover:text-brand-300 font-medium">
                  Marcar la cuota de todas
                </button>
              </div>

              {g.items.map(e => {
                const activa = e.deuda.id in sel
                const monto = Math.round(parseFloat(sel[e.deuda.id]) || 0)
                const desc = activa ? describirPago(e.pendiente, monto, e.cuota) : null
                return (
                  <div key={e.deuda.id}
                    className={['rounded-2xl border transition-colors', activa ? 'border-gasto-500/40 bg-gasto-500/5' : 'border-night-border bg-night-3/60'].join(' ')}
                    data-testid="fila-deuda">
                    <button type="button" onClick={() => alternar(e)} className="w-full flex items-start gap-3 p-3 text-left" aria-pressed={activa}>
                      <span className={['mt-0.5 size-5 rounded border-2 flex items-center justify-center flex-shrink-0', activa ? 'bg-gasto-500 border-gasto-500' : 'border-slate-600'].join(' ')}>
                        {activa && <span className="text-night-0 text-[10px] font-bold">✓</span>}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-100 truncate">{e.deuda.nombre.trim()}</span>
                          <span className="text-sm font-bold text-gasto-300 tabular-nums flex-shrink-0">{formatCLP(e.pendiente)}</span>
                        </span>
                        <span className="block text-[11px] text-slate-500 tabular-nums mt-0.5">
                          {e.deuda.prestamista_nombre?.trim() ? `${e.deuda.prestamista_nombre.trim()} · ` : ''}
                          {e.cuota ? `Cuota ${formatCLP(e.cuota)} · ${e.cuotasRestantes} ${e.cuotasRestantes === 1 ? 'cuota restante' : 'cuotas restantes'}` : 'Pago libre (sin cuota)'}
                        </span>
                        <span className="block h-1 bg-night-0 rounded-full overflow-hidden mt-2">
                          <span className="block h-full bg-ingreso-500 rounded-full" style={{ width: `${Math.round(e.pagadoPct * 100)}%` }} />
                        </span>
                      </span>
                    </button>

                    {activa && desc && (
                      <div className="px-3 pb-3 space-y-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input type="number" inputMode="numeric" value={sel[e.deuda.id]}
                            onChange={ev => poner(e.deuda.id, parseFloat(ev.target.value) || 0)}
                            className="w-full h-11 pl-7 pr-3 rounded-xl border border-night-border bg-night-0 text-white text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-gasto-500/40" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {opcionesRapidas(e.pendiente, e.cuota).map(o => (
                            <button key={o.etiqueta} type="button" onClick={() => poner(e.deuda.id, o.monto)}
                              className="px-2.5 py-1 text-[11px] rounded-lg bg-night-0 border border-night-border text-slate-300 hover:border-gasto-500/40 tabular-nums">
                              {o.etiqueta} · {formatCLP(o.monto)}
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">¿Es el pago de un compromiso?</label>
                          <select
                            value={comp[e.deuda.id] ?? ''}
                            onChange={ev => setComp(prev => ({ ...prev, [e.deuda.id]: ev.target.value }))}
                            className="w-full h-10 px-3 rounded-xl border border-night-border bg-night-0 text-slate-200 text-xs outline-none"
                            data-testid="select-compromiso"
                          >
                            <option value="">No, solo abono a la deuda</option>
                            {activos.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nombre.trim()}{compromisoPagadoEsteCiclo(c) ? ' (ya pagado este ciclo)' : ''}
                              </option>
                            ))}
                          </select>
                          {comp[e.deuda.id] && (
                            <p className="text-[10px] text-ingreso-400/80 mt-1">El compromiso queda pagado con este movimiento: no lo pagues de nuevo.</p>
                          )}
                        </div>
                        <p className={['text-[11px] tabular-nums', desc.saldaLaDeuda ? 'text-ingreso-400' : monto > e.pendiente ? 'text-gasto-400' : 'text-slate-300'].join(' ')} data-testid="descripcion-pago">
                          {monto > e.pendiente ? `Supera lo pendiente (${formatCLP(e.pendiente)})` : desc.texto}
                          {!desc.saldaLaDeuda && monto > 0 && monto <= e.pendiente ? ` · pendiente ${formatCLP(desc.pendienteDespues)}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          ))}

          <TercerosToggle value={deTerceros} onChange={setDeTerceros} ayuda="Pago con plata de otra persona (no es mi gasto)" />

          {errores.length > 0 && (
            <ul className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl p-3 space-y-0.5">
              {errores.map(m => <li key={m}>• {m}</li>)}
            </ul>
          )}

          <div className="sticky bottom-0 -mx-1 px-1 pt-3 pb-1 bg-night-1/95 backdrop-blur space-y-2 border-t border-night-border/60" data-testid="resumen-pago-multiple">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">{lineas.length} {lineas.length === 1 ? 'deuda' : 'deudas'} seleccionadas</span>
              <span className="text-lg font-bold tabular-nums text-white">{formatCLP(total)}</span>
            </div>
            {cuenta && (
              <p className="text-[11px] text-slate-500 tabular-nums text-right">
                {cuenta.nombre.trim()}: {formatCLP(cuenta.saldo_actual)} → <span className={saldoDespues < 0 ? 'text-xp-400' : 'text-slate-300'}>{formatCLP(saldoDespues)}</span>
                {saldoDespues < 0 && ' (quedaría negativo)'}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" fullWidth onClick={cerrar}>Cancelar</Button>
              <Button type="button" variant="primary" fullWidth loading={ejecutando} disabled={lineas.length === 0} onClick={pagar}>
                Pagar {lineas.length > 0 ? `${lineas.length} ${lineas.length === 1 ? 'deuda' : 'deudas'}` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
