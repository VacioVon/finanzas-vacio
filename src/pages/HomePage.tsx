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
import { CultivationTree } from '@/components/modules/home/CultivationTree'
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

  const puntajeSalud = (ingresos > 0 || gastos > 0)
    ? Math.min(100, Math.round(60 + (ahorros > 0 ? 15 : 0) + (ingresos > gastos ? 25 : 0)))
    : null

  return (
    <AppLayout>
      {/* Saludo solo en móvil — en desktop el sidebar ya identifica al usuario */}
      <div className="lg:hidden">
        <GreetingCard />
      </div>

      {/* ── Título desktop ── */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Inicio</h1>
        {puntajeSalud !== null && (
          <span className="text-sm text-slate-400">
            Salud financiera:&nbsp;
            <span className={puntajeSalud >= 75 ? 'text-ingreso-400 font-semibold' : puntajeSalud >= 50 ? 'text-xp-400 font-semibold' : 'text-gasto-400 font-semibold'}>
              {puntajeSalud}/100
            </span>
          </span>
        )}
      </div>

      {/* ══ HERO — protagonista visual único ══════════════════════ */}
      <div className="mb-4">
        <AvailableBalance />
      </div>

      <div className="mb-4">
        <CultivationTree />
      </div>

      {/* ══ FILA 1 — Patrimonio + Resumen del mes ════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <PatrimonioNeto totalDeudas={totalDeudas} />
        {(ingresos > 0 || gastos > 0 || ahorros > 0) && (
          <MesSummary
            ingresos={ingresos}
            gastos={gastos}
            ahorros={ahorros}
            ahorrosObjetivos={ahorrosObjetivos}
          />
        )}
      </div>

      {/* ══ FILA 2 — Objetivos (gold) + Presupuestos ═════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ObjetivosWidget />
        <PresupuestosWidget />
      </div>

      {/* ══ FILA 3 — Deudas + Cuotas + Suscripciones ════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <DeudasWidget />
        <CuotasWidget />
        <SuscripcionesWidget />
      </div>

      {/* ══ Últimos movimientos — full width ══════════════════════ */}
      <RecentMovements />

      {/* Salud financiera solo en móvil (en desktop va en header) */}
      {puntajeSalud !== null && (
        <div className="lg:hidden mt-4">
          <FinancialHealthWidget puntaje={puntajeSalud} />
        </div>
      )}

      <div className="h-4" />
    </AppLayout>
  )
}
