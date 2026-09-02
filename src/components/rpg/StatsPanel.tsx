import type { RPGStats } from '@/types/rpg.types'

interface StatRowProps {
  label:  string
  value:  number
  color:  string
  icon:   string
}

function StatRow({ label, value, color, icon }: StatRowProps) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-[10px] text-slate-400">{label}</span>
        </div>
        <span
          className="text-[10px] tabular-nums font-semibold"
          style={{ color }}
        >
          {value}
        </span>
      </div>

      {/* Barra de atributo */}
      <div className="relative h-1.5 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: `${color}18` }}
      >
        <div
          className="relative h-full rounded-full transition-all duration-700 overflow-hidden"
          style={{
            width:      `${pct}%`,
            background: `linear-gradient(to right, ${color}80, ${color})`,
            boxShadow:  `0 0 8px ${color}70, 0 0 18px ${color}35`,
          }}
        >
          {/* Shimmer */}
          <div
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.30) 50%, transparent 62%)',
            }}
          />
        </div>

        {/* Dot en la punta */}
        {pct > 5 && pct < 98 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full animate-glow-pulse"
            style={{
              left:            `${pct}%`,
              backgroundColor: color,
              boxShadow:       `0 0 5px ${color}, 0 0 10px ${color}70`,
            }}
          />
        )}
      </div>
    </div>
  )
}

interface StatsPanelProps {
  stats: RPGStats
}

const STAT_CONFIG = [
  { key: 'finanzas',     label: 'Finanzas',     color: '#00C2CB', icon: '🌿' },
  { key: 'disciplina',   label: 'Disciplina',   color: '#2979FF', icon: '⚡' },
  { key: 'vitalidad',    label: 'Vitalidad',    color: '#10D97F', icon: '🍃' },
  { key: 'conocimiento', label: 'Conocimiento', color: '#9B5DE5', icon: '🌸' },
  { key: 'trabajo',      label: 'Trabajo',      color: '#FFB703', icon: '🌟' },
] as const

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="space-y-3">
      {STAT_CONFIG.map(({ key, label, color, icon }) => (
        <StatRow
          key={key}
          label={label}
          value={stats[key]}
          color={color}
          icon={icon}
        />
      ))}
    </div>
  )
}
