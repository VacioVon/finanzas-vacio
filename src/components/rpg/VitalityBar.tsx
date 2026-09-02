interface VitalityBarProps {
  vida: number  // 0-100
}

function vidaColor(vida: number): string {
  if (vida >= 70) return '#10D97F'
  if (vida >= 35) return '#FFB703'
  return '#F4645F'
}

function vidaGradient(vida: number): string {
  if (vida >= 70) return 'linear-gradient(to right, #059669, #10D97F, #34D399)'
  if (vida >= 35) return 'linear-gradient(to right, #D97706, #FFB703, #FCD34D)'
  return 'linear-gradient(to right, #DC2626, #F4645F, #F87171)'
}

function vidaLabel(vida: number): string {
  if (vida >= 85) return 'Excelente'
  if (vida >= 60) return 'Estable'
  if (vida >= 35) return 'Debilitado'
  if (vida >= 15) return 'Crítico'
  return 'Al límite'
}

export function VitalityBar({ vida }: VitalityBarProps) {
  const color    = vidaColor(vida)
  const gradient = vidaGradient(vida)
  const isCritic = vida < 35

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-medium uppercase tracking-[.18em]"
          style={{ color: `${color}99` }}
        >
          Vida {isCritic && <span className="text-[9px] normal-case tracking-normal" style={{ color }}>⚠ baja</span>}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color }}>
          {vida} · {vidaLabel(vida)}
        </span>
      </div>

      <div className="relative h-2 w-full rounded-full bg-night-border overflow-hidden">
        <div
          className={`relative h-full rounded-full transition-all duration-700 overflow-hidden ${isCritic ? 'animate-vita-pulse' : ''}`}
          style={{
            width:      `${vida}%`,
            background: gradient,
            boxShadow:  `0 0 8px ${color}50, 0 0 14px ${color}28`,
            transformOrigin: 'left center',
          }}
          role="progressbar"
          aria-valuenow={vida}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Vida: ${vida}%`}
        >
          {/* Shimmer — solo cuando está bien */}
          {vida >= 35 && (
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
