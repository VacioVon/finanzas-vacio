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

              {/* Tarjeta virtual: dinero de terceros — dos bloques independientes */}
              {terceros && (terceros.fondos > 0 || terceros.gastos > 0) && (
                <div className="rounded-2xl border border-dashed border-slate-600/50 bg-night-2/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Dinero de terceros
                    </p>
                    <span className="text-[10px] text-slate-600 ml-auto">Saldo virtual</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Por devolver — fondos recibidos que pertenecen a otros */}
                    {terceros.fondos > 0 && (
                      <div className="rounded-xl bg-night-3/60 border border-gasto-500/20 px-3 py-2.5">
                        <p className="text-[10px] text-slate-500 mb-1 leading-none">Debo devolver</p>
                        <p className="text-sm font-bold tabular-nums text-gasto-400 leading-none">
                          {formatCLP(terceros.fondos)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">plata de otros en tu cuenta</p>
                      </div>
                    )}

                    {/* Por cobrar — lo que gastaste para otros */}
                    {terceros.gastos > 0 && (
                      <div className="rounded-xl bg-night-3/60 border border-ingreso-500/20 px-3 py-2.5">
                        <p className="text-[10px] text-slate-500 mb-1 leading-none">Por cobrar</p>
                        <p className="text-sm font-bold tabular-nums text-ingreso-400 leading-none">
                          {formatCLP(terceros.gastos)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">otros te deben a ti</p>
                      </div>
                    )}
                  </div>
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
