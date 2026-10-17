import { useState } from 'react'
import { ExternalLink, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ComprobanteMovimientoModal } from '@/components/modules/movimientos/ComprobanteMovimientoModal'
import { formatCLP } from '@/utils/currency'
import type { PagoDeudaHistorial, ContextoPago } from '@/types/app.types'

const CONTEXTO_LABEL: Record<ContextoPago, string> = {
  deuda_propia:        'Deuda propia',
  devolucion_prestamo: 'Devolución de préstamo',
  deuda_compartida:    'Deuda compartida',
  otro:                'Otro',
}

const TIPO_LABEL: Record<string, string> = {
  pago_deuda:    'Pago de deuda',
  pago_tarjeta:  'Pago de tarjeta',
  transferencia: 'Transferencia',
  gasto:         'Gasto',
}

const fechaLarga = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

interface Props {
  pago:    PagoDeudaHistorial
  deuda:   string                 // nombre de la deuda
  onClose: () => void
}

/** Toda la información de un pago de la deuda + adjuntar o cambiar su comprobante. */
export function PagoDeudaDetalleModal({ pago, deuda, onClose }: Props) {
  const [adjuntando, setAdjuntando] = useState(false)
  // El historial se recarga al guardar; mientras, se muestra el último valor guardado
  const [url, setUrl] = useState<string | null>(pago.comprobante_url ?? null)

  const filas: { etiqueta: string; valor: string | null }[] = [
    { etiqueta: 'Deuda',        valor: deuda.trim() },
    { etiqueta: 'Tipo',         valor: pago.tipo ? (TIPO_LABEL[pago.tipo] ?? pago.tipo) : null },
    { etiqueta: 'Fecha',        valor: fechaLarga(pago.fecha) },
    { etiqueta: 'Pagado desde', valor: pago.cuenta_nombre?.trim() ?? null },
    { etiqueta: 'Contexto',     valor: pago.contexto_pago ? CONTEXTO_LABEL[pago.contexto_pago] : null },
    { etiqueta: 'Capital',      valor: pago.capital != null ? formatCLP(pago.capital) : null },
    { etiqueta: 'Interés',      valor: pago.interes_pago ? formatCLP(pago.interes_pago) : null },
    { etiqueta: 'Dinero de terceros', valor: pago.fondos_tercero ? 'Sí, no es gasto mío' : null },
    { etiqueta: 'Nota',         valor: pago.nota?.trim() || null },
    { etiqueta: 'Registrado el', valor: fechaHora(pago.created_at) },
  ]

  return (
    <>
      <Modal isOpen onClose={onClose} title="Detalle del pago" theme="dark" accent="#F4645F">
        <div className="space-y-4" data-testid="detalle-pago">
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-white tabular-nums">{formatCLP(pago.monto)}</p>
          </div>

          <dl className="rounded-2xl border border-night-border bg-night-3/40 divide-y divide-night-border/50">
            {filas.filter(f => f.valor).map(f => (
              <div key={f.etiqueta} className="flex items-start justify-between gap-4 px-3 py-2.5">
                <dt className="text-xs text-slate-500 flex-shrink-0">{f.etiqueta}</dt>
                <dd className="text-xs text-slate-200 text-right break-words min-w-0">{f.valor}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-2xl border border-night-border bg-night-3/40 p-3 space-y-2">
            <p className="text-xs text-slate-500">Comprobante</p>
            {url ? (
              <a
                href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-300 hover:text-brand-200 underline"
              >
                <ExternalLink className="size-4" /> Ver comprobante
              </a>
            ) : (
              <p className="text-xs text-slate-600">Sin comprobante adjunto</p>
            )}
            <Button type="button" variant="secondary" fullWidth onClick={() => setAdjuntando(true)} data-testid="adjuntar-comprobante-pago">
              <Paperclip className="h-4 w-4" />
              {url ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
            </Button>
          </div>

          <Button type="button" variant="primary" fullWidth onClick={onClose}>Cerrar</Button>
        </div>
      </Modal>

      {adjuntando && (
        <ComprobanteMovimientoModal
          isOpen
          onClose={() => setAdjuntando(false)}
          movimiento={{ id: pago.id, comprobante_url: url }}
          onGuardado={setUrl}
        />
      )}
    </>
  )
}
