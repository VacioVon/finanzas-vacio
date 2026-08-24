interface ProgressBarProps {
  value: number
  max?: number
  color?: 'blue' | 'green' | 'orange' | 'red'
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const colorClasses = {
  blue:   'bg-brand-500',
  green:  'bg-ingreso-500',
  orange: 'bg-xp-500',
  red:    'bg-gasto-500'
}

function getColorByPercent(pct: number): 'green' | 'orange' | 'red' {
  if (pct < 80) return 'green'
  if (pct < 100) return 'orange'
  return 'red'
}

export function ProgressBar({ value, max = 100, color, size = 'sm', showLabel }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)
  const resolvedColor = color ?? getColorByPercent(pct)

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-night-3 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClasses[resolvedColor]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 w-9 text-right">{Math.round(pct)}%</span>
      )}
    </div>
  )
}
