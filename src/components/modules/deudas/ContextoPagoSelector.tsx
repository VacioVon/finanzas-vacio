import { Building2, Users, HandCoins, CircleDot } from 'lucide-react'
import { formatCLP } from '@/utils/currency'
import type { ContextoPago, Deuda } from '@/types/app.types'

interface ContextoOption {
  value:       ContextoPago
  label:       string
  sublabel:    string
  icon:        React.ReactNode
  color:       string
  filterTipos: string[] | null  // null = sin filtro
}

const OPCIONES: ContextoOption[] = [
  {
    value:       'deuda_propia',
    label:       'Deuda propia',
    sublabel:    'Banco, financiera o crédito',
    icon:        <Building2 className="size-4" />,
    color:       'text-gasto-400 border-gasto-500/40 bg-gasto-500/10',
    filterTipos: ['credito_consumo', 'tarjeta_credito', 'credito_comercial', 'prestamo_personal', 'otra'],
  },
  {
    value:       'devolucion_prestamo',
    label:       'Devolución de préstamo',
    sublabel:    'Dinero que te prestaron',
    icon:        <HandCoins className="size-4" />,
    color:       'text-xp-400 border-xp-500/40 bg-xp-500/10',
    filterTipos: ['deuda_persona'],
  },
  {
    value:       'deuda_compartida',
    label:       'Gasto compartido',
    sublabel:    'Pagas por otros o dividen el gasto',
    icon:        <Users className="size-4" />,
    color:       'text-brand-400 border-brand-500/40 bg-brand-500/10',
    filterTipos: null,
  },
  {
    value:       'otro',
    label:       'Otro motivo',
    sublabel:    'Sin vinculación a deuda',
    icon:        <CircleDot className="size-4" />,
    color:       'text-slate-400 border-night-border bg-night-3/40',
    filterTipos: null,
  },
]

interface Props {
  contexto:    ContextoPago | null
  deudaId:     string | null
  deudas:      Deuda[]
  onContexto:  (c: ContextoPago | null) => void
  onDeudaId:   (id: string | null) => void
}

export function ContextoPagoSelector({ contexto, deudaId, deudas, onContexto, onDeudaId }: Props) {
  const opcionActiva = OPCIONES.find(o => o.value === contexto)

  const deudosFiltradas = contexto && contexto !== 'otro'
    ? deudas.filter(d => {
        const opcion = OPCIONES.find(o => o.value === contexto)
        if (!opcion?.filterTipos) return d.estado === 'activa' || d.estado === 'en_mora'
        return opcion.filterTipos.includes(d.tipo_deuda ?? '') && (d.estado === 'activa' || d.estado === 'en_mora')
      })
    : []

  function handleContexto(valor: ContextoPago) {
    if (contexto === valor) {
      onContexto(null)
      onDeudaId(null)
    } else {
      onContexto(valor)
      onDeudaId(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[.18em]">
        ¿A qué corresponde este pago?
      </p>

      {/* Grid 2×2 de opciones */}
      <div className="grid grid-cols-2 gap-2">
        {OPCIONES.map(op => {
          const activo = contexto === op.value
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => handleContexto(op.value)}
              className={[
                'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
                activo
                  ? op.color
                  : 'border-night-border/60 bg-night-3/30 text-slate-500 hover:border-night-border hover:bg-night-3/60',
              ].join(' ')}
            >
              <span className={activo ? '' : 'opacity-50'}>{op.icon}</span>
              <div>
                <p className={`text-xs font-semibold leading-tight ${activo ? '' : 'text-slate-400'}`}>
                  {op.label}
                </p>
                <p className={`text-[10px] leading-tight mt-0.5 ${activo ? 'opacity-75' : 'text-slate-600'}`}>
                  {op.sublabel}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Selector de deuda vinculada */}
      {contexto && contexto !== 'otro' && (
        <div>
          <p className="text-[11px] text-slate-500 mb-1.5">
            {contexto === 'deuda_propia'        && 'Selecciona la deuda que estás pagando'}
            {contexto === 'devolucion_prestamo' && 'Selecciona a quién le estás devolviendo'}
            {contexto === 'deuda_compartida'    && 'Selecciona el gasto compartido vinculado'}
          </p>

          {deudosFiltradas.length === 0 ? (
            <div className="px-3 py-2.5 rounded-xl border border-night-border/40 bg-night-3/20">
              <p className="text-xs text-slate-600">
                {contexto === 'devolucion_prestamo'
                  ? 'No tienes préstamos de persona registrados'
                  : 'No hay deudas activas para este tipo'}
              </p>
            </div>
          ) : (
            <select
              value={deudaId ?? ''}
              onChange={e => onDeudaId(e.target.value || null)}
              className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Sin vincular a deuda específica</option>
              {deudosFiltradas.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                  {d.prestamista_nombre ? ` (${d.prestamista_nombre})` : ''}
                  {' — '}
                  {formatCLP(d.monto_pendiente)} pendiente
                </option>
              ))}
            </select>
          )}

          {/* Preview de la deuda seleccionada */}
          {deudaId && (() => {
            const d = deudosFiltradas.find(x => x.id === deudaId)
            if (!d) return null
            const pct = d.monto_total > 0 ? Math.min(100, ((d.monto_total - d.monto_pendiente) / d.monto_total) * 100) : 0
            return (
              <div className={`mt-2 p-3 rounded-xl border ${opcionActiva?.color ?? 'border-night-border bg-night-3/30'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-200 truncate">{d.nombre}</p>
                  <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0 ml-2">
                    {formatCLP(d.monto_pendiente)} pendiente
                  </span>
                </div>
                <div className="h-1 bg-night-0 rounded-full overflow-hidden">
                  <div className="h-full bg-ingreso-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                  {Math.round(pct)}% pagado · {formatCLP(d.monto_total)} total
                  {d.prestamista_nombre && ` · ${d.prestamista_nombre}`}
                </p>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
