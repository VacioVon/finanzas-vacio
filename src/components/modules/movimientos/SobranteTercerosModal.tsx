import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { createMovimiento } from '@/services/movimientos.service'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'

interface Props {
  /** Dinero de terceros que sobró después del pago. */
  monto:   number
  onClose: () => void
}

/**
 * Después de pagar con dinero de terceros, si sobra algo pregunta:
 *  - Sí → pasa el sobrante a tu dinero: baja el saldo de terceros (sin tocar ninguna cuenta ni contar como gasto).
 *  - No → el sobrante sigue siendo dinero de terceros.
 */
export function SobranteTercerosModal({ monto, onClose }: Props) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function pasarAMiDinero() {
    if (!user) return
    setGuardando(true); setError('')
    try {
      // Egreso de dinero de terceros SIN cuenta: no mueve ningún saldo real y no cuenta como gasto propio.
      await createMovimiento(user.id, {
        tipo: 'gasto', fecha: todayISO(), monto, cuenta_id: '',
        fondos_tercero: true, nota: 'Sobrante de dinero de terceros pasa a mi dinero',
      })
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
        <p className="text-sm text-slate-300 text-center">¿Quieres que este saldo quede para ti?</p>
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          <span className="text-slate-300">Sí:</span> pasa a ser tu dinero y deja de aparecer como plata de otros.{' '}
          <span className="text-slate-300">No:</span> sigue como dinero de terceros. No cambia el saldo de ninguna cuenta.
        </p>
        {error && <p className="text-xs text-gasto-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={guardando}>No</Button>
          <Button type="button" variant="primary" fullWidth loading={guardando} onClick={pasarAMiDinero}>Sí, es mío</Button>
        </div>
      </div>
    </Modal>
  )
}
