import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ocean' | 'gold'
}

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5'
}

// variant define superficie + borde — el className del caller puede añadir más clases
const variantClasses = {
  default: 'bg-night-2 border-night-border/60',
  ocean:   'bg-ocean-0 border-ocean-border/50',
  gold:    'bg-night-2 border-gold-500/25',
}

const variantStyle: Record<string, React.CSSProperties> = {
  default: {},
  ocean:   {},
  gold:    { background: 'linear-gradient(135deg, rgba(201,162,39,0.07) 0%, transparent 60%)' },
}

export function Card({ padding = 'md', variant = 'default', className = '', children, style, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border',
        variantClasses[variant],
        paddingClasses[padding],
        className
      ].join(' ')}
      style={{ ...variantStyle[variant], ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
