import { useState } from 'react'
import { Bell, ChevronRight } from 'lucide-react'
import { useIngresosPendientesHoy } from '@/hooks/useIngresosRecurrentes'
import { ConfirmarIngresoModal } from './ConfirmarIngresoModal'
import type { IngresoPendienteHoy } from '@/types/ingresos-recurrentes.types'

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export function IngresosPendientesAlert() {
  const { data: pendientes, isLoading } = useIngresosPendientesHoy()
  const [activo, setActivo] = useState<IngresoPendienteHoy | null>(null)

  if (isLoading || !pendientes || pendientes.length === 0) return null

  const total = pendientes.reduce((s, p) => s + p.monto_esperado, 0)

  return (
    <>
      <div className="rounded-2xl border border-ingreso-500/30 bg-ingreso-500/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <div className="size-8 rounded-xl bg-ingreso-500/15 flex items-center justify-center flex-shrink-0">
            <Bell className="size-4 text-ingreso-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ingreso-300">
              {pendientes.length === 1
                ? 'Ingreso esperado hoy'
                : `${pendientes.length} ingresos esperados hoy`}
            </p>
            <p className="text-[11px] text-slate-500 tabular-nums">
              Total proyectado: {formatCLP(total)}
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="divide-y divide-night-border/40 pb-1">
          {pendientes.map(p => (
            <button
              key={p.instancia_id}
              onClick={() => setActivo(p)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ingreso-500/10 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{p.nombre}</p>
                {p.fuente_nombre && (
                  <p className="text-[11px] text-slate-500 truncate">{p.fuente_nombre}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-ingreso-400 tabular-nums">
                  {formatCLP(p.monto_esperado)}
                </p>
                {p.tipo_fecha === 'aproximado' && (
                  <p className="text-[10px] text-slate-600">±{p.tolerancia_dias}d</p>
                )}
              </div>
              <ChevronRight className="size-4 text-slate-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {activo && (
        <ConfirmarIngresoModal
          instancia={activo}
          onClose={() => setActivo(null)}
        />
      )}
    </>
  )
}
