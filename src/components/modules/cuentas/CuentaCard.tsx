import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import type { Cuenta } from '@/types/app.types'
import { iconoCuenta, labelTipoCuenta } from '@/utils/financial'
import { useDeleteCuenta } from '@/hooks/useCuentas'

interface CuentaCardProps {
  cuenta: Cuenta
  onEdit: (cuenta: Cuenta) => void
}

export function CuentaCard({ cuenta, onEdit }: CuentaCardProps) {
  const deleteMutation = useDeleteCuenta()

  function handleDelete() {
    if (confirm(`¿Eliminar la cuenta "${cuenta.nombre}"?`)) {
      deleteMutation.mutate(cuenta.id)
    }
  }

  const isCreditCard = cuenta.tipo === 'credito'

  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${cuenta.color}20` }}
        >
          {iconoCuenta(cuenta.tipo)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{cuenta.nombre}</p>
          <p className="text-xs text-slate-400">{labelTipoCuenta(cuenta.tipo)}</p>
          {cuenta.institucion && (
            <p className="text-xs text-slate-400">{cuenta.institucion}</p>
          )}
        </div>

        <div className="text-right">
          <CurrencyDisplay
            amount={isCreditCard ? (cuenta.saldo_actual) : cuenta.saldo_actual}
            size="sm"
            className={isCreditCard ? 'text-danger-600' : 'text-slate-900'}
          />
          {isCreditCard && cuenta.limite && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              Límite: ${cuenta.limite.toLocaleString('es-CL')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={() => onEdit(cuenta)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-danger-600 transition-colors px-2 py-1 rounded-lg hover:bg-danger-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </Card>
  )
}
