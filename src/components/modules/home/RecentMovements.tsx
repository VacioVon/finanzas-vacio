import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import { useMovimientos } from '@/hooks/useMovimientos'
import { formatDate } from '@/utils/dates'

export function RecentMovements() {
  const navigate = useNavigate()
  const { data: movimientos, isLoading } = useMovimientos({ limit: 5 })

  if (isLoading) return <div className="px-4 lg:px-0"><SkeletonList count={3} /></div>

  return (
    <div className="px-4 lg:px-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400">Últimos movimientos</h3>
        <button
          onClick={() => navigate('/movimientos')}
          className="flex items-center gap-0.5 text-xs text-brand-400 font-medium hover:text-brand-300 transition-colors"
        >
          Ver todos <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {!movimientos?.length ? (
        <Card>
          <EmptyState
            icon="📝"
            title="Sin movimientos"
            description="Registra tu primer ingreso o gasto"
            action={{ label: 'Agregar', onClick: () => navigate('/movimientos') }}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {movimientos.map(mov => (
            <Card key={mov.id} padding="sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 border border-night-border/60"
                  style={{ backgroundColor: `${mov.categoria?.color ?? '#6B7280'}18` }}
                >
                  {mov.categoria?.emoji ?? '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {mov.categoria?.nombre ?? 'Sin categoría'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {mov.subcategoria?.nombre ? `${mov.subcategoria.nombre} · ` : ''}
                    {formatDate(mov.fecha)}
                  </p>
                </div>
                <CurrencyDisplay
                  amount={mov.monto}
                  size="sm"
                  showSign
                  tipo={mov.tipo}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
