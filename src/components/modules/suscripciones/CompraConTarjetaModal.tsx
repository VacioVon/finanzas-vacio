import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useDeudas } from '@/hooks/useDeudas'
import { useCuentas } from '@/hooks/useCuentas'
import { useMarcarCompromisoPagado } from '@/hooks/useSuscripciones'
import { deudasPagablesDeTarjeta } from '@/utils/pagoCompromisoDeuda'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import type { Suscripcion } from '@/types/app.types'

interface Props {
  isOpen:     boolean
  onClose:    () => void
  compromiso: Suscripcion
}

/**
 * "Compré con la tarjeta": el compromiso de este ciclo ya quedó cubierto por una compra en cuotas con la
 * tarjeta de crédito. Se da por pagado ahora (no figura vencido) y no se mueve dinero: las cuotas se pagan
 * después, desde el mes siguiente, en Deudas → Pagar varias (enlazadas a este compromiso).
 */
export function CompraConTarjetaModal({ isOpen, onClose, compromiso }: Props) {
  const { data: deudas }  = useDeudas()
  const { data: cuentas } = useCuentas()
  const marcar = useMarcarCompromisoPagado()
  const [deudaId, setDeudaId] = useState('')
  const [error, setError] = useState('')

  const opciones = useMemo(
    () => deudasPagablesDeTarjeta(deudas ?? [], cuentas ?? [], compromiso.nombre),
    [deudas, cuentas, compromiso.nombre]
  )
  const elegida = opciones.find(o => o.deuda.id === deudaId) ?? null

  async function confirmar() {
    if (!elegida) return
    setError('')
    try {
      await marcar.mutateAsync({ compromiso, fecha: todayISO() })
      setDeudaId('')
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo marcar el compromiso')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compré con la tarjeta" theme="dark" accent="#F4645F">
      <div className="space-y-4" data-testid="compra-con-tarjeta">
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-night-border bg-night-3/60">
          <CreditCard className="h-5 w-5 text-gasto-300 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{compromiso.nombre.trim()}</p>
            <p className="text-[11px] text-slate-500">Se da por pagado este mes; sin mover dinero</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Elige la compra en cuotas con la que lo cubriste. Las cuotas las pagas después, empezando el mes
          siguiente, desde <span className="text-slate-200">Deudas → Pagar varias</span> (ahí se enlazan a este compromiso).
        </p>

        {opciones.length === 0 ? (
          <div className="text-xs text-xp-300 bg-xp-500/10 border border-xp-500/25 rounded-xl p-3 space-y-1">
            <p>No hay compras en cuotas de tarjeta registradas.</p>
            <p>Primero créala en <Link to="/deudas" className="underline font-semibold">Deudas</Link>, ligada a tu tarjeta, y vuelve aquí.</p>
          </div>
        ) : (
          <div className="space-y-2" role="radiogroup" aria-label="Compra de la tarjeta">
            {opciones.map(o => {
              const activa = o.deuda.id === deudaId
              return (
                <button
                  key={o.deuda.id}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  onClick={() => setDeudaId(o.deuda.id)}
                  className={['w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-colors',
                    activa ? 'border-gasto-500/50 bg-gasto-500/10' : 'border-night-border bg-night-3/60 hover:border-gasto-500/30'].join(' ')}
                >
                  <span className={['mt-0.5 size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', activa ? 'border-gasto-500' : 'border-slate-600'].join(' ')}>
                    {activa && <span className="size-2.5 rounded-full bg-gasto-500" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100 truncate">{o.coincideNombre ? '★ ' : ''}{o.deuda.nombre.trim()}</span>
                      <span className="text-sm font-bold text-gasto-300 tabular-nums flex-shrink-0">{formatCLP(o.pendiente)}</span>
                    </span>
                    <span className="block text-[11px] text-slate-500 tabular-nums mt-0.5">
                      {o.tarjeta.nombre.trim()} · cuota {formatCLP(o.cuotaSugerida)} · {o.cuotasRestantes} {o.cuotasRestantes === 1 ? 'cuota restante' : 'cuotas restantes'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {elegida && (
          <p className="text-[11px] text-ingreso-400 tabular-nums">
            «{compromiso.nombre.trim()}» quedará pagado este mes, cubierto por «{elegida.deuda.nombre.trim()}».
            Empiezas a pagar las {elegida.cuotasRestantes} cuotas de {formatCLP(elegida.cuotaSugerida)} el mes siguiente.
          </p>
        )}
        {error && <p className="text-xs text-gasto-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" fullWidth loading={marcar.isPending} disabled={!elegida} onClick={confirmar}>
            Dar por pagado este mes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
