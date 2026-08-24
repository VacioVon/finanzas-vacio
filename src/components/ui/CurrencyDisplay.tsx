import { formatCLP } from '@/utils/currency'

interface CurrencyDisplayProps {
  amount: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showSign?: boolean
  tipo?: string
}

const sizeClasses = {
  xs:    'text-xs font-medium',
  sm:    'text-sm font-semibold',
  md:    'text-base font-semibold',
  lg:    'text-lg font-semibold',
  xl:    'text-xl font-bold',
  '2xl': 'text-2xl font-bold'
}

export function CurrencyDisplay({ amount, size = 'md', className = '', showSign, tipo }: CurrencyDisplayProps) {
  let colorClass = 'text-white'
  if (showSign && tipo) {
    if (tipo === 'ingreso') colorClass = 'text-ingreso-400'
    else if (tipo === 'gasto' || tipo === 'pago_deuda') colorClass = 'text-gasto-400'
    else if (tipo === 'ahorro') colorClass = 'text-ahorro-400'
    else colorClass = 'text-slate-300'
  }

  const sign = showSign && tipo === 'ingreso' ? '+' : showSign && tipo !== 'transferencia' ? '-' : ''

  return (
    <span className={`tabular-nums ${sizeClasses[size]} ${colorClass} ${className}`}>
      {sign}{formatCLP(amount)}
    </span>
  )
}
