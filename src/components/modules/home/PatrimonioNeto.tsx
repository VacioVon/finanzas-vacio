import { Card } from '@/components/ui/Card'
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay'
import { useCuentas } from '@/hooks/useCuentas'
import { useDeudas } from '@/hooks/useDeudas'
import { useCuentasPorCobrar } from '@/hooks/useCobros'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatCLP } from '@/utils/currency'
import { calcularPatrimonio } from '@/utils/financial'

/** Muestra el patrimonio usando la fuente única `calcularPatrimonio` (activos − pasivos). */
export function PatrimonioNeto() {
  const { data: cuentas, isLoading: cargandoCuentas } = useCuentas()
  const { data: deudas,  isLoading: cargandoDeudas }  = useDeudas()
  const { data: cobrar,  isLoading: cargandoCobrar }  = useCuentasPorCobrar()

  if (cargandoCuentas || cargandoDeudas || cargandoCobrar) {
    return <div className="px-4 lg:px-0"><SkeletonCard /></div>
  }

  const p = calcularPatrimonio(cuentas ?? [], deudas ?? [], cobrar ?? [])
  const neg = (n: number) => (n > 0 ? `-${formatCLP(n)}` : formatCLP(0))

  return (
    <div className="px-4 lg:px-0">
      <Card>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Patrimonio Neto</p>
        <CurrencyDisplay
          amount={p.patrimonioNeto}
          size="xl"
          className={p.patrimonioNeto >= 0 ? 'text-white' : 'text-gasto-400'}
        />

        <div className="mt-3 pt-3 border-t border-night-border/40 space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Activos</p>
              <p className="text-xs font-semibold text-ingreso-400 tabular-nums">{formatCLP(p.activos.total)}</p>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-slate-500">Cuentas</p>
                <p className="text-xs font-semibold text-slate-300 tabular-nums">{formatCLP(p.activos.cuentas)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Inversiones</p>
                <p className="text-xs font-semibold text-slate-300 tabular-nums">{formatCLP(p.activos.inversiones)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Por cobrar</p>
                <p className="text-xs font-semibold text-slate-300 tabular-nums">{formatCLP(p.activos.porCobrar)}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pasivos</p>
              <p className="text-xs font-semibold text-gasto-400 tabular-nums">{neg(p.pasivos.total)}</p>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-slate-500">Tarjetas</p>
                <p className="text-xs font-semibold text-slate-300 tabular-nums">{neg(p.pasivos.tarjetas)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Deudas</p>
                <p className="text-xs font-semibold text-slate-300 tabular-nums">{neg(p.pasivos.deudas)}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 mt-2">
          Activos − Pasivos. "Por cobrar" es patrimonio, no dinero disponible.
        </p>
      </Card>
    </div>
  )
}
