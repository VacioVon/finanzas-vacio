import { rpgProgresoPorcentaje, rpgXpParaSiguienteNivel, RPG_XP_CURVA } from '@/types/rpg.types'

interface XPBarProps {
  xpTotal: number
  nivel:   number
  compact?: boolean
}

export function XPBar({ xpTotal, nivel, compact = false }: XPBarProps) {
  const pct        = rpgProgresoPorcentaje(xpTotal, nivel)
  const xpNivel    = xpTotal - (RPG_XP_CURVA[nivel - 1] ?? 0)
  const xpSig      = rpgXpParaSiguienteNivel(nivel)
  const esMax      = nivel >= 20

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[.18em] text-xp-500/70">
          {esMax ? 'Nivel máximo' : 'Experiencia'}
        </span>
        {!esMax && (
          <span className="text-[10px] tabular-nums text-slate-400">
            {xpNivel.toLocaleString()} / {xpSig.toLocaleString()} XP
          </span>
        )}
        {esMax && (
          <span className="text-[10px] tabular-nums text-xp-500">
            {xpTotal.toLocaleString()} XP
          </span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-night-border">
        <div
          className="h-full rounded-full bg-xp-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso XP: ${pct}%`}
        />
      </div>
    </div>
  )
}
