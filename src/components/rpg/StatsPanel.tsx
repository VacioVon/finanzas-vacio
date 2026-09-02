import type { RPGStats } from '@/types/rpg.types'

interface StatRowProps {
  label:  string
  value:  number
  color:  string
}

function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-[10px] tabular-nums font-medium" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[#3D3B50]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}70` }}
        />
      </div>
    </div>
  )
}

interface StatsPanelProps {
  stats: RPGStats
}

// Orden y tokens de color — spec congelada HITO 06.4.1
const STAT_CONFIG = [
  { key: 'finanzas',     label: 'Finanzas',     color: '#00C2CB' }, // mover — Raíces
  { key: 'disciplina',   label: 'Disciplina',   color: '#2979FF' }, // brand — Tronco
  { key: 'vitalidad',    label: 'Vitalidad',    color: '#10D97F' }, // ingreso — Copa
  { key: 'conocimiento', label: 'Conocimiento', color: '#9B5DE5' }, // ahorro — Flores
  { key: 'trabajo',      label: 'Trabajo',      color: '#FFB703' }, // xp — Frutos
] as const

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="space-y-2.5">
      {STAT_CONFIG.map(({ key, label, color }) => (
        <StatRow
          key={key}
          label={label}
          value={stats[key]}
          color={color}
        />
      ))}
    </div>
  )
}
