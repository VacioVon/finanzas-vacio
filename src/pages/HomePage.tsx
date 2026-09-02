import { AppLayout } from '@/components/layout/AppLayout'
import { IngresosPendientesAlert } from '@/components/modules/ingresos-recurrentes/IngresosPendientesAlert'
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

function ZoneSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-1">
      <div className="h-px flex-1 bg-night-border/40" />
      <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">{label}</span>
      <div className="h-px flex-1 bg-night-border/40" />
    </div>
  )
}

export function HomePage() {
  const { data: movimientosMes }   = useMovimientosDelMes()
  const { data: aportesMes }       = useAportesObjetivosMes()
  const { data: totalDeudas = 0 }  = useTotalDeudasActivas()

  const ingresos = (movimientosMes ?? [])
    .filter(m => m.tipo === 'ingreso')
    .reduce((s, m) => s + m.monto, 0)

  const gastos = (movimientosMes ?? [])
    .filter(m => m.tipo === 'gasto' && !m.para_tercero)
    .reduce((s, m) => s + m.monto, 0)

  const ahorrosContables  = (movimientosMes ?? [])
    .filter(m => m.tipo === 'ahorro')
    .reduce((s, m) => s + m.monto, 0)
  const ahorrosObjetivos  = Math.max(0, aportesMes?.neto ?? 0)
  const ahorros           = ahorrosContables + ahorrosObjetivos

  const puntajeSalud = (ingresos > 0 || gastos > 0)
    ? Math.min(100, Math.round(60 + (ahorros > 0 ? 15 : 0) + (ingresos > gastos ? 25 : 0)))
    : null

  return (
    <AppLayout>

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

      {/* ══ ZONA 1 — Cultivador & Árbol de vida ═══════════════════ */}
      <div className="mb-4">
        <CultivationTree />
      </div>

      {/* ══ ALERTA — ingresos esperados hoy ══════════════════════ */}
      <div className="mb-4">
        <IngresosPendientesAlert />
      </div>

      {/* ══ ZONA 2 — Economía personal ════════════════════════════ */}
      <ZoneSeparator label="Economía" />

      <div className="mb-4">
        <AvailableBalance />
      </div>

      {/* ══ Resumen mes + Patrimonio ══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {(ingresos > 0 || gastos > 0 || ahorros > 0) && (
          <MesSummary
            ingresos={ingresos}
            gastos={gastos}
            ahorros={ahorros}
            ahorrosObjetivos={ahorrosObjetivos}
          />
        )}
        <PatrimonioNeto totalDeudas={totalDeudas} />
      </div>

      {/* ══ ZONA 3 — Progreso & Compromisos ══════════════════════ */}
      <ZoneSeparator label="Progreso" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ObjetivosWidget />
        <PresupuestosWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <DeudasWidget />
        <CuotasWidget />
        <SuscripcionesWidget />
      </div>

      {/* ══ Últimos movimientos — full width ══════════════════════ */}
      <ZoneSeparator label="Movimientos recientes" />
      <RecentMovements />

      {puntajeSalud !== null && (
        <div className="lg:hidden mt-4">
          <FinancialHealthWidget puntaje={puntajeSalud} />
        </div>
      )}

      <div className="h-4" />
    </AppLayout>
  )
}
