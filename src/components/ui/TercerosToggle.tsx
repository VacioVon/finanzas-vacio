import { Users } from 'lucide-react'

interface Props {
  value:    boolean
  onChange: (v: boolean) => void
  /** Texto de ayuda: qué significa en este formulario. */
  ayuda?:   string
}

/** Marca un movimiento como "de terceros": no cuenta como ingreso ni gasto propio en las estadísticas. */
export function TercerosToggle({ value, onChange, ayuda = 'No cuenta en mis estadísticas' }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      data-testid="toggle-terceros"
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all',
        value ? 'border-xp-500/40 bg-xp-500/10' : 'border-night-border bg-night-3',
      ].join(' ')}
    >
      <div className={[
        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
        value ? 'bg-xp-500 border-xp-500' : 'border-slate-600',
      ].join(' ')}>
        {value && <span className="text-night-0 text-[10px] font-bold">✓</span>}
      </div>
      <Users className={`h-4 w-4 ${value ? 'text-xp-400' : 'text-slate-600'}`} />
      <div>
        <p className={`text-xs font-semibold ${value ? 'text-xp-300' : 'text-slate-400'}`}>Es dinero de terceros</p>
        <p className="text-[10px] text-slate-600">{ayuda}</p>
      </div>
    </button>
  )
}
