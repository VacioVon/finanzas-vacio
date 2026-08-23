import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  | 'gasto' | 'ingreso' | 'ahorro' | 'mover'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  // Sistema
  primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  secondary: 'bg-white/10 text-slate-300 border border-night-border hover:bg-white/15 active:bg-white/20',
  ghost:     'bg-transparent text-slate-400 hover:bg-white/8 active:bg-white/12',
  danger:    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm',
  success:   'bg-ingreso-600 text-white hover:bg-ingreso-700 active:bg-ingreso-800 shadow-sm',
  // Semánticos financieros
  gasto:     'bg-gasto-500 text-white hover:bg-gasto-600 active:bg-gasto-700 shadow-glow-gasto',
  ingreso:   'bg-ingreso-500 text-white hover:bg-ingreso-600 active:bg-ingreso-700 shadow-glow-ingreso',
  ahorro:    'bg-ahorro-500 text-white hover:bg-ahorro-600 active:bg-ahorro-700 shadow-glow-ahorro',
  mover:     'bg-mover-500 text-white hover:bg-mover-600 active:bg-mover-700 shadow-glow-mover',
}

const sizeClasses: Record<Size, string> = {
  sm:  'h-8 px-3 text-sm rounded-xl',
  md:  'h-11 px-5 text-sm rounded-2xl',
  lg:  'h-13 px-6 text-base rounded-2xl'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className
        ].join(' ')}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
