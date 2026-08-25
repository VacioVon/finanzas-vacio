import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PresupuestoCard } from '@/components/modules/presupuestos/PresupuestoCard'
import { PresupuestoForm } from '@/components/modules/presupuestos/PresupuestoForm'
import { usePresupuestosMes } from '@/hooks/usePresupuestos'
import { getCurrentMesAnio, navegarMes, labelMesAnio } from '@/utils/periodo'
import { formatCLP } from '@/utils/currency'

export function PresupuestosPage() {
  const { mes: mesHoy, anio: anioHoy } = getCurrentMesAnio()
  const [mes,  setMes]  = useState(mesHoy)
  const [anio, setAnio] = useState(anioHoy)
  const [formOpen, setFormOpen] = useState(false)

  const { data: presupuestos, isLoading } = usePresupuestosMes(mes, anio)

  const totalPresupuestado = (presupuestos ?? []).reduce((s, p) => s + p.monto_presupuestado, 0)
  const totalGastado       = (presupuestos ?? []).reduce((s, p) => s + p.gastado, 0)
  const pctTotal           = totalPresupuestado > 0 ? Math.min(100, (totalGastado / totalPresupuestado) * 100) : 0
  const categoriasUsadas   = (presupuestos ?? []).map(p => p.categoria_id)
  const sobrePasado        = totalGastado > totalPresupuestado

  function navegar(delta: 1 | -1) {
    const { mes: nm, anio: na } = navegarMes(mes, anio, delta)
    setMes(nm)
    setAnio(na)
  }

  return (
    <AppLayout>
      <Header title="Presupuestos" />

      <div className="space-y-4 pt-4 px-4 lg:px-0">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegar(-1)}
            className="size-9 flex items-center justify-center rounded-full bg-night-2 border border-night-border hover:bg-night-3 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-400" />
          </button>
          <p className="text-base font-semibold text-white capitalize">
            {labelMesAnio(mes, anio)}
          </p>
          <button
            onClick={() => navegar(1)}
            className="size-9 flex items-center justify-center rounded-full bg-night-2 border border-night-border hover:bg-night-3 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Resumen del mes */}
        {(presupuestos?.length ?? 0) > 0 && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-200">Resumen del mes</p>
              <span className={`text-sm font-bold tabular-nums ${sobrePasado ? 'text-gasto-400' : 'text-ingreso-400'}`}>
                {Math.round(pctTotal)}%
              </span>
            </div>
            <div className="h-2 bg-night-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${sobrePasado ? 'bg-gasto-500' : 'bg-ingreso-500'}`}
                style={{ width: `${pctTotal}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-500">Gastado: <strong className="text-slate-300 tabular-nums">{formatCLP(totalGastado)}</strong></span>
              <span className="text-xs text-slate-500">Presupuesto: <strong className="text-slate-300 tabular-nums">{formatCLP(totalPresupuestado)}</strong></span>
            </div>
          </Card>
        )}

        {/* Lista */}
        {isLoading ? (
          <SkeletonList count={4} />
        ) : (presupuestos?.length ?? 0) === 0 ? (
          <EmptyState
            icon="🎯"
            title="Sin presupuestos"
            description={`No tienes presupuestos para ${labelMesAnio(mes, anio)}. Crea uno para controlar tus gastos.`}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pb-8">
            {presupuestos!.map(p => (
              <PresupuestoCard key={p.id} presupuesto={p} mes={mes} anio={anio} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 size-14 bg-brand-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-600 active:scale-95 transition-all z-30"
        aria-label="Nuevo presupuesto"
      >
        <Plus className="h-7 w-7" />
      </button>

      <PresupuestoForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        mes={mes}
        anio={anio}
        categoriasUsadas={categoriasUsadas}
      />

      <div className="h-4" />
    </AppLayout>
  )
}
