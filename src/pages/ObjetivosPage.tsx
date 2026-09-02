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

  const totalAhorrado = activos.reduce((s, o) => s + o.monto_actual, 0)
  const totalMeta     = activos.reduce((s, o) => s + o.monto_objetivo, 0)

  return (
    <AppLayout nebula="#9B5DE5">
      <Header title="Objetivos de Ahorro" />

      <div className="space-y-4 pt-4 px-4 lg:px-0 pb-8">
        {/* Resumen global */}
        {activos.length > 0 && (
          <Card variant="gold" padding="md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total ahorrado</p>
                <p className="text-xl font-bold text-gold-500 tabular-nums">{formatCLP(totalAhorrado)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Meta total</p>
                <p className="text-xl font-bold text-white tabular-nums">{formatCLP(totalMeta)}</p>
              </div>
            </div>
            {totalMeta > 0 && (
              <>
                <div className="h-2 bg-night-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalAhorrado / totalMeta) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 text-right tabular-nums">
                  {Math.round((totalAhorrado / totalMeta) * 100)}% del total
                </p>
              </>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {activos.map(o => (
                  <ObjetivoCard key={o.id} objetivo={o} />
                ))}
              </div>
            )}

            {completados.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Completados
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {completados.map(o => (
                    <ObjetivoCard key={o.id} objetivo={o} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB mobile — desktop usa "Nuevo objetivo" en sidebar si se agrega, por ahora visible en ambos */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 size-14 bg-gold-500 text-night-0 rounded-full shadow-glow-gold flex items-center justify-center hover:bg-gold-400 active:scale-95 transition-all z-30"
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
