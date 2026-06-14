import { formatCLP } from '@/utils/currency'

interface CurrencyDisplayProps {
  amount: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showSign?: boolean
  tipo?: string
}

const sizeClasses = {
  xs:  'text-xs',
  sm:  'text-sm',
  md:  'text-base',
  lg:  'text-lg font-semibold',
  xl:  'text-xl font-bold',
  '2xl': 'text-2xl font-bold'
}

export function CurrencyDisplay({ amount, size = 'md', className = '', showSign, tipo }: CurrencyDisplayProps) {
  let colorClass = ''
  if (showSign && tipo) {
    if (tipo === 'ingreso') colorClass = 'text-success-600'
    else if (tipo === 'gasto' || tipo === 'pago_deuda') colorClass = 'text-danger-600'
    else if (tipo === 'ahorro') colorClass = 'text-primary-600'
  }

  const sign = showSign && tipo === 'ingreso' ? '+' : showSign && tipo !== 'transferencia' ? '-' : ''

  return (
    <span className={`${sizeClasses[size]} ${colorClass} ${className}`}>
      {sign}{formatCLP(amount)}
    </span>
  )
}
