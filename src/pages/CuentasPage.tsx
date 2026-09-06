import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { CuentaCard } from '@/components/modules/cuentas/CuentaCard'
import { CuentaForm } from '@/components/modules/cuentas/CuentaForm'
import { ValorizacionForm } from '@/components/modules/cuentas/ValorizacionForm'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useCuentas, useSaldoTerceros } from '@/hooks/useCuentas'
import { useValorizaciones } from '@/hooks/useValorizaciones'
import type { Cuenta } from '@/types/app.types'
import { formatCLP } from '@/utils/currency'

export function CuentasPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null)
  const [valorizandoCuenta, setValorizandoCuenta] = useState<Cuenta | null>(null)

  const { data: cuentas, isLoading } = useCuentas()
  const { data: valorizaciones } = useValorizaciones()
  const { data: terceros } = useSaldoTerceros()

  const totalDisponible = (cuentas ?? [])
    .filter(c => c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((s, c) => s + c.saldo_actual, 0)

  const totalInversiones = (cuentas ?? [])
    .filter(c => c.tipo === 'inversion')
    .reduce((s, c) => s + c.saldo_actual, 0)

  function handleEdit(cuenta: Cuenta) {
    setEditingCuenta(cuenta)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingCuenta(null)
  }

  return (
    <AppLayout nebula="#10D97F">
      <Header
        title="Cuentas"
        action={
          <Button size="sm" variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        }
      />

      <div className="space-y-4 pt-4">
        {/* Resumen */}
        {(cuentas?.length ?? 0) > 0 && (
          <div className="px-4 lg:px-0 grid grid-cols-2 gap-3">
            <Card padding="sm">
              <p className="text-xs text-slate-400 font-medium">Disponible</p>
              <p className="text-base font-bold text-white tabular-nums mt-0.5">{formatCLP(totalDisponible)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-slate-400 font-medium">Inversiones</p>
              <p className="text-base font-bold text-ingreso-400 tabular-nums mt-0.5">{formatCLP(totalInversiones)}</p>
            </Card>
          </div>
        )}

        {/* Lista */}
        <div className="px-4 lg:px-0 pb-8">
          {isLoading ? (
            <SkeletonList count={3} />
          ) : !cuentas?.length ? (
            <EmptyState
              icon="🏦"
              title="Sin cuentas"
              description="Agrega tu primera cuenta bancaria o digital"
              action={{ label: 'Agregar cuenta', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {cuentas.map(cuenta => (
                  <CuentaCard
                    key={cuenta.id}
                    cuenta={cuenta}
                    onEdit={handleEdit}
                    onActualizarValor={setValorizandoCuenta}
                    valorizaciones={valorizaciones}
                  />
                ))}
              </div>

              {/* Tarjeta virtual: saldo de dinero de terceros */}
              {terceros && (terceros.fondos > 0 || terceros.gastos > 0) && (
                <div className="rounded-2xl border border-dashed border-slate-600/50 bg-night-2/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0">
                        🤝
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">
                          Dinero de terceros
                        </p>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Saldo virtual · no afecta tus cuentas
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-base font-bold tabular-nums leading-none"
                        style={{ color: terceros.neto >= 0 ? '#10D97F' : '#F4645F' }}
                      >
                        {formatCLP(Math.abs(terceros.neto))}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {terceros.neto >= 0 ? 'por devolver' : 'por cobrar'}
                      </p>
                    </div>
                  </div>
                  {terceros.fondos > 0 && terceros.gastos > 0 && (
                    <div className="mt-3 flex gap-3 pt-3 border-t border-slate-700/40">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 mb-0.5">Recibido de terceros</p>
                        <p className="text-xs font-semibold tabular-nums text-slate-300">{formatCLP(terceros.fondos)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 mb-0.5">Gastado por terceros</p>
                        <p className="text-xs font-semibold tabular-nums text-slate-300">{formatCLP(terceros.gastos)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CuentaForm
        isOpen={showForm}
        onClose={handleClose}
        editingCuenta={editingCuenta}
      />

      {valorizandoCuenta && (
        <ValorizacionForm
          isOpen={!!valorizandoCuenta}
          onClose={() => setValorizandoCuenta(null)}
          cuenta={valorizandoCuenta}
        />
      )}
    </AppLayout>
  )
}
