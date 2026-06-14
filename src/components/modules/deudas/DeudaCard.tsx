import { useState } from 'react'
import { MoreVertical, Pencil, Trash2, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCLP } from '@/utils/currency'
import { useDeleteDeuda, useUpdateEstadoDeuda } from '@/hooks/useDeudas'
import type { Deuda } from '@/types/app.types'

interface DeudaCardProps {
  deuda:       Deuda
  onEdit:      (d: Deuda) => void
  onPagar:     (d: Deuda) => void
}

const estadoConfig = {
  activa:   { label: 'Activa',   color: 'bg-primary-50 text-primary-700',  icon: CreditCard },
  pagada:   { label: 'Pagada',   color: 'bg-success-50 text-success-700',  icon: CheckCircle },
  en_mora:  { label: 'En mora',  color: 'bg-danger-50  text-danger-700',   icon: AlertTriangle }
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

export function DeudaCard({ deuda, onEdit, onPagar }: DeudaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const deleteMutation      = useDeleteDeuda()
  const estadoMutation      = useUpdateEstadoDeuda()

  const pagado      = deuda.monto_total - deuda.monto_pendiente
  const porcentaje  = deuda.monto_total > 0
    ? Math.min(100, (pagado / deuda.monto_total) * 100)
    : 0
  const cuotasText  = deuda.cuotas_total > 1
    ? `${deuda.cuotas_pagadas} de ${deuda.cuotas_total} cuotas`
    : null

  const cfg = estadoConfig[deuda.estado]

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`¿Eliminar deuda "${deuda.nombre}"?\nNo se puede deshacer.`)) return
    deleteMutation.mutate(deuda.id)
  }

  function handleMarcarPagada() {
    setMenuOpen(false)
    estadoMutation.mutate({ id: deuda.id, estado: 'pagada' })
  }

  function handleMarcarMora() {
    setMenuOpen(false)
    estadoMutation.mutate({ id: deuda.id, estado: 'en_mora' })
  }

  function handleReactivar() {
    setMenuOpen(false)
    estadoMutation.mutate({ id: deuda.id, estado: 'activa' })
  }

  return (
    <Card padding="sm" className="relative">
      {/* Cabecera */}
      <div className="flex items-start gap-3">
        {/* Icono / emoji categoría */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${deuda.categoria?.color ?? '#6B7280'}20` }}
        >
          {deuda.categoria?.emoji ?? '💳'}
        </div>

        {/* Nombre + estado */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 truncate">{deuda.nombre}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          {cuotasText && (
            <p className="text-xs text-slate-400 mt-0.5">{cuotasText}</p>
          )}
        </div>

        {/* Menú */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {deuda.estado !== 'pagada' && (
                  <button
                    onClick={() => { setMenuOpen(false); onPagar(deuda) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-primary-500" />
                    Registrar pago
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onEdit(deuda) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="h-4 w-4 text-slate-400" />
                  Editar
                </button>
                {deuda.estado === 'activa' && (
                  <button
                    onClick={handleMarcarMora}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-warning-700 hover:bg-warning-50 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4 text-warning-500" />
                    Marcar en mora
                  </button>
                )}
                {deuda.estado === 'activa' && (
                  <button
                    onClick={handleMarcarPagada}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-success-700 hover:bg-success-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    Marcar como pagada
                  </button>
                )}
                {(deuda.estado === 'pagada' || deuda.estado === 'en_mora') && (
                  <button
                    onClick={handleReactivar}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-primary-500" />
                    Reactivar
                  </button>
                )}
                <div className="border-t border-slate-100" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Montos */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pendiente</p>
          <p className="text-lg font-bold text-slate-900">{formatCLP(deuda.monto_pendiente)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">de {formatCLP(deuda.monto_total)}</p>
          <p className="text-xs text-slate-500">{formatCLP(pagado)} pagado</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2">
        <ProgressBar
          value={pagado}
          max={deuda.monto_total}
          color="green"
          size="sm"
          showLabel
        />
      </div>

      {/* Metadatos: interés, cuota, próximo pago */}
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-slate-400">Interés</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {deuda.interes > 0 ? `${deuda.interes}%` : 'Sin interés'}
          </p>
        </div>
        {deuda.cuota_mensual ? (
          <div>
            <p className="text-[10px] text-slate-400">Cuota</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatCLP(deuda.cuota_mensual)}</p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-slate-400">Cuota</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Libre</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-slate-400">Próx. pago</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatFecha(deuda.fecha_prox_pago)}</p>
        </div>
      </div>
    </Card>
  )
}
