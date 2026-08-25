import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCLP } from '@/utils/currency'
import { useSuscripciones } from '@/hooks/useSuscripciones'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

export function SuscripcionesWidget() {
  const navigate = useNavigate()
  const { data: suscripciones } = useSuscripciones()

  const proximas = (suscripciones ?? [])
    .filter(s => s.activa && s.proxima_fecha)
    .sort((a, b) => {
      const da = differenceInDays(parseISO(a.proxima_fecha!), new Date())
      const db = differenceInDays(parseISO(b.proxima_fecha!), new Date())
      return da - db
    })
    .slice(0, 3)

  if (proximas.length === 0) return null

  return (
    <Card padding="md" className="mx-4 lg:mx-0">
      <button
        onClick={() => navigate('/suscripciones')}
        className="w-full flex items-center justify-between mb-3"
      >
        <p className="text-sm font-semibold text-white">Próximos cobros</p>
        <ChevronRight className="h-4 w-4 text-slate-600" />
      </button>

      <div className="space-y-2">
        {proximas.map(s => {
          const dias = differenceInDays(parseISO(s.proxima_fecha!), new Date())
          const urgente = dias <= 3
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-base">{s.emoji ?? '🔄'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{s.nombre}</p>
                <p className="text-[10px] text-slate-500">
                  {dias === 0
                    ? 'Hoy'
                    : dias < 0
                    ? `Vencido hace ${Math.abs(dias)}d`
                    : format(parseISO(s.proxima_fecha!), 'd MMM', { locale: es })
                  }
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${urgente ? 'text-warning-500' : 'text-slate-300'}`}>
                  {formatCLP(s.monto)}
                </p>
                {dias >= 0 && dias <= 7 && (
                  <p className={`text-[10px] ${urgente ? 'text-warning-500' : 'text-slate-500'}`}>
                    {dias === 0 ? 'hoy' : `en ${dias}d`}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
