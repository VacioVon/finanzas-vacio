import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header }    from '@/components/layout/Header'
import { Card }      from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore }  from '@/store/authStore'
import { useMovimientosPorPeriodo, useEvolucionMensual } from '@/hooks/useMovimientos'
import { formatCLP }  from '@/utils/currency'
import {
  getCurrentMesAnio,
  labelMesAnio,
  navegarMes
} from '@/utils/periodo'
import type { Movimiento } from '@/types/app.types'

// ─── Tooltip oscuro para Recharts ────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-night-1 border border-night-border rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-slate-400 mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums" style={{ color: p.color }}>
          {p.name}: {formatCLP(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, monto, color }: {
  label: string
  monto: number
  color: 'ingreso' | 'gasto' | 'ahorro' | 'neutral'
}) {
  const colorMap = {
    ingreso: 'text-ingreso-400',
    gasto:   'text-gasto-400',
    ahorro:  'text-ahorro-400',
    neutral: 'text-white'
  }
  const Icon =
    color === 'ingreso' ? TrendingUp :
    color === 'gasto'   ? TrendingDown :
    Minus

  return (
    <div className="flex flex-col gap-1 p-3 rounded-2xl bg-night-3 border border-night-border/60">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${colorMap[color]}`} />
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-base font-bold tabular-nums ${colorMap[color]}`}>
        {formatCLP(Math.abs(monto))}
      </p>
    </div>
  )
}

// ─── Helpers de análisis ─────────────────────────────────────────────────────

interface CatData {
  id: string
  nombre: string
  color: string
  emoji: string
  monto: number
}

const PIE_COLORS = [
  '#2979FF','#10D97F','#F4645F','#9B5DE5',
  '#00C2CB','#FFB703','#FF6B6B','#4ECDC4'
]

function agruparPorCategoria(movimientos: Movimiento[]): CatData[] {
  const map: Record<string, CatData> = {}
  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || m.para_tercero) continue
    const id     = m.categoria_id ?? '__sin__'
    const nombre = m.categoria?.nombre ?? 'Sin categoría'
    const color  = m.categoria?.color  ?? '#6B7280'
    const emoji  = m.categoria?.emoji  ?? '📁'
    if (!map[id]) map[id] = { id, nombre, color, emoji, monto: 0 }
    map[id].monto += m.monto
  }
  return Object.values(map)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8)
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function AnalisisPage() {
  const { profile } = useAuthStore()
  const [{ mes, anio }, setMesAnio] = useState(getCurrentMesAnio())

  const fechaSueldo = profile?.fecha_sueldo ?? 1
  const { data: movimientos, isLoading } = useMovimientosPorPeriodo(mes, anio, fechaSueldo)
  const { data: evolucion }              = useEvolucionMensual(6)

  const now = getCurrentMesAnio()
  const esMesActual = mes === now.mes && anio === now.anio

  function navegar(delta: 1 | -1) {
    setMesAnio(prev => navegarMes(prev.mes, prev.anio, delta))
  }

  // Cálculos del mes
  const ingresos = (movimientos ?? [])
    .filter(m => m.tipo === 'ingreso')
    .reduce((s, m) => s + m.monto, 0)

  const gastos = (movimientos ?? [])
    .filter(m => m.tipo === 'gasto' && !m.para_tercero)
    .reduce((s, m) => s + m.monto, 0)

  const flujo     = ingresos - gastos
  const tasaAhorro = ingresos > 0 ? Math.round(Math.max(0, flujo / ingresos * 100)) : 0
  const catData    = agruparPorCategoria(movimientos ?? [])
  const totalGastos = catData.reduce((s, c) => s + c.monto, 0)

  return (
    <AppLayout>
      <Header title="Análisis" />

      {/* Navegación por mes */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navegar(-1)}
          className="size-9 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5 text-slate-400" />
        </button>
        <p className="text-white font-semibold text-sm">{labelMesAnio(mes, anio)}</p>
        <button
          onClick={() => navegar(1)}
          disabled={esMesActual}
          className="size-9 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="space-y-4 px-4 pb-24">

        {isLoading ? (
          <SkeletonList count={4} />
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Ingresos" monto={ingresos} color="ingreso" />
              <StatCard label="Gastos"   monto={gastos}   color="gasto"   />
              <StatCard
                label="Flujo"
                monto={flujo}
                color={flujo > 0 ? 'ingreso' : flujo < 0 ? 'gasto' : 'neutral'}
              />
            </div>

            {/* Tasa de ahorro */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-200">Tasa de ahorro</p>
                <span className={`text-lg font-bold tabular-nums ${tasaAhorro >= 20 ? 'text-ingreso-400' : tasaAhorro >= 10 ? 'text-xp-400' : 'text-gasto-400'}`}>
                  {tasaAhorro}%
                </span>
              </div>
              <div className="h-2 bg-night-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${tasaAhorro >= 20 ? 'bg-ingreso-500' : tasaAhorro >= 10 ? 'bg-xp-500' : 'bg-gasto-500'}`}
                  style={{ width: `${Math.min(tasaAhorro, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {ingresos === 0
                  ? 'Sin ingresos registrados este período'
                  : tasaAhorro >= 20
                    ? 'Excelente — estás ahorrando más del 20%'
                    : tasaAhorro >= 10
                      ? 'Bien — intenta llegar al 20%'
                      : 'Ajusta tus gastos para ahorrar más'
                }
              </p>
            </Card>

            {/* Gastos por categoría */}
            <Card>
              <p className="text-sm font-semibold text-slate-200 mb-4">Gastos por categoría</p>
              {catData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Sin gastos este período</p>
              ) : (
                <div className="flex gap-4 items-center">
                  {/* Donut */}
                  <div className="flex-shrink-0">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie
                          data={catData}
                          dataKey="monto"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={58}
                          strokeWidth={0}
                        >
                          {catData.map((entry, i) => (
                            <Cell
                              key={entry.id}
                              fill={entry.color && entry.color !== '#6B7280' ? entry.color : PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<DarkTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Leyenda */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {catData.map((cat, i) => {
                      const pct = totalGastos > 0 ? Math.round(cat.monto / totalGastos * 100) : 0
                      const clr = cat.color && cat.color !== '#6B7280' ? cat.color : PIE_COLORS[i % PIE_COLORS.length]
                      return (
                        <div key={cat.id} className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: clr }}
                          />
                          <span className="text-xs text-slate-300 truncate flex-1">{cat.emoji} {cat.nombre}</span>
                          <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Evolución 6 meses */}
            <Card>
              <p className="text-sm font-semibold text-slate-200 mb-4">Últimos 6 meses</p>
              {!evolucion || evolucion.every(e => e.ingresos === 0 && e.gastos === 0) ? (
                <p className="text-sm text-slate-500 text-center py-6">Sin datos históricos aún</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={evolucion} barCategoryGap="30%" barGap={2}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#3D3B50"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                      width={42}
                    />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: '#353344', radius: 6 }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10D97F" radius={[4,4,0,0]} />
                    <Bar dataKey="gastos"   name="Gastos"   fill="#F4645F" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* Mini leyenda */}
              <div className="flex items-center gap-4 mt-2 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block size-2 rounded-full bg-ingreso-500" />
                  Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block size-2 rounded-full bg-gasto-500" />
                  Gastos
                </span>
              </div>
            </Card>

            {/* Top gastos del mes */}
            {catData.length > 0 && (
              <Card>
                <p className="text-sm font-semibold text-slate-200 mb-3">Top categorías</p>
                <div className="space-y-3">
                  {catData.slice(0, 5).map((cat, i) => {
                    const pct = totalGastos > 0 ? cat.monto / totalGastos * 100 : 0
                    const clr = cat.color && cat.color !== '#6B7280' ? cat.color : PIE_COLORS[i % PIE_COLORS.length]
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-300">{cat.emoji} {cat.nombre}</span>
                          <span className="text-xs text-slate-400 tabular-nums">{formatCLP(cat.monto)}</span>
                        </div>
                        <div className="h-1.5 bg-night-3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: clr }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
