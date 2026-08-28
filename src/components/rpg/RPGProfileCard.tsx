import { Card } from '@/components/ui/Card'
import { XPBar } from './XPBar'
import { VitalityBar } from './VitalityBar'
import { StatsPanel } from './StatsPanel'
import { useRPGPerfil } from '@/hooks/rpg/useRPG'
import type { RPGStats } from '@/types/rpg.types'

function Skeleton() {
  return (
    <Card padding="md" className="space-y-4 animate-pulse">
      <div className="h-4 w-32 rounded bg-[#3D3B50]" />
      <div className="h-2 rounded bg-[#3D3B50]" />
      <div className="h-2 w-3/4 rounded bg-[#3D3B50]" />
    </Card>
  )
}

export function RPGProfileCard() {
  const { data: perfil, isLoading } = useRPGPerfil()

  if (isLoading) return <Skeleton />
  if (!perfil)   return null

  const stats: RPGStats = {
    finanzas:     perfil.stat_finanzas,
    disciplina:   perfil.stat_disciplina,
    vitalidad:    perfil.stat_vitalidad,
    conocimiento: perfil.stat_conocimiento,
    trabajo:      perfil.stat_trabajo,
  }

  return (
    <Card padding="md" className="space-y-4 bg-[#23212C] border-[#3D3B50]">
      {/* Header: nivel y rango */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[.22em] text-[#FFB703]/70">
            Nivel {perfil.nivel}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-white text-balance">
            {perfil.rango}
          </h3>
        </div>
        <div className="rounded-full border border-[#FFB703]/20 bg-[#FFB703]/10 px-2.5 py-1 text-[10px] font-medium tabular-nums text-[#FFB703]">
          {perfil.xp_total.toLocaleString()} XP
        </div>
      </div>

      {/* Barras: XP y Vida */}
      <div className="space-y-3">
        <XPBar xpTotal={perfil.xp_total} nivel={perfil.nivel} />
        <VitalityBar vida={perfil.vida} />
      </div>

      <div className="h-px bg-[#3D3B50]" />

      {/* Estadísticas */}
      <div>
        <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[.18em] text-slate-500">
          Atributos
        </p>
        <StatsPanel stats={stats} />
      </div>

      {/* Placeholder árbol — HITO 06.5 implementará assets finales */}
      <div className="rounded-lg border border-dashed border-[#3D3B50] bg-[#1A1822] py-6 text-center">
        <p className="text-[11px] text-slate-500">Árbol de cultivo</p>
        <p className="mt-0.5 text-[10px] text-slate-600">Disponible en HITO 06.5</p>
      </div>
    </Card>
  )
}
