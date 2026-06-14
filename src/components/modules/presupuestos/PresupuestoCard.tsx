import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PresupuestoForm } from './PresupuestoForm'
import { useDeletePresupuesto } from '@/hooks/usePresupuestos'
import { formatCLP } from '@/utils/currency'
import type { PresupuestoConProgreso } from '@/types/app.types'

interface PresupuestoCardProps {
  presupuesto: PresupuestoConProgreso
  mes:         number
  anio:        number
}

export function PresupuestoCard({ presupuesto: p, mes, anio }: PresupuestoCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const deleteMutation = useDeletePresupuesto()

  const colorBar: 'red' | 'orange' | 'green' = p.excedido
    ? 'red'
    : p.porcentaje >= 80
    ? 'orange'
    : 'green'

  function handleDelete() {
    if (!confirm(`¿Eliminar presupuesto de ${p.categoria?.nombre ?? 'esta categoría'}?`)) return
    deleteMutation.mutate(p.id)
  }

  return (
    <>
      <Card padding="sm">
        <div className="flex items-center gap-3">
          {/* Ícono */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${p.categoria?.color ?? '#6B7280'}20` }}
          >
            {p.categoria?.emoji ?? '📁'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {p.categoria?.nombre ?? 'Sin categoría'}
              </p>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {p.excedido && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger-50 text-danger-700">
                    Excedido
                  </span>
                )}
                <button
                  onClick={() => setEditOpen(true)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Pencil className="h-3 w-3 text-slate-400" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3 text-danger-400" />
                </button>
              </div>
            </div>

            <ProgressBar value={p.porcentaje} color={colorBar} />

            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs font-medium ${p.excedido ? 'text-danger-600' : 'text-slate-600'}`}>
                {formatCLP(p.gastado)}
              </span>
              <span className="text-xs text-slate-400">
                de {formatCLP(p.monto_presupuestado)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <PresupuestoForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        mes={mes}
        anio={anio}
        editing={p}
      />
    </>
  )
}
