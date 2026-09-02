import { CheckCircle2, Loader2, Zap } from 'lucide-react'
import type { MisionRPG } from '@/types/rpg.types'
import { useVerificarMision } from '@/hooks/rpg/useMisiones'

interface MisionCardProps {
  mision: MisionRPG
  onCompletada?: (xp: number) => void
}

const TIPO_CONFIG: Record<string, { label: string; dotColor: string; barColor: string; textColor: string; bgColor: string }> = {
  diaria:   { label: 'Diaria',   dotColor: 'bg-ingreso-500', barColor: 'bg-ingreso-500', textColor: 'text-ingreso-400', bgColor: 'bg-ingreso-500/10 border-ingreso-500/20' },
  semanal:  { label: 'Semanal',  dotColor: 'bg-brand-500',   barColor: 'bg-brand-500',   textColor: 'text-brand-400',   bgColor: 'bg-brand-500/10 border-brand-500/20'   },
  especial: { label: 'Especial', dotColor: 'bg-xp-500',      barColor: 'bg-xp-500',      textColor: 'text-xp-400',      bgColor: 'bg-xp-500/10 border-xp-500/20'         },
}

const DIFICULTAD_CONFIG: Record<string, { label: string; color: string }> = {
  facil:     { label: 'Fácil',     color: 'text-ingreso-400' },
  media:     { label: 'Media',     color: 'text-xp-400'      },
  dificil:   { label: 'Difícil',   color: 'text-gasto-400'   },
  legendaria: { label: 'Legendaria', color: 'text-ahorro-400' },
}

const STAT_EMOJI: Record<string, string> = {
  finanzas:     '💧',
  disciplina:   '⚡',
  vitalidad:    '🌿',
  conocimiento: '🔮',
  trabajo:      '🔥',
}

export function MisionCard({ mision, onCompletada }: MisionCardProps) {
  const verificar  = useVerificarMision()
  const completada = mision.estado === 'completada'
  const pct        = Math.min(100, Math.round((mision.progreso / mision.condicion_valor) * 100))
  const cfg        = TIPO_CONFIG[mision.tipo] ?? TIPO_CONFIG.diaria
  const dif        = DIFICULTAD_CONFIG[mision.dificultad]

  async function handleVerificar() {
    if (!mision.mision_id || completada || verificar.isPending) return
    try {
      const res = await verificar.mutateAsync(mision.mision_id)
      if (res.completada && onCompletada) onCompletada(res.xp_ganado)
    } catch {
      // silencio
    }
  }

  return (
    <div
      className={[
        'rounded-xl border transition-all',
        completada
          ? 'border-night-border/40 bg-night-2/30'
          : 'border-night-border bg-night-2',
      ].join(' ')}
    >
      {/* Cuerpo */}
      <div className="px-4 pt-3.5 pb-3">

        {/* Badges de tipo + dificultad */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.textColor}`}>
            <span className={`size-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
            {cfg.label}
          </span>
          {dif && (
            <span className={`text-[10px] font-medium ${dif.color}`}>
              {dif.label}
            </span>
          )}
          {completada && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-ingreso-400">
              <CheckCircle2 className="size-3.5" />
              Completada
            </span>
          )}
        </div>

        {/* Nombre y descripción */}
        <p className={`text-sm font-semibold text-balance mb-0.5 ${completada ? 'text-slate-400' : 'text-slate-100'}`}>
          {mision.nombre}
        </p>
        <p className="text-xs text-slate-500 text-pretty">
          {mision.descripcion}
        </p>

        {/* Barra de progreso — solo si pendiente */}
        {!completada && (
          <div className="mt-3">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-[10px] text-slate-500">Progreso</span>
              <span className="text-[11px] font-semibold tabular-nums text-slate-300">
                {mision.progreso}<span className="text-slate-600 font-normal"> / {mision.condicion_valor}</span>
              </span>
            </div>
            <div className="h-2 bg-night-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct > 0 && (
              <p className={`text-[10px] mt-1 tabular-nums font-medium ${cfg.textColor}`}>{pct}% completado</p>
            )}
          </div>
        )}
      </div>

      {/* Footer — recompensas + acción */}
      <div className={[
        'flex items-center justify-between gap-2 px-4 py-2.5 rounded-b-xl border-t',
        completada ? 'border-night-border/30 bg-night-2/20' : 'border-night-border/50 bg-night-3/30',
      ].join(' ')}>
        {/* Recompensas */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] font-bold text-xp-400">
            <Zap className="size-3" />
            +{mision.xp_recompensa} XP
          </span>
          {mision.stat_recompensa && mision.stat_delta > 0 && (
            <span className="text-[11px] text-slate-400">
              {STAT_EMOJI[mision.stat_recompensa] ?? '⭐'} +{mision.stat_delta} {mision.stat_recompensa}
            </span>
          )}
          {mision.vida_delta > 0 && (
            <span className="text-[11px] text-ingreso-400">
              ❤️ +{mision.vida_delta} vida
            </span>
          )}
        </div>

        {/* Botón verificar — solo si pendiente */}
        {!completada && (
          <button
            onClick={handleVerificar}
            disabled={verificar.isPending}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-brand-500/15 border border-brand-500/25 text-brand-300 hover:bg-brand-500/25 hover:text-brand-200 disabled:opacity-50 transition-all flex-shrink-0"
          >
            {verificar.isPending
              ? <Loader2 className="size-3 animate-spin" />
              : <CheckCircle2 className="size-3" />
            }
            {verificar.isPending ? 'Verificando…' : 'Verificar'}
          </button>
        )}
      </div>
    </div>
  )
}
