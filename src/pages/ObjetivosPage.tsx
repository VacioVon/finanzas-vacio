import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ObjetivoCard } from '@/components/modules/objetivos/ObjetivoCard'
import { ObjetivoForm } from '@/components/modules/objetivos/ObjetivoForm'
import { useObjetivos } from '@/hooks/useObjetivos'
import { formatCLP } from '@/utils/currency'

export function ObjetivosPage() {
  const [formOpen, setFormOpen] = useState(false)
  const { data: objetivos, isLoading } = useObjetivos()

  const activos    = (objetivos ?? []).filter(o => o.estado !== 'completado')
  const completados = (objetivos ?? []).filter(o => o.estado === 'completado' || o.monto_actual >= o.monto_objetivo)

  const totalAhorrado  = activos.reduce((s, o) => s + o.monto_actual, 0)
  const totalMeta      = activos.reduce((s, o) => s + o.monto_objetivo, 0)

  return (
    <AppLayout>
      <Header title="Objetivos de Ahorro" />

      <div className="space-y-4 pt-4 px-4">
        {/* Resumen global */}
        {activos.length > 0 && (
          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total ahorrado</p>
                <p className="text-xl font-bold text-primary-600">{formatCLP(totalAhorrado)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Meta total</p>
                <p className="text-xl font-bold text-slate-900">{formatCLP(totalMeta)}</p>
              </div>
            </div>
            {totalMeta > 0 && (
              <div className="mt-3">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalAhorrado / totalMeta) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {Math.round((totalAhorrado / totalMeta) * 100)}% alcanzado
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Activos */}
        {isLoading ? (
          <SkeletonList count={3} />
        ) : activos.length === 0 && completados.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="Sin objetivos"
            description="Crea tu primer objetivo de ahorro para comenzar a ahorrar de forma inteligente."
          />
        ) : (
          <>
            {activos.length > 0 && (
              <div className="space-y-3">
                {activos.map(o => (
                  <ObjetivoCard key={o.id} objetivo={o} />
                ))}
              </div>
            )}

            {/* Completados */}
            {completados.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Completados
                </p>
                <div className="space-y-2">
                  {completados.map(o => (
                    <ObjetivoCard key={o.id} objetivo={o} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="Nuevo objetivo"
      >
        <Plus className="h-7 w-7" />
      </button>

      <ObjetivoForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />

      <div className="h-4" />
    </AppLayout>
  )
}
