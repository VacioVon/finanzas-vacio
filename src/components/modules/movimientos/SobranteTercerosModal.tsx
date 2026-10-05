import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { createMovimiento } from '@/services/movimientos.service'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import { montoParaMi, notaSobrante } from '@/utils/saldoTerceros'
import { useCuentas, useSaldoTerceros } from '@/hooks/useCuentas'

interface Props {
  /** Dinero de terceros que sobró después del pago. */
  monto:   number
  onClose: () => void
}

/**
 * Después de pagar con dinero de terceros, si sobra algo pregunta CUÁNTO quieres dejar para ti:
 *  - Un monto (hasta el sobrante) → pasa a tu dinero: baja el saldo de terceros y se registra como INGRESO tuyo,
 *    en la cuenta que elijas. Si es la cuenta donde ya está el dinero no se mueve nada; si eliges otra, se hace una transferencia.
 *  - No / 0 → el sobrante sigue siendo dinero de terceros.
 */
export function SobranteTercerosModal({ monto, onClose }: Props) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [texto, setTexto] = useState(String(monto))      // por defecto, todo el sobrante
  const { data: cuentas } = useCuentas()
  const { data: terceros } = useSaldoTerceros()
  const origenId = terceros?.primaryCuentaId ?? null            // cuenta donde está físicamente el dinero
  const opciones = (cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito' && c.tipo !== 'inversion')
  const [elegida, setElegida] = useState<string>('')
  const destinoId = elegida || origenId || ''
  const nombreDe = (id: string) => opciones.find(c => c.id === id)?.nombre.trim() ?? null
  const seMueve = !!origenId && !!destinoId && destinoId !== origenId
  const paraMi = montoParaMi(texto, monto)

  async function pasarAMiDinero() {
    if (!user || paraMi <= 0) return
    setGuardando(true); setError('')
    try {
      // 1) Baja el saldo de terceros: movimiento SIN cuenta (no toca ningún saldo) que se muestra y cuenta como ingreso tuyo.
      await createMovimiento(user.id, {
        tipo: 'gasto', fecha: todayISO(), monto: paraMi, cuenta_id: '',
        fondos_tercero: true, nota: notaSobrante(destinoId ? nombreDe(destinoId) : null),
      })
      // 2) Solo si elegiste una cuenta distinta de donde está el dinero: se mueve con una transferencia.
      if (seMueve && origenId) {
        await createMovimiento(user.id, {
          tipo: 'transferencia', fecha: todayISO(), monto: paraMi, cuenta_id: origenId, cuenta_destino_id: destinoId,
          nota: 'Sobrante de dinero de terceros',
        })
      }
      for (const key of ['saldo-terceros', 'movimientos', 'cuentas']) qc.invalidateQueries({ queryKey: [key] })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'No se pudo registrar'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Sobró dinero de terceros" theme="dark" accent="#10D97F">
      <div className="space-y-4" data-testid="sobrante-terceros">
        <div className="rounded-2xl bg-night-3/50 p-4 text-center">
          <p className="text-[11px] text-slate-500">Quedan de dinero de terceros</p>
          <p className="text-2xl font-bold tabular-nums text-ingreso-400">{formatCLP(monto)}</p>
        </div>
        <p className="text-sm text-slate-300 text-center">¿Cuánto quieres dejar para ti?</p>
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 pointer-events-none">$</span>
            <input
              type="number"
              inputMode="numeric"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              className="w-full h-14 pl-10 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border border-night-border bg-night-3 text-white outline-none focus:ring-2 focus:ring-ingreso-500/50"
              data-testid="monto-para-mi"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setTexto(String(monto))}
              className="flex-1 py-1.5 text-xs bg-night-3 text-slate-300 rounded-xl border border-night-border hover:bg-night-2 transition-colors tabular-nums">
              Todo: {formatCLP(monto)}
            </button>
            <button type="button" onClick={() => setTexto('0')}
              className="flex-1 py-1.5 text-xs bg-night-3 text-slate-300 rounded-xl border border-night-border hover:bg-night-2 transition-colors">
              Nada
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 text-center leading-relaxed tabular-nums">
          {paraMi > 0
            ? <>Pasan a tu dinero <span className="text-slate-300">{formatCLP(paraMi)}</span>
                {paraMi < monto && <> y siguen como dinero de terceros <span className="text-slate-300">{formatCLP(monto - paraMi)}</span></>}.</>
            : <>No pasa nada a tu dinero: {formatCLP(monto)} siguen como dinero de terceros.</>}
          {' '}Se registra como ingreso tuyo.
        </p>
        {paraMi > 0 && opciones.length > 0 && (
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">¿En qué cuenta queda?</label>
            <select
              value={destinoId}
              onChange={e => setElegida(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none"
              data-testid="cuenta-sobrante"
            >
              {opciones.map(c => (
                <option key={c.id} value={c.id}>{c.nombre.trim()}{c.id === origenId ? ' (donde ya está el dinero)' : ''}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {seMueve
                ? `Se hará una transferencia de ${nombreDe(origenId!)} a ${nombreDe(destinoId)} por ${formatCLP(paraMi)}.`
                : 'El dinero ya está en esa cuenta: no se mueve nada, solo pasa a ser tuyo. Se registra como ingreso.'}
            </p>
          </div>
        )}
        {error && <p className="text-xs text-gasto-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={guardando}>Dejarlo como está</Button>
          <Button type="button" variant="primary" fullWidth loading={guardando} disabled={paraMi <= 0} onClick={pasarAMiDinero}>
            Dejar {paraMi > 0 ? formatCLP(paraMi) : ''} para mí
          </Button>
        </div>
      </div>
    </Modal>
  )
}
