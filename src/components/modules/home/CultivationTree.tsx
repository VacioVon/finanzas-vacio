// ── CultivationTree — contenedor principal ───────────────────────────────
// Mantiene el contrato externo sin cambios.
// El árbol ya no se dibuja proceduralmente: se recibe como asset.
// Ver: src/components/rpg/tree/TreeOfLife.tsx

import { Card } from '@/components/ui/Card'
import { useRPGPerfil } from '@/hooks/rpg/useRPG'
import { rpgTierColor } from '@/types/rpg.types'
import { CultivadorPlaca } from '@/components/rpg/CultivadorPlaca'
import { TreeOfLife } from '@/components/rpg/tree/TreeOfLife'
import { treeStageFromLevel } from '@/components/rpg/tree/treeStage'

export interface CultivationStats {
  finanzas:     number  // 0-100 — Raíces
  disciplina:   number  // 0-100 — Meridianos / Tronco
  vitalidad:    number  // 0-100 — Copa
  conocimiento: number  // 0-100 — Flora
  trabajo:      number  // 0-100 — Frutos
}

interface CultivationTreeProps {
  stats?: CultivationStats  // override para testing/preview
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export function CultivationTree({ stats: statsProp }: CultivationTreeProps) {
  const { data: perfil } = useRPGPerfil()

  const raw: CultivationStats = statsProp ?? (perfil ? {
    finanzas:     perfil.stat_finanzas,
    disciplina:   perfil.stat_disciplina,
    vitalidad:    perfil.stat_vitalidad,
    conocimiento: perfil.stat_conocimiento,
    trabajo:      perfil.stat_trabajo,
  } : { finanzas: 0, disciplina: 0, vitalidad: 0, conocimiento: 0, trabajo: 0 })

  const safeStats: CultivationStats = {
    finanzas:     clamp(raw.finanzas),
    disciplina:   clamp(raw.disciplina),
    vitalidad:    clamp(raw.vitalidad),
    conocimiento: clamp(raw.conocimiento),
    trabajo:      clamp(raw.trabajo),
  }

  const nivel     = perfil?.nivel ?? 1
  const vida      = perfil?.vida  ?? 80
  const tierColor = rpgTierColor(nivel)
  const stage     = treeStageFromLevel(nivel)

  return (
    <Card padding="none" className="relative isolate overflow-hidden bg-background border-night-border/80">

      {/* Fondo ambiental — espacio del universo cultivation */}
      <div
        className="absolute inset-0 opacity-80 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse at 50% 48%, rgba(30,96,64,.15), transparent 55%)',
            'radial-gradient(ellipse at 12% 90%, rgba(41,121,255,.08), transparent 42%)',
          ].join(', '),
        }}
      />

      {/* Identidad del cultivador */}
      <CultivadorPlaca />

      {/* Conector energético cultivador ↔ árbol */}
      <div className="relative mx-4 flex items-center justify-center py-1 sm:mx-6">
        <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `${tierColor}18` }} />
        <div className="mx-3 size-1.5 rounded-full" style={{ backgroundColor: tierColor, opacity: 0.40 }} />
        <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `${tierColor}18` }} />
      </div>

      {/* Árbol de vida — motor por capas */}
      <div className="relative px-3 pb-2 sm:px-5">
        <TreeOfLife
          stage={stage}
          nivel={nivel}
          stats={safeStats}
          vida={vida}
        />
      </div>

      {/* Stats footer — atributos del cultivador */}
      <div className="relative grid grid-cols-5 border-t border-white/5 px-3 py-3 sm:px-6">
        {([
          ['💧', 'Finanzas',     safeStats.finanzas,     'text-mover-400',   '#00C2CB'],
          ['⚡', 'Disciplina',   safeStats.disciplina,   'text-brand-400',   '#2979FF'],
          ['🌿', 'Vitalidad',    safeStats.vitalidad,    'text-ingreso-400', '#10D97F'],
          ['🔮', 'Conocimiento', safeStats.conocimiento, 'text-ahorro-400',  '#9B5DE5'],
          ['🔥', 'Trabajo',      safeStats.trabajo,      'text-xp-400',      '#FFB703'],
        ] as const).map(([emoji, label, value, color, hex]) => (
          <div key={label} className="flex flex-col items-center gap-1 px-0.5">
            <span className="text-sm leading-none">{emoji}</span>
            <p className={`text-sm font-bold tabular-nums leading-none ${color}`}>{Math.round(value)}</p>
            {/* Mini barra de progreso */}
            <div className="w-full h-0.5 rounded-full bg-night-border/60">
              <div
                className="h-full rounded-full"
                style={{ width: `${value}%`, backgroundColor: hex, opacity: 0.80, boxShadow: `0 0 5px ${hex}90` }}
              />
            </div>
            <p className="truncate text-[10px] font-medium text-slate-500 leading-none">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
