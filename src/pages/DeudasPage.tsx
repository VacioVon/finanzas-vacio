import { useMemo, useState } from 'react'
import { Plus, ListChecks } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { DeudaCard } from '@/components/modules/deudas/DeudaCard'
import { DeudaForm } from '@/components/modules/deudas/DeudaForm'
import { PagarDeudaForm } from '@/components/modules/deudas/PagarDeudaForm'
import { PagarVariasDeudasModal } from '@/components/modules/deudas/PagarVariasDeudasModal'
import { Button } from '@/components/ui/Button'
import { useDeudas } from '@/hooks/useDeudas'
import { useCuentas } from '@/hooks/useCuentas'
import { useMovimientosPorPeriodo } from '@/hooks/useMovimientos'
import { useAuthStore } from '@/store/authStore'
import { getCurrentMesAnio, etiquetaRangoPeriodo } from '@/utils/periodo'
import { resumenTarjetas } from '@/utils/deudasTarjeta'
import { DeudasTarjetaResumen } from '@/components/modules/deudas/DeudasTarjetaResumen'
import { PagarMontoTarjetaModal } from '@/components/modules/deudas/PagarMontoTarjetaModal'
import { formatCLP } from '@/utils/currency'
import type { Deuda } from '@/types/app.types'

type Filtro = 'todas' | 'activa' | 'tarjeta' | 'en_mora' | 'pagada'

const filtros: { value: Filtro; label: string }[] = [
  { value: 'todas',   label: 'Todas'    },
  { value: 'activa',  label: 'Activas'  },
  { value: 'tarjeta', label: 'Tarjeta (juntas)' },
  { value: 'en_mora', label: 'En mora'  },
  { value: 'pagada',  label: 'Pagadas'  }
]

export function DeudasPage() {
  const { data: deudas, isLoading } = useDeudas()
  const [filtro,   setFiltro]   = useState<Filtro>('activa')
  const [formOpen, setFormOpen] = useState(false)
  const [editing,  setEditing]  = useState<Deuda | null>(null)
  const [pagando,  setPagando]  = useState<Deuda | null>(null)
  const [pagoVarias, setPagoVarias] = useState(false)
  const [pagoMonto, setPagoMonto]   = useState(false)

  // Vista "Tarjeta (juntas)": deudas de tarjeta agrupadas + lo pagado en el período actual
  const { data: cuentas } = useCuentas()
  const { profile } = useAuthStore()
  const fechaSueldo = profile?.fecha_sueldo ?? 1
  const { mes: mesP, anio: anioP } = getCurrentMesAnio(fechaSueldo)
  const { data: movimientosPeriodo } = useMovimientosPorPeriodo(mesP, anioP, fechaSueldo)
  const resumenTarj = useMemo(
    () => resumenTarjetas(deudas ?? [], cuentas ?? [], (movimientosPeriodo ?? []).filter(m => m.tipo === 'pago_deuda')),
    [deudas, cuentas, movimientosPeriodo]
  )

  const lista = filtro === 'tarjeta' ? [] : (deudas ?? []).filter(d => filtro === 'todas' || d.estado === filtro || (filtro === 'activa' && d.estado === 'en_mora'))  // "Activas" incluye las que están en mora: siguen sin pagarse

  const activas        = (deudas ?? []).filter(d => d.estado === 'activa' || d.estado === 'en_mora')
  const totalPendiente = activas.reduce((s, d) => s + (d.monto_pendiente_real ?? Math.max(0, d.monto_total - (d.monto_pagado_real ?? 0))), 0)
  const totalPagado    = activas.reduce((s, d) => s + (d.monto_pagado_real ?? 0), 0)

  return (
    <AppLayout nebula="#F4645F">
      <Header
        title="Deudas"
        action={
          <Button size="sm" variant="secondary" onClick={() => setPagoVarias(true)}>
            <ListChecks className="h-4 w-4" />
            Pagar varias
          </Button>
        }
      />

      <div className="space-y-4 pt-4">

        {/* Resumen global */}
        {activas.length > 0 && (
          <div className="px-4 lg:px-0">
            <Card padding="none">
              <div className="grid grid-cols-3 divide-x divide-night-border/40">
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-500 mb-1">Pendiente</p>
                  <p className="text-sm font-bold text-gasto-400 tabular-nums">{formatCLP(totalPendiente)}</p>
                </div>
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-500 mb-1">Pagado</p>
                  <p className="text-sm font-bold text-ingreso-400 tabular-nums">{formatCLP(totalPagado)}</p>
                </div>
                <div className="flex flex-col items-center py-4 px-2">
                  <p className="text-[10px] text-slate-500 mb-1">Deudas</p>
                  <p className="text-sm font-bold text-white tabular-nums">{activas.length}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-4 lg:px-0">
          {filtros.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={[
                'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
                filtro === f.value
                  ? 'bg-gasto-500/20 text-gasto-300 border border-gasto-500/40'
                  : 'bg-night-2 text-slate-400 border border-night-border hover:border-gasto-500/30 hover:text-slate-300'
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="px-4 lg:px-0 pb-8">
          {isLoading ? (
            <SkeletonList count={3} />
          ) : filtro === 'tarjeta' ? (
            <DeudasTarjetaResumen resumen={resumenTarj} periodo={etiquetaRangoPeriodo(mesP, anioP, fechaSueldo)} onPagarMonto={() => setPagoMonto(true)} />
          ) : lista.length === 0 ? (
            <EmptyState
              icon="💳"
              title={filtro === 'todas' ? 'Sin deudas registradas' : `Sin deudas ${filtros.find(f => f.value === filtro)?.label.toLowerCase()}`}
              description={filtro === 'todas' ? 'Registra créditos, cuotas y préstamos para hacer seguimiento' : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 size-14 bg-gasto-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gasto-600 active:scale-95 transition-all z-30"
        aria-label="Nueva deuda"
      >
        <Plus className="h-7 w-7" />
      </button>

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
      <PagarVariasDeudasModal isOpen={pagoVarias} onClose={() => setPagoVarias(false)} />
      <PagarMontoTarjetaModal isOpen={pagoMonto} onClose={() => setPagoMonto(false)} resumen={resumenTarj} />
    </AppLayout>
  )
}
