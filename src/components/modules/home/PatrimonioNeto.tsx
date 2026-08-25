import { Card } from '@/components/ui/Card'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import { useCuentas } from '@/hooks/useCuentas'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatCLP } from '@/utils/currency'

interface PatrimonioNetoProps {
  totalDeudas: number
}

export function PatrimonioNeto({ totalDeudas }: PatrimonioNetoProps) {
  const { data: cuentas, isLoading } = useCuentas()

  if (isLoading) return <div className="px-4 lg:px-0"><SkeletonCard /></div>

  const totalCuentas = (cuentas ?? [])
    .filter(c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((s, c) => s + c.saldo_actual, 0)

  const totalInversiones = (cuentas ?? [])
    .filter(c => c.activa && c.tipo === 'inversion')
    .reduce((s, c) => s + c.saldo_actual, 0)

  const totalTarjetas = (cuentas ?? [])
    .filter(c => c.activa && c.tipo === 'credito')
    .reduce((s, c) => s + c.saldo_actual, 0)

  const patrimonioNeto  = totalCuentas + totalInversiones + totalTarjetas - totalDeudas
  const tieneCredito    = (cuentas ?? []).some(c => c.activa && c.tipo === 'credito')

  return (
    <div className="px-4 lg:px-0">
      <Card>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Patrimonio Neto</p>
        <CurrencyDisplay
          amount={patrimonioNeto}
          size="xl"
          className={patrimonioNeto >= 0 ? 'text-white' : 'text-gasto-400'}
        />
        <div className={`mt-3 grid gap-2 pt-3 border-t border-night-border/40 ${tieneCredito ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <p className="text-[10px] text-slate-500">Cuentas</p>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">{formatCLP(totalCuentas)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Inversiones</p>
            <p className="text-xs font-semibold text-ingreso-400 mt-0.5">{formatCLP(totalInversiones)}</p>
          </div>
          {tieneCredito && (
            <div>
              <p className="text-[10px] text-slate-500">Tarjetas</p>
              <p className={`text-xs font-semibold mt-0.5 ${totalTarjetas < 0 ? 'text-gasto-400' : 'text-slate-300'}`}>
                {formatCLP(totalTarjetas)}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-500">Deudas ext.</p>
            <p className="text-xs font-semibold text-gasto-400 mt-0.5">
              {totalDeudas > 0 ? `-${formatCLP(totalDeudas)}` : formatCLP(0)}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          Cuentas + Inversiones + Tarjetas (negativo) − Deudas externas
        </p>
      </Card>
    </div>
  )
}
