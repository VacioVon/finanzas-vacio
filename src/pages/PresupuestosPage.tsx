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

  function navegar(delta: 1 | -1) {
    const { mes: nm, anio: na } = navegarMes(mes, anio, delta)
    setMes(nm)
    setAnio(na)
  }

  return (
    <AppLayout>
      <Header title="Presupuestos" />

      <div className="space-y-4 pt-4 px-4">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegar(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-card hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <p className="text-base font-semibold text-slate-900 capitalize">
            {labelMesAnio(mes, anio)}
          </p>
          <button
            onClick={() => navegar(1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-card hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Resumen del mes */}
        {(presupuestos?.length ?? 0) > 0 && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">Resumen del mes</p>
              <span className={`text-sm font-bold ${totalGastado > totalPresupuestado ? 'text-danger-600' : 'text-success-600'}`}>
                {Math.round(pctTotal)}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totalGastado > totalPresupuestado ? 'bg-danger-500' : 'bg-success-500'}`}
                style={{ width: `${pctTotal}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-500">Gastado: <strong>{formatCLP(totalGastado)}</strong></span>
              <span className="text-xs text-slate-500">Presupuesto: <strong>{formatCLP(totalPresupuestado)}</strong></span>
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
          <div className="space-y-2">
            {presupuestos!.map(p => (
              <PresupuestoCard key={p.id} presupuesto={p} mes={mes} anio={anio} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all z-30"
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
