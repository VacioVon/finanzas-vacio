import { useState } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { MovimientoCard } from '@/components/modules/movimientos/MovimientoCard'
import { MovimientoFilters } from '@/components/modules/movimientos/MovimientoFilters'
import { MovimientoForm } from '@/components/modules/movimientos/MovimientoForm'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { useMovimientos } from '@/hooks/useMovimientos'
import { useMovimientosDelMes } from '@/hooks/useMovimientos'
import { formatCLP } from '@/utils/currency'

type Filtro = 'todos' | 'ingreso' | 'gasto' | 'ahorro' | 'pago_deuda'

export function MovimientosPage() {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: movimientos, isLoading } = useMovimientos({
    tipo: filtro === 'todos' ? undefined : filtro,
    search: search || undefined
  })

  const { data: movimientosMes } = useMovimientosDelMes()

  const ingresos = (movimientosMes ?? []).filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  // Excluir gastos para terceros del resumen personal (igual que HomePage)
  const gastos   = (movimientosMes ?? []).filter(m => m.tipo === 'gasto' && !m.para_tercero).reduce((s, m) => s + m.monto, 0)

  return (
    <AppLayout nebula="#2979FF">
      <Header
        title="Movimientos"
        action={
          <Button size="sm" variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        }
      />

      <div className="space-y-3 pt-4">
        {/* Resumen del mes */}
        {(ingresos > 0 || gastos > 0) && (
          <div className="px-4 lg:px-0 grid grid-cols-2 gap-3">
            <div className="bg-ingreso-500/10 border border-ingreso-500/20 rounded-2xl p-3">
              <p className="text-xs text-ingreso-400 font-medium">Ingresos este mes</p>
              <p className="text-base font-bold text-ingreso-300 mt-0.5 tabular-nums">{formatCLP(ingresos)}</p>
            </div>
            <div className="bg-gasto-500/10 border border-gasto-500/20 rounded-2xl p-3">
              <p className="text-xs text-gasto-400 font-medium">Gastos este mes</p>
              <p className="text-base font-bold text-gasto-300 mt-0.5 tabular-nums">{formatCLP(gastos)}</p>
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="px-4 lg:px-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en notas..."
              className="w-full h-11 pl-9 pr-9 rounded-xl border border-night-border bg-night-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <MovimientoFilters active={filtro} onChange={setFiltro} />

        {/* Lista */}
        <div className="px-4 lg:px-0 pb-8">
          {isLoading ? (
            <SkeletonList count={5} />
          ) : !movimientos?.length ? (
            <EmptyState
              icon="💸"
              title="Sin movimientos"
              description={filtro !== 'todos' ? 'No hay movimientos con este filtro' : 'Registra tu primer movimiento'}
              action={{ label: 'Agregar movimiento', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {movimientos.map(mov => (
                <MovimientoCard key={mov.id} movimiento={mov} />
              ))}
            </div>
          )}
        </div>
      </div>

      <MovimientoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
      />
    </AppLayout>
  )
}
