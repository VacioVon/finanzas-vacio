import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { DeudaCard } from '@/components/modules/deudas/DeudaCard'
import { DeudaForm } from '@/components/modules/deudas/DeudaForm'
import { PagarDeudaForm } from '@/components/modules/deudas/PagarDeudaForm'
import { useDeudas } from '@/hooks/useDeudas'
import { formatCLP } from '@/utils/currency'
import type { Deuda } from '@/types/app.types'

type Filtro = 'todas' | 'activa' | 'en_mora' | 'pagada'

const filtros: { value: Filtro; label: string }[] = [
  { value: 'todas',   label: 'Todas'    },
  { value: 'activa',  label: 'Activas'  },
  { value: 'en_mora', label: 'En mora'  },
  { value: 'pagada',  label: 'Pagadas'  }
]

export function DeudasPage() {
  const { data: deudas, isLoading } = useDeudas()
  const [filtro,    setFiltro]    = useState<Filtro>('todas')
  const [formOpen,  setFormOpen]  = useState(false)
  const [editing,   setEditing]   = useState<Deuda | null>(null)
  const [pagando,   setPagando]   = useState<Deuda | null>(null)

  const lista = (deudas ?? []).filter(d => filtro === 'todas' || d.estado === filtro)

  // Totales solo de activas + en mora
  const activas        = (deudas ?? []).filter(d => d.estado === 'activa' || d.estado === 'en_mora')
  const totalPendiente = activas.reduce((s, d) => s + d.monto_pendiente, 0)
  const totalOriginal  = activas.reduce((s, d) => s + d.monto_total, 0)
  const totalPagado    = totalOriginal - totalPendiente

  return (
    <AppLayout>
      <Header title="Deudas" />

      <div className="space-y-4 pt-4">

        {/* Resumen global */}
        {activas.length > 0 && (
          <div className="px-4">
            <Card padding="none">
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-400 mb-1">Pendiente</p>
                  <p className="text-sm font-bold text-danger-600">{formatCLP(totalPendiente)}</p>
                </div>
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-400 mb-1">Pagado</p>
                  <p className="text-sm font-bold text-success-600">{formatCLP(totalPagado)}</p>
                </div>
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-400 mb-1">Deudas</p>
                  <p className="text-sm font-bold text-slate-700">{activas.length}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-4">
          {filtros.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={[
                'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
                filtro === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="px-4">
          {isLoading ? (
            <SkeletonList count={3} />
          ) : lista.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💳</p>
              <p className="text-sm font-medium text-slate-600">
                {filtro === 'todas' ? 'Sin deudas registradas' : `Sin deudas ${filtros.find(f => f.value === filtro)?.label.toLowerCase()}`}
              </p>
              {filtro === 'todas' && (
                <p className="text-xs text-slate-400 mt-1">
                  Registra créditos, cuotas y préstamos para hacer seguimiento
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {lista.map(deuda => (
                <DeudaCard
                  key={deuda.id}
                  deuda={deuda}
                  onEdit={d => setEditing(d)}
                  onPagar={d => setPagando(d)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setFormOpen(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all z-30"
        aria-label="Nueva deuda"
      >
        <Plus className="h-7 w-7" />
      </button>

      <div className="h-4" />

      {/* Modales */}
      <DeudaForm
        isOpen={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        editing={editing}
      />

      {pagando && (
        <PagarDeudaForm
          isOpen={!!pagando}
          onClose={() => setPagando(null)}
          deuda={pagando}
        />
      )}
    </AppLayout>
  )
}
