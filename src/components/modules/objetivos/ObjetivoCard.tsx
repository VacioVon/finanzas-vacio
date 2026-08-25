import { useState } from 'react'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ObjetivoForm } from './ObjetivoForm'
import { AgregarFondosForm } from './AgregarFondosForm'
import { useDeleteObjetivo } from '@/hooks/useObjetivos'
import { formatCLP } from '@/utils/currency'
import type { ObjetivoAhorro } from '@/types/app.types'

interface ObjetivoCardProps {
  objetivo: ObjetivoAhorro
}

export function ObjetivoCard({ objetivo: obj }: ObjetivoCardProps) {
  const [editOpen,   setEditOpen]   = useState(false)
  const [fondosOpen, setFondosOpen] = useState(false)
  const deleteMutation = useDeleteObjetivo()

  const porcentaje = obj.monto_objetivo > 0
    ? Math.min(100, (obj.monto_actual / obj.monto_objetivo) * 100)
    : 0
  const completado = obj.monto_actual >= obj.monto_objetivo

  let diasRestantes: number | null = null
  if (obj.fecha_objetivo) {
    const hoy = new Date()
    const meta = new Date(obj.fecha_objetivo)
    diasRestantes = Math.ceil((meta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar objetivo "${obj.nombre}"?\nSe perderá el historial de seguimiento.`)) return
    deleteMutation.mutate(obj.id)
  }

  return (
    <>
      <Card variant={completado ? 'default' : 'gold'} padding="md">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="size-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: completado ? `${obj.color}18` : 'rgba(201,162,39,0.12)' }}
          >
            {completado ? '🏆' : (obj.emoji ?? '🎯')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{obj.nombre}</p>
            {obj.descripcion && (
              <p className="text-xs text-slate-400 truncate">{obj.descripcion}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {completado && (
              <Badge variant="gold" className="mr-1">⭐ Meta alcanzada</Badge>
            )}
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Editar objetivo"
              className="size-7 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Eliminar objetivo"
              className="size-7 flex items-center justify-center rounded-full hover:bg-gasto-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-gasto-400" />
            </button>
          </div>
        </div>

        {/* Progreso */}
        <ProgressBar
          value={porcentaje}
          color={completado ? 'gold' : 'gold'}
          size="md"
        />

        {/* Montos y botón */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className={`text-sm font-bold tabular-nums ${completado ? 'text-gold-500' : 'text-white'}`}>
              {formatCLP(obj.monto_actual)}
            </p>
            <p className="text-xs text-slate-400 tabular-nums">de {formatCLP(obj.monto_objetivo)}</p>
          </div>
          <div className="flex items-center gap-2">
            {diasRestantes !== null && !completado && (
              <Badge variant={diasRestantes < 0 ? 'gasto' : diasRestantes <= 30 ? 'xp' : 'muted'}>
                {diasRestantes < 0 ? 'Vencido' : diasRestantes === 0 ? 'Hoy' : `${diasRestantes}d`}
              </Badge>
            )}
            {!completado && (
              <button
                onClick={() => setFondosOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/12 text-gold-500 text-xs font-medium hover:bg-gold-500/20 transition-colors border border-gold-500/20"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Agregar
              </button>
            )}
          </div>
        </div>
      </Card>

      <ObjetivoForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editing={obj}
      />
      <AgregarFondosForm
        isOpen={fondosOpen}
        onClose={() => setFondosOpen(false)}
        objetivo={obj}
      />
    </>
  )
}
