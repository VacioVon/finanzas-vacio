import { useState, useRef, useEffect } from 'react'
import { Pencil, Copy, Trash2, MoreVertical, Paperclip, FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import { MovimientoForm } from './MovimientoForm'
import type { Movimiento } from '@/types/app.types'
import { formatDate } from '@/utils/dates'
import { useDeleteMovimiento } from '@/hooks/useMovimientos'

interface MovimientoCardProps {
  movimiento: Movimiento
}

const tipoLabel: Record<string, string> = {
  ingreso:       'Ingreso',
  gasto:         'Gasto',
  ahorro:        'Ahorro',
  pago_deuda:    'Pago deuda',
  transferencia: 'Transferencia'
}


function ComprobanteIcon({ url }: { url: string }) {
  const isPDF = url.toLowerCase().includes('.pdf')
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex items-center justify-center w-6 h-6 rounded-full bg-night-3 hover:bg-brand-500/20 transition-colors"
      title="Ver comprobante"
    >
      {isPDF
        ? <FileText className="h-3.5 w-3.5 text-gasto-400" />
        : <Paperclip className="h-3.5 w-3.5 text-slate-500" />
      }
    </a>
  )
}

const tipoBadgeVariant: Record<string, 'ingreso' | 'gasto' | 'ahorro' | 'mover' | 'xp' | 'muted'> = {
  ingreso:       'ingreso',
  gasto:         'gasto',
  ahorro:        'ahorro',
  pago_deuda:    'xp',
  transferencia: 'muted',
}

// Menú flotante con posición fija para evitar clipping en listas
function ContextMenu({
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
  anchorRef
}: {
  onEdit:       () => void
  onDuplicate:  () => void
  onDelete:     () => void
  onClose:      () => void
  anchorRef:    React.RefObject<HTMLButtonElement>
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Calcular posición relativa al botón.
  // IMPORTANTE: position:fixed es relativo al VIEWPORT, no al documento.
  // getBoundingClientRect() ya devuelve coords de viewport → NO sumar scrollY.
  useEffect(() => {
    if (!anchorRef.current || !menuRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menu = menuRef.current

    // Posicionar debajo del botón, alineado a la derecha
    let top  = rect.bottom + 4
    let left = rect.right - menu.offsetWidth

    // Evitar que salga por debajo del viewport
    if (top + menu.offsetHeight > window.innerHeight) {
      top = rect.top - menu.offsetHeight - 4
    }
    // Evitar que salga por la izquierda del viewport
    if (left < 8) left = 8

    menu.style.top  = `${top}px`
    menu.style.left = `${left}px`
  }, [anchorRef])

  return (
    <>
      {/* Overlay para cerrar al tocar fuera */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 bg-night-1 rounded-2xl shadow-card-lg border border-night-border py-1.5 w-44 animate-fade-in"
      >
        <button
          onClick={() => { onEdit(); onClose() }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-night-3/60 transition-colors"
        >
          <Pencil className="h-4 w-4 text-slate-400" />
          Editar
        </button>
        <button
          onClick={() => { onDuplicate(); onClose() }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-night-3/60 transition-colors"
        >
          <Copy className="h-4 w-4 text-slate-400" />
          Duplicar
        </button>
        <div className="mx-3 my-1 h-px bg-night-border/60" />
        <button
          onClick={() => { onDelete(); onClose() }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gasto-400 hover:bg-gasto-500/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </button>
      </div>
    </>
  )
}

export function MovimientoCard({ movimiento: mov }: MovimientoCardProps) {
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [editOpen,      setEditOpen]      = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const deleteMutation = useDeleteMovimiento()

  function handleDelete() {
    if (!confirm(`¿Eliminar este movimiento?\nSe revertirá el impacto en los saldos.`)) return
    deleteMutation.mutate(mov.id)
  }

  return (
    <>
      <Card padding="sm" className="relative">
        <div className="flex items-center gap-3">
          {/* Ícono categoría */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: `${mov.categoria?.color ?? '#6B7280'}18` }}
          >
            {mov.tipo === 'transferencia' ? '🔄' : (mov.categoria?.emoji ?? '💸')}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-semibold text-slate-200 truncate">
                {mov.tipo === 'transferencia'
                  ? `${mov.cuenta?.nombre ?? '?'} → ${mov.cuenta_destino?.nombre ?? '?'}`
                  : (mov.categoria?.nombre ?? 'Sin categoría')
                }
              </p>
              <Badge variant={tipoBadgeVariant[mov.tipo] ?? 'muted'} className="flex-shrink-0">
                {tipoLabel[mov.tipo] ?? mov.tipo}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {mov.subcategoria && (
                <>
                  <span className="text-xs text-slate-400">{mov.subcategoria.nombre}</span>
                  <span className="text-slate-200">·</span>
                </>
              )}
              <span className="text-xs text-slate-400">{formatDate(mov.fecha)}</span>
              {mov.cuenta && mov.tipo !== 'transferencia' && (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="text-xs text-slate-400">{mov.cuenta.nombre}</span>
                </>
              )}
            </div>
            {(mov.para_tercero || (mov.comision > 0)) && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {mov.para_tercero && (
                  <Badge variant="xp">
                    👥 Para{mov.tercero_nombre ? ` ${mov.tercero_nombre}` : ' tercero'}
                  </Badge>
                )}
                {mov.comision > 0 && (
                  <Badge variant="muted" className="tabular-nums">
                    +${mov.comision.toLocaleString('es-CL')} comisión
                  </Badge>
                )}
              </div>
            )}
            {mov.nota && (
              <p className="text-xs text-slate-400 mt-0.5 truncate italic">"{mov.nota}"</p>
            )}
          </div>

          {/* Monto + acciones */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {mov.comprobante_url && <ComprobanteIcon url={mov.comprobante_url} />}
            <CurrencyDisplay amount={mov.monto} size="sm" showSign tipo={mov.tipo} />
            <button
              ref={btnRef}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Opciones del movimiento"
              className="size-7 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </Card>

      {/* Menú contextual */}
      {menuOpen && (
        <ContextMenu
          anchorRef={btnRef}
          onEdit={()      => setEditOpen(true)}
          onDuplicate={() => setDuplicateOpen(true)}
          onDelete={handleDelete}
          onClose={()     => setMenuOpen(false)}
        />
      )}

      {/* Modal editar */}
      <MovimientoForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editingMovimiento={mov}
        onSuccess={() => setEditOpen(false)}
      />

      {/* Modal duplicar */}
      <MovimientoForm
        isOpen={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        duplicateFrom={mov}
        onSuccess={() => setDuplicateOpen(false)}
      />
    </>
  )
}
