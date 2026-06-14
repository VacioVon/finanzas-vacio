const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

const numberFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

export function formatCLP(amount: number): string {
  return clpFormatter.format(amount)
}

export function formatNumber(amount: number): string {
  return numberFormatter.format(amount)
}

export function parseCLP(value: string): number {
  const cleaned = value.replace(/[^0-9,-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
