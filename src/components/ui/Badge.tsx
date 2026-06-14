type BadgeColor = 'blue' | 'green' | 'orange' | 'red' | 'slate'

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const colorClasses: Record<BadgeColor, string> = {
  blue:   'bg-primary-100 text-primary-700',
  green:  'bg-success-100 text-success-700',
  orange: 'bg-warning-100 text-warning-700',
  red:    'bg-danger-100 text-danger-700',
  slate:  'bg-slate-100 text-slate-600'
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
