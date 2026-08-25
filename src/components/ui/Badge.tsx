import { type HTMLAttributes } from 'react'

type BadgeVariant =
  | 'default'
  | 'gasto'
  | 'ingreso'
  | 'ahorro'
  | 'mover'
  | 'brand'
  | 'gold'
  | 'xp'
  | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-night-3 text-slate-400 border-night-border/60',
  gasto:   'bg-gasto-500/12 text-gasto-400 border-gasto-500/25',
  ingreso: 'bg-ingreso-500/12 text-ingreso-400 border-ingreso-500/25',
  ahorro:  'bg-ahorro-500/12 text-ahorro-400 border-ahorro-500/25',
  mover:   'bg-mover-500/12 text-mover-400 border-mover-500/25',
  brand:   'bg-brand-500/12 text-brand-400 border-brand-500/25',
  gold:    'bg-gold-500/12 text-gold-500 border-gold-500/25',
  xp:      'bg-xp-500/12 text-xp-400 border-xp-500/25',
  muted:   'bg-night-2 text-slate-500 border-night-border/40',
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
        variantClasses[variant],
        className
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}
