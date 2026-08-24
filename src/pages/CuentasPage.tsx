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
import { useCuentas } from '@/hooks/useCuentas'
import { useValorizaciones } from '@/hooks/useValorizaciones'
import type { Cuenta } from '@/types/app.types'
import { formatCLP } from '@/utils/currency'

export function CuentasPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null)
  const [valorizandoCuenta, setValorizandoCuenta] = useState<Cuenta | null>(null)

  const { data: cuentas, isLoading } = useCuentas()
  const { data: valorizaciones } = useValorizaciones()

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
    <AppLayout>
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
          <div className="px-4 grid grid-cols-2 gap-3">
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
        <div className="px-4">
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
