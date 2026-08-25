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

function mensualEquivalente(monto: number, frecuencia: string): number {
  switch (frecuencia) {
    case 'semanal':    return monto * 4.33
    case 'quincenal':  return monto * 2
    case 'mensual':    return monto
    case 'bimestral':  return monto / 2
    case 'trimestral': return monto / 3
    case 'semestral':  return monto / 6
    case 'anual':      return monto / 12
    default:           return monto
  }
}

export function SuscripcionesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const { data: suscripciones, isLoading } = useSuscripciones()

  const activas  = (suscripciones ?? []).filter(s => s.activa)
  const pausadas = (suscripciones ?? []).filter(s => !s.activa)

  const servicios   = activas.filter(s => (s.tipo ?? 'servicio') === 'servicio')
  const gastosFijos = activas.filter(s => s.tipo === 'gasto_fijo')

  const vencidos = activas.filter(s => {
    if (!s.proxima_fecha) return false
    const dias = Math.floor((new Date(s.proxima_fecha).getTime() - Date.now()) / 86400000)
    return dias < 0
  }).length

  const totalMensual = activas.reduce((sum, s) => sum + mensualEquivalente(s.monto, s.frecuencia), 0)

  return (
    <AppLayout>
      <Header
        title="Compromisos"
        action={
          <button
            onClick={() => setFormOpen(true)}
            className="size-9 flex items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            aria-label="Nuevo compromiso"
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
              <p className="text-xs text-slate-400 font-medium">Equivalente mensual</p>
              <p className="text-xl font-bold text-white tabular-nums">{formatCLP(Math.round(totalMensual))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{activas.length} activo{activas.length !== 1 ? 's' : ''}</p>
              {vencidos > 0 && (
                <p className="text-xs font-semibold text-gasto-400">{vencidos} vencido{vencidos !== 1 ? 's' : ''}</p>
              )}
              {pausadas.length > 0 && (
                <p className="text-xs text-slate-500">{pausadas.length} pausado{pausadas.length !== 1 ? 's' : ''}</p>
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
            icon="📋"
            title="Sin compromisos"
            description="Registra tus gastos recurrentes y obligaciones fijas para proyectar tu flujo de caja."
            action={{ label: 'Agregar compromiso', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <>
            {servicios.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  Servicios
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {servicios.map(s => <SuscripcionCard key={s.id} suscripcion={s} />)}
                </div>
              </div>
            )}

            {gastosFijos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  Gastos fijos
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {gastosFijos.map(s => <SuscripcionCard key={s.id} suscripcion={s} />)}
                </div>
              </div>
            )}

            {pausadas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  Pausados
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
