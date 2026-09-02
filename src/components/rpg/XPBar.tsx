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

      {/* Barra XP con shimmer + glow */}
      <div className="relative h-2 w-full rounded-full bg-night-border overflow-hidden">
        {/* Fill */}
        <div
          className="relative h-full rounded-full transition-all duration-700 overflow-hidden"
          style={{
            width:      `${pct}%`,
            background: 'linear-gradient(to right, #D97706, #FFB703, #FFD60A)',
            boxShadow:  `0 0 8px #FFB70360, 0 0 16px #FFB70325`,
          }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso XP: ${pct}%`}
        >
          {/* Shimmer sweep */}
          {!esMax && pct > 5 && (
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
              }}
            />
          )}
        </div>

        {/* Punto brillante en la punta */}
        {!esMax && pct > 3 && pct < 99 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full animate-glow-pulse"
            style={{
              left:            `${pct}%`,
              backgroundColor: '#FFD60A',
              boxShadow:       '0 0 6px #FFB703, 0 0 12px #FFB70380',
            }}
          />
        )}
      </div>
    </div>
  )
}
