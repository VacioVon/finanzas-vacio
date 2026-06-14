import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger:    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm',
  success:   'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm'
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
          'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
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
