import { AppLayout } from '@/components/layout/AppLayout'
import { GreetingCard } from '@/components/modules/home/GreetingCard'
import { AvailableBalance } from '@/components/modules/home/AvailableBalance'
import { FinancialHealthWidget } from '@/components/modules/home/FinancialHealthWidget'
import { PatrimonioNeto } from '@/components/modules/home/PatrimonioNeto'
import { MesSummary } from '@/components/modules/home/MesSummary'
import { RecentMovements } from '@/components/modules/home/RecentMovements'
import { PresupuestosWidget } from '@/components/modules/home/PresupuestosWidget'
import { ObjetivosWidget } from '@/components/modules/home/ObjetivosWidget'
import { DeudasWidget } from '@/components/modules/home/DeudasWidget'
import { CuotasWidget } from '@/components/modules/home/CuotasWidget'
import { SuscripcionesWidget } from '@/components/modules/home/SuscripcionesWidget'
import { useMovimientosDelMes } from '@/hooks/useMovimientos'
import { useAportesObjetivosMes } from '@/hooks/useObjetivos'
import { useTotalDeudasActivas } from '@/hooks/useDeudas'

export function HomePage() {
  const { data: movimientosMes }   = useMovimientosDelMes()
  const { data: aportesMes }       = useAportesObjetivosMes()
  const { data: totalDeudas = 0 }  = useTotalDeudasActivas()

  const ingresos = (movimientosMes ?? [])
    .filter(m => m.tipo === 'ingreso')
    .reduce((s, m) => s + m.monto, 0)

  // Excluir gastos para terceros del resumen personal
  const gastos = (movimientosMes ?? [])
    .filter(m => m.tipo === 'gasto' && !m.para_tercero)
    .reduce((s, m) => s + m.monto, 0)

  // Ahorro contable (movimiento tipo='ahorro') + ahorro intencional (aportes a objetivos)
  const ahorrosContables  = (movimientosMes ?? [])
    .filter(m => m.tipo === 'ahorro')
    .reduce((s, m) => s + m.monto, 0)
  const ahorrosObjetivos  = Math.max(0, aportesMes?.neto ?? 0)   // solo neto positivo
  const ahorros           = ahorrosContables + ahorrosObjetivos

  return (
    <AppLayout>
      <GreetingCard />

      <div className="space-y-4 mt-2">
        {/* 1. Dinero Disponible */}
        <AvailableBalance />

        {/* 2. Salud Financiera */}
        <FinancialHealthWidget
          puntaje={ingresos > 0 || gastos > 0
            ? Math.min(100, Math.round(60 + (ahorros > 0 ? 15 : 0) + (ingresos > gastos ? 25 : 0)))
            : null
          }
        />

        {/* 3. Patrimonio Neto */}
        <PatrimonioNeto totalDeudas={totalDeudas} />

        {/* 4. Resumen del mes */}
        {(ingresos > 0 || gastos > 0 || ahorros > 0) && (
          <MesSummary
            ingresos={ingresos}
            gastos={gastos}
            ahorros={ahorros}
            ahorrosObjetivos={ahorrosObjetivos}
          />
        )}

        {/* 5. Presupuestos — Sprint 2 */}
        <PresupuestosWidget />

        {/* 6. Objetivos de Ahorro — Sprint 2 */}
        <ObjetivosWidget />

        {/* 7. Compras en cuotas — Sprint 3.1 */}
        <CuotasWidget />

        {/* 8. Deudas externas — Sprint 3 */}
        <DeudasWidget />

        {/* 9. Próximos cobros de suscripciones — Sprint 3 */}
        <SuscripcionesWidget />

        {/* Últimos movimientos */}
        <RecentMovements />
      </div>

      <div className="h-4" />
    </AppLayout>
  )
}

function ProximoSprint({ icon, label, sprint }: { icon: string; label: string; sprint: string }) {
  return (
    <div className="mx-4">
      <div className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-card opacity-60">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-xs text-slate-400">Disponible en {sprint}</p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
          Próximamente
        </span>
      </div>
    </div>
  )
}
