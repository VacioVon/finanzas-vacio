import { useAuthStore } from '@/store/authStore'
import { greetingByHour, formatMonthYearCapitalized } from '@/utils/dates'

export function GreetingCard() {
  const { profile } = useAuthStore()
  const nombre = profile?.nombre?.split(' ')[0] ?? 'Usuario'

  return (
    <div className="px-4 pt-5 pb-2">
      <p className="text-slate-500 text-sm">{greetingByHour()},</p>
      <h2 className="text-xl font-bold text-slate-900">{nombre} 👋</h2>
      <p className="text-slate-400 text-xs mt-0.5 capitalize">{formatMonthYearCapitalized()}</p>
    </div>
  )
}
