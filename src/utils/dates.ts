import { format, parseISO, isToday, isYesterday, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Hoy'
  if (isYesterday(d)) return 'Ayer'
  return format(d, "d 'de' MMMM", { locale: es })
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy')
}

export function formatMonthYear(date: Date = new Date()): string {
  return format(date, "MMMM yyyy", { locale: es })
}

export function formatMonthYearCapitalized(date: Date = new Date()): string {
  const str = formatMonthYear(date)
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd')
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function greetingByHour(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
