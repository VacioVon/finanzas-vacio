import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useRPGPerfil, useRPGLogros, useRPGRachas, useRPGLogrosCatalogo } from '@/hooks/rpg/useRPG'
import { useMisiones } from '@/hooks/rpg/useMisiones'
import { rpgProgresoPorcentaje, rpgTierColor, rpgNarrativa } from '@/types/rpg.types'
import { treeStageFromLevel } from '@/components/rpg/tree/treeStage'
import { CultivadorSello } from './CultivadorSello'

export function CultivadorPlaca() {
  const navigate = useNavigate()

  const { profile }                 = useAuthStore()
  const { data: perfil, isLoading } = useRPGPerfil()
  const { data: logros    = [] }    = useRPGLogros()
  const { data: rachas    = [] }    = useRPGRachas()
  const { data: catalogo  = [] }    = useRPGLogrosCatalogo()
  const { data: misiones  = [] }    = useMisiones()

  const nombre    = profile?.nombre ?? 'Cultivador'
  const nivel     = perfil?.nivel    ?? 1
  const rango     = perfil?.rango    ?? '…'
  const vida      = perfil?.vida     ?? 80
  const xp        = perfil?.xp_total ?? 0
  const pctXP     = rpgProgresoPorcentaje(xp, nivel)
  const tierColor = rpgTierColor(nivel)
  const stage     = treeStageFromLevel(nivel)  // fuente de verdad única
  const narrativa = rpgNarrativa(nivel)

  // Último logro obtenido (ordenados DESC por obtenido_en)
  const ultimoLogroTipo = logros[0]?.logro_tipo
  const ultimoLogro     = ultimoLogroTipo
    ? catalogo.find(c => c.logro_tipo === ultimoLogroTipo)
    : undefined

  // Racha más larga activa
  const rachaActiva = rachas
    .filter(r => r.contador > 0 && r.inicio_racha !== null)
    .sort((a, b) => b.contador - a.contador)[0]

  // Misión más urgente pendiente (mayor XP)
  const misionActiva = misiones
    .filter(m => m.estado === 'pendiente' || m.estado === 'en_progreso')
    .sort((a, b) => b.xp_recompensa - a.xp_recompensa)[0]

  const vidaColor = vida >= 70 ? '#10D97F' : vida >= 35 ? '#FFB703' : '#F4645F'

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 px-4 pt-5 pb-4 sm:px-6">
        <div className="flex gap-4">
          <div className="size-[88px] rounded-lg bg-night-3/60" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-4 w-28 rounded bg-night-3/60" />
            <div className="h-3 w-40 rounded bg-night-3/40" />
            <div className="mt-4 h-1.5 w-full rounded bg-night-3/40" />
            <div className="h-1 w-full rounded bg-night-3/30" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => navigate('/mas')}
      className="w-full text-left relative px-4 pt-5 pb-4 sm:px-6 active:bg-white/[.03] transition-colors rounded-t-2xl cursor-pointer"
      aria-label="Ver perfil del cultivador"
    >
      <div className="flex items-start gap-4">

        {/* Sello hexagonal */}
        <CultivadorSello nivel={nivel} size={88} />

        {/* Identidad */}
        <div className="flex-1 min-w-0 pt-1">
          <p
            className="text-[10px] font-medium uppercase tracking-[.22em]"
            style={{ color: `${tierColor}99` }}
          >
            {stage.label} · Nivel {nivel}
          </p>

          <h2 className="mt-0.5 text-base font-bold text-white truncate">
            {nombre}
          </h2>

          <p
            className="text-xs font-medium truncate"
            style={{ color: tierColor }}
          >
            {rango}
          </p>

          {/* Narrativa del nivel */}
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 line-clamp-2">
            {narrativa}
          </p>

          {/* Qi Vital + XP */}
          <div className="mt-2.5 space-y-1.5">

            {/* Qi Vital */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-[#3D3B50]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${vida}%`, backgroundColor: vidaColor }}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-400">
                Qi Vital · {vida}/100
              </span>
            </div>

            {/* XP progress */}
            {nivel < 20 ? (
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-[#3D3B50]">
                  <div
                    className="h-full rounded-full bg-[#FFB703] transition-all duration-700"
                    style={{ width: `${pctXP}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-[9px] tabular-nums text-[#FFB703]">
                  {xp.toLocaleString()} XP
                </span>
              </div>
            ) : (
              <p className="text-[10px] font-medium text-[#FFB703]">
                {xp.toLocaleString()} XP · Cima alcanzada
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Chips secundarios ── */}
      {(ultimoLogro || rachaActiva || misionActiva) && (
        <div className="mt-3 flex flex-wrap gap-1.5">

          {/* Último logro */}
          {ultimoLogro && (
            <span
              title={ultimoLogro.descripcion}
              className="inline-flex items-center gap-1 rounded-full border border-[#FFB703]/20 bg-[#FFB703]/8 px-2.5 py-1 text-[10px] font-medium text-[#FFB703]"
            >
              {ultimoLogro.emoji} {ultimoLogro.nombre}
            </span>
          )}

          {/* Racha activa */}
          {rachaActiva && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/25 bg-brand-500/8 px-2.5 py-1 text-[10px] font-medium text-brand-300">
              🔥 {rachaActiva.contador}m de racha
            </span>
          )}

          {/* Misión activa — chip secundario, sin saturar la placa */}
          {misionActiva && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/40 bg-slate-800/50 px-2.5 py-1 text-[10px] font-medium text-slate-400">
              ⚔ {misionActiva.nombre} · +{misionActiva.xp_recompensa} XP
            </span>
          )}
        </div>
      )}

      {/* Indicador de navegación — sutil, en la esquina */}
      <div
        className="absolute right-4 top-5 sm:right-6 text-[10px] font-medium transition-opacity opacity-25"
        style={{ color: tierColor }}
        aria-hidden
      >
        Ver perfil →
      </div>
    </button>
  )
}
