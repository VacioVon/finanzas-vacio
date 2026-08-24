type BadgeColor = 'blue' | 'green' | 'orange' | 'red' | 'slate'

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const colorClasses: Record<BadgeColor, string> = {
  blue:   'bg-brand-500/15 text-brand-400',
  green:  'bg-ingreso-500/15 text-ingreso-400',
  orange: 'bg-xp-500/15 text-xp-400',
  red:    'bg-gasto-500/15 text-gasto-400',
  slate:  'bg-night-3 text-slate-500'
}

export function Badge({ color = 'slate', size = 'sm', children }: BadgeProps) {
  return (
    <span className={[
      'inline-flex items-center font-medium rounded-full',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
      colorClasses[color]
    ].join(' ')}>
      {children}
    </span>
  )
}
