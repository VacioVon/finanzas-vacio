type FiltroTipo = 'todos' | 'ingreso' | 'gasto' | 'ahorro' | 'pago_deuda'

interface MovimientoFiltersProps {
  active: FiltroTipo
  onChange: (v: FiltroTipo) => void
}

const FILTROS: { value: FiltroTipo; label: string }[] = [
  { value: 'todos',     label: 'Todos' },
  { value: 'ingreso',   label: 'Ingresos' },
  { value: 'gasto',     label: 'Gastos' },
  { value: 'ahorro',    label: 'Ahorros' },
  { value: 'pago_deuda', label: 'Deudas' },
]

export function MovimientoFilters({ active, onChange }: MovimientoFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-4">
      {FILTROS.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={[
            'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
            active === f.value
              ? 'bg-primary-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
          ].join(' ')}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
