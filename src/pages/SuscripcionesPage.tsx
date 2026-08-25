import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { SuscripcionCard } from '@/components/modules/suscripciones/SuscripcionCard'
import { SuscripcionForm } from '@/components/modules/suscripciones/SuscripcionForm'
import { useSuscripciones } from '@/hooks/useSuscripciones'
import { formatCLP } from '@/utils/currency'

export function SuscripcionesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const { data: suscripciones, isLoading } = useSuscripciones()

  const activas  = (suscripciones ?? []).filter(s => s.activa)
  const pausadas = (suscripciones ?? []).filter(s => !s.activa)

  const totalMensual = activas.reduce((sum, s) => {
    if (s.frecuencia === 'mensual') return sum + s.monto
    if (s.frecuencia === 'semanal') return sum + s.monto * 4.33
    if (s.frecuencia === 'anual')   return sum + s.monto / 12
    return sum
  }, 0)

  return (
    <AppLayout>
      <Header
        title="Suscripciones"
        action={
          <button
            onClick={() => setFormOpen(true)}
            className="size-9 flex items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-4 lg:px-0 pt-4 space-y-4 pb-8">

        {/* Resumen */}
        {activas.length > 0 && (
          <div className="bg-night-2 rounded-2xl border border-night-border/60 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Gasto mensual estimado</p>
              <p className="text-xl font-bold text-white tabular-nums">{formatCLP(Math.round(totalMensual))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{activas.length} activa{activas.length !== 1 ? 's' : ''}</p>
              {pausadas.length > 0 && (
                <p className="text-xs text-slate-300">{pausadas.length} pausada{pausadas.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : suscripciones?.length === 0 ? (
          <EmptyState
            icon="🔄"
            title="Sin suscripciones"
            description="Registra tus servicios recurrentes para no perder de vista cuándo se cobran."
            action={{ label: 'Agregar suscripción', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <>
            {activas.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {activas.map(s => <SuscripcionCard key={s.id} suscripcion={s} />)}
              </div>
            )}

            {pausadas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  Pausadas
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {pausadas.map(s => <SuscripcionCard key={s.id} suscripcion={s} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <SuscripcionForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </AppLayout>
  )
}
