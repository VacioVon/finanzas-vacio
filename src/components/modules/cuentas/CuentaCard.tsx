import { Pencil, Trash2, CalendarClock, Percent } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import type { Cuenta } from '@/types/app.types'
import { iconoCuenta, labelTipoCuenta } from '@/utils/financial'
import { useDeleteCuenta } from '@/hooks/useCuentas'
import { formatCLP } from '@/utils/currency'

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
          className="size-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${cuenta.color}20` }}
        >
          {iconoCuenta(cuenta.tipo)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">{cuenta.nombre}</p>
          <p className="text-xs text-slate-400">{labelTipoCuenta(cuenta.tipo)}</p>
          {cuenta.institucion && (
            <p className="text-xs text-slate-500">{cuenta.institucion}</p>
          )}
        </div>

        <div className="text-right">
          <CurrencyDisplay
            amount={cuenta.saldo_actual}
            size="sm"
            tipo={isCreditCard ? 'gasto' : undefined}
          />
          {isCreditCard && cuenta.limite && (
            <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
              Límite: {formatCLP(cuenta.limite)}
            </p>
          )}
        </div>
      </div>

      {/* Metadata tarjeta de crédito */}
      {isCreditCard && (cuenta.dia_facturacion || cuenta.dia_vencimiento || cuenta.pago_minimo_pct) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-night-border/40">
          {cuenta.dia_facturacion && (
            <div className="flex items-center gap-1 text-[10px] bg-night-3 px-2 py-1 rounded-lg text-slate-400">
              <CalendarClock className="h-3 w-3 text-brand-400" />
              Cierra día {cuenta.dia_facturacion}
            </div>
          )}
          {cuenta.dia_vencimiento && (
            <div className="flex items-center gap-1 text-[10px] bg-night-3 px-2 py-1 rounded-lg text-slate-400">
              <CalendarClock className="h-3 w-3 text-xp-400" />
              Vence día {cuenta.dia_vencimiento}
            </div>
          )}
          {cuenta.pago_minimo_pct && cuenta.pago_minimo_pct > 0 && cuenta.saldo_actual < 0 && (
            <div className="flex items-center gap-1 text-[10px] bg-night-3 px-2 py-1 rounded-lg text-slate-400">
              <Percent className="h-3 w-3 text-gasto-400" />
              Mín: {formatCLP(Math.ceil(Math.abs(cuenta.saldo_actual) * cuenta.pago_minimo_pct / 100))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-night-border/40">
        <button
          onClick={() => onEdit(cuenta)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors px-2 py-1 rounded-lg hover:bg-brand-500/10"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-gasto-400 transition-colors px-2 py-1 rounded-lg hover:bg-gasto-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </Card>
  )
}
