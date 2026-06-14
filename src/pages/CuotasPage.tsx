import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { CuotaCard } from '@/components/modules/cuotas/CuotaCard'
import { CuotaForm } from '@/components/modules/cuotas/CuotaForm'
import { useCuotas } from '@/hooks/useCuotas'
import { formatCLP } from '@/utils/currency'
import type { CuotaCredito } from '@/types/app.types'

type Filtro = 'activas' | 'completadas' | 'todas'

const filtros: { value: Filtro; label: string }[] = [
  { value: 'activas',     label: 'Activas'     },
  { value: 'completadas', label: 'Completadas' },
  { value: 'todas',       label: 'Todas'       }
]

export function CuotasPage() {
  const { data: cuotas, isLoading } = useCuotas()
  const [filtro,   setFiltro]   = useState<Filtro>('activas')
  const [formOpen, setFormOpen] = useState(false)
  const [editing,  setEditing]  = useState<CuotaCredito | null>(null)

  const activas = (cuotas ?? []).filter(c => c.estado === 'activa')
  const lista   = (cuotas ?? []).filter(c => {
    if (filtro === 'activas')     return c.estado === 'activa'
    if (filtro === 'completadas') return c.estado === 'completada'
    return true
  })

  const compromisoMensual = activas.reduce((s, c) => s + c.monto_cuota, 0)
  const totalPendiente    = activas.reduce((s, c) => s + c.monto_cuota * (c.cuotas_total - c.cuotas_pagadas), 0)

  return (
    <AppLayout>
      <Header title="Compras en cuotas" />

      <div className="space-y-4 pt-4">

        {/* Resumen (solo si hay activas) */}
        {activas.length > 0 && (
          <div className="px-4">
            <Card padding="none">
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-400 mb-1">Cuota mensual</p>
                  <p className="text-sm font-bold text-slate-800">{formatCLP(compromisoMensual)}</p>
                </div>
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-400 mb-1">Pendiente total</p>
                  <p className="text-sm font-bold text-danger-600">{formatCLP(totalPendiente)}</p>
                </div>
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-400 mb-1">Compras</p>
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
              <p className="text-4xl mb-3">🛍️</p>
              <p className="text-sm font-medium text-slate-600">
                {filtro === 'activas' ? 'Sin compras en cuotas activas' : 'Sin compras en este estado'}
              </p>
              {filtro === 'activas' && (
                <p className="text-xs text-slate-400 mt-1">
                  Registra tus compras en cuotas para hacer seguimiento de lo que sigues pagando
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {lista.map(cuota => (
                <CuotaCard
                  key={cuota.id}
                  cuota={cuota}
                  onEdit={c => setEditing(c)}
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
        aria-label="Nueva compra en cuotas"
      >
        <Plus className="h-7 w-7" />
      </button>

      <div className="h-4" />

      <CuotaForm
        isOpen={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        editing={editing}
      />
    </AppLayout>
  )
}
