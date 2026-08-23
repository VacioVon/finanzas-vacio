import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
  suffix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-slate-400 text-sm font-medium pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full h-11 rounded-xl border bg-white text-slate-900 text-sm',
              'placeholder:text-slate-400 outline-none transition-colors duration-150',
              'focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
              error
                ? 'border-danger-400 focus:ring-danger-400 focus:border-danger-400'
                : 'border-night-border hover:border-brand-500/40',
              prefix ? 'pl-8' : 'pl-3',
              suffix ? 'pr-8' : 'pr-3',
              className
            ].join(' ')}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-slate-400 text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
