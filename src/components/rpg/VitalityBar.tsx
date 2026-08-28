interface VitalityBarProps {
  vida: number  // 0-100
}

function vidaColor(vida: number): string {
  if (vida >= 70) return '#10D97F'   // ingreso green
  if (vida >= 35) return '#FFB703'   // xp gold
  return '#F4645F'                   // gasto red
}

function vidaLabel(vida: number): string {
  if (vida >= 85) return 'Excelente'
  if (vida >= 60) return 'Estable'
  if (vida >= 35) return 'Debilitado'
  if (vida >= 15) return 'Crítico'
  return 'Al límite'
}

export function VitalityBar({ vida }: VitalityBarProps) {
  const color = vidaColor(vida)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[.18em]" style={{ color: `${color}99` }}>
          Vida
        </span>
        <span className="text-[10px] tabular-nums" style={{ color }}>
          {vida} · {vidaLabel(vida)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#3D3B50]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${vida}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={vida}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Vida: ${vida}%`}
        />
      </div>
    </div>
  )
}
