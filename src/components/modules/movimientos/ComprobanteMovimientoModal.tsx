import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FileUploader } from '@/components/ui/FileUploader'
import { useSetComprobanteMovimiento } from '@/hooks/useMovimientos'
import type { Movimiento } from '@/types/app.types'

interface Props {
  isOpen:     boolean
  onClose:    () => void
  movimiento: Movimiento
}

/**
 * Adjuntar / cambiar / quitar el comprobante de un movimiento YA registrado.
 * Solo escribe la columna comprobante_url: no toca montos, saldos, deudas ni tarjetas,
 * por eso funciona con cualquier tipo de movimiento (incluidos los pagos de deuda).
 */
export function ComprobanteMovimientoModal({ isOpen, onClose, movimiento }: Props) {
  const guardar = useSetComprobanteMovimiento()
  const [url, setUrl] = useState<string | null>(movimiento.comprobante_url)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

  // El estado de la base siempre queda igual al de la pantalla: cada cambio se guarda al instante.
  async function cambiar(nuevaUrl: string | null) {
    setError(''); setGuardado(false)
    try {
      await guardar.mutateAsync({ id: movimiento.id, url: nuevaUrl })
      setUrl(nuevaUrl)
      setGuardado(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'No se pudo guardar el comprobante'))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comprobante del movimiento" theme="dark" accent="#2979FF">
      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          Solo se guarda el archivo (imagen o PDF, máx. 5 MB). <span className="text-slate-300">No cambia el monto,
          los saldos ni las deudas.</span>
        </p>

        <FileUploader value={url} onChange={cambiar} />

        {guardar.isPending && <p className="text-xs text-slate-500">Guardando…</p>}
        {guardado && !guardar.isPending && <p className="text-xs text-ingreso-400">Comprobante guardado.</p>}
        {error && <p className="text-xs text-gasto-400">{error}</p>}

        <Button type="button" variant="primary" fullWidth onClick={onClose}>Listo</Button>
      </div>
    </Modal>
  )
}
