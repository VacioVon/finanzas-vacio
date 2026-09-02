import type { MisionRPG } from '@/types/rpg.types'
import { useVerificarMision } from '@/hooks/rpg/useMisiones'

interface MisionCardProps {
  mision: MisionRPG
  onCompletada?: (xp: number) => void
}

const TIPO_BADGE: Record<string, { label: string; color: string }> = {
  diaria:   { label: 'Diaria',   color: 'text-ingreso-400 bg-ingreso-500/10'  },
  semanal:  { label: 'Semanal',  color: 'text-brand-400  bg-brand-500/10'    },
  especial: { label: 'Especial', color: 'text-xp-400     bg-xp-500/10'       },
}

const DIFICULTAD_COLOR: Record<string, string> = {
  facil:     'text-ingreso-400',
  media:     'text-xp-400',
  dificil:   'text-gasto-400',
  legendaria: 'text-ahorro-400',
}

const STAT_EMOJI: Record<string, string> = {
  finanzas:     '🌊',
  disciplina:   '🌱',
  vitalidad:    '🍃',
  conocimiento: '🌸',
  trabajo:      '🌾',
}

function barColor(tipo: string) {
  if (tipo === 'diaria')   return 'bg-ingreso-500'
  if (tipo === 'semanal')  return 'bg-brand-500'
  return 'bg-xp-500'
}

export function MisionCard({ mision, onCompletada }: MisionCardProps) {
  const verificar  = useVerificarMision()
  const completada = mision.estado === 'completada'
  const pct        = Math.min(100, Math.round((mision.progreso / mision.condicion_valor) * 100))
  const badge      = TIPO_BADGE[mision.tipo] ?? TIPO_BADGE.diaria
  const difColor   = DIFICULTAD_COLOR[mision.dificultad] ?? 'text-slate-400'

  async function handleVerificar() {
    if (!mision.mision_id || completada || verificar.isPending) return
    try {
      const res = await verificar.mutateAsync(mision.mision_id)
      if (res.completada && onCompletada) {
        onCompletada(res.xp_ganado)
      }
    } catch {
      // silencio — errores son visibles en la query
    }
  }

  return (
    <div
      className={[
        'rounded-xl border p-4 transition-all',
        completada
          ? 'border-night-border/60 bg-night-2/40 opacity-70'
          : 'border-night-border bg-night-2 hover:border-brand-500/30',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
          <span className={`text-[10px] font-medium ${difColor}`}>
            {mision.dificultad}
          </span>
        </div>

        {completada ? (
          <span className="text-[11px] text-ingreso-400 font-semibold flex items-center gap-1">
            ✓ Completada
          </span>
        ) : (
          <button
            onClick={handleVerificar}
            disabled={verificar.isPending}
            className="text-[11px] font-medium text-brand-400 hover:text-brand-300 disabled:opacity-50 transition-colors"
          >
            {verificar.isPending ? '…' : 'Verificar'}
          </button>
        )}
      </div>

      {/* Nombre y descripción */}
      <p className="text-sm font-semibold text-slate-100 text-pretty mb-0.5">
        {mision.nombre}
      </p>
      <p className="text-[11px] text-slate-400 text-pretty mb-3">
        {mision.descripcion}
      </p>

      {/* Barra de progreso */}
      {!completada && (
        <div className="mb-3">
          <div className="h-1.5 bg-night-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(mision.tipo)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-slate-500 tabular-nums">
              {mision.progreso} / {mision.condicion_valor}
            </span>
            <span className="text-[10px] text-slate-500 tabular-nums">{pct}%</span>
          </div>
        </div>
      )}

      {/* Recompensa */}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[11px] font-semibold text-xp-400">
          +{mision.xp_recompensa} XP
        </span>
        {mision.stat_recompensa && mision.stat_delta > 0 && (
          <span className="text-[11px] text-slate-400">
            {STAT_EMOJI[mision.stat_recompensa] ?? '⭐'} +{mision.stat_delta} {mision.stat_recompensa}
          </span>
        )}
        {mision.vida_delta > 0 && (
          <span className="text-[11px] text-gasto-400">
            ❤️ +{mision.vida_delta} vida
          </span>
        )}
      </div>
    </div>
  )
}
