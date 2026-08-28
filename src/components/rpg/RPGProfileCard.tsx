import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { XPBar } from './XPBar'
import { VitalityBar } from './VitalityBar'
import { StatsPanel } from './StatsPanel'
import { LogrosGallery } from './LogrosGallery'
import { RachasWidget } from './RachasWidget'
import { useRPGPerfil, useRPGLogros } from '@/hooks/rpg/useRPG'
import type { RPGStats } from '@/types/rpg.types'

type Tab = 'atributos' | 'logros' | 'rachas'

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
  const { data: logros = [] }       = useRPGLogros()
  const [tab, setTab]               = useState<Tab>('atributos')

  if (isLoading) return <Skeleton />
  if (!perfil)   return null

  const stats: RPGStats = {
    finanzas:     perfil.stat_finanzas,
    disciplina:   perfil.stat_disciplina,
    vitalidad:    perfil.stat_vitalidad,
    conocimiento: perfil.stat_conocimiento,
    trabajo:      perfil.stat_trabajo,
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'logros',    label: 'Logros',  badge: logros.length || undefined },
    { id: 'rachas',    label: 'Rachas' },
  ]

  return (
    <Card padding="md" className="space-y-4 bg-[#23212C] border-[#3D3B50]">
      {/* Header */}
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

      {/* Barras */}
      <div className="space-y-3">
        <XPBar xpTotal={perfil.xp_total} nivel={perfil.nivel} />
        <VitalityBar vida={perfil.vida} />
      </div>

      <div className="h-px bg-[#3D3B50]" />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[#1A1822] p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
              tab === t.id
                ? 'bg-[#2C2A38] text-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-400',
            ].join(' ')}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className="rounded-full bg-[#FFB703]/20 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-[#FFB703]">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel */}
      {tab === 'atributos' && <StatsPanel stats={stats} />}
      {tab === 'logros'    && <LogrosGallery />}
      {tab === 'rachas'    && <RachasWidget />}
    </Card>
  )
}
