// ── Árbol de Vida — motor visual por capas ──────────────────────────────────
//
// EL CÓDIGO NO DIBUJA EL ÁRBOL.
// EL ASSET ES EL ÁRBOL.
// EL CÓDIGO LE DA VIDA.
//
// Capas (z-index ascendente):
//   1  AssetBase        — imagen PNG por etapa + filtro de Vida
//   2  RootEnergyLayer  — Finanzas    → glow cian en raíces/base
//   3  MeridianLayer    — Disciplina  → flujo animado sobre el tronco
//   4  CanopyLayer      — Vitalidad   → luz verde sobre copa
//   5  FloraGlowLayer   — Conocimiento → aura violeta sobre flores del asset
//   6  FruitGlowLayer   — Trabajo     → aura dorada sobre frutos del asset
//   7  CoreGlowLayer    — Nivel       → pulso del núcleo (color tier)
//   8  AuraLayer        — Nivel       → aura exterior del árbol
//   9  ParticleLayer    — Nivel       → partículas de qi ascendentes
//  10  CosmicLayer      — Nv 17-20   → anillos de conexión cósmica
//  11  ZoneHotspots     — Interacción → áreas tocables del árbol
//  12  ZoneInfoPanel    — Interacción → información contextual por zona

import { useState, useEffect } from 'react'
import { rpgTierColor } from '@/types/rpg.types'
import type { CultivationStats } from '@/components/modules/home/CultivationTree'
import type { TreeStageInfo } from './treeStage'
import { stageProgress, treeStageIndex } from './treeStage'

// ── Animaciones CSS (inyectadas una vez en <head>) ───────────────────────────

const ANIM_CSS = `
@keyframes tol-meridian  { from { stroke-dashoffset: 320 } to { stroke-dashoffset: 0 } }
@keyframes tol-pulse     { 0%,100%{ opacity:.55; transform:scale(1) } 50%{ opacity:1; transform:scale(1.07) } }
@keyframes tol-breathe   { 0%,100%{ opacity:.65 } 50%{ opacity:1 } }
@keyframes tol-particle  { 0%{ opacity:0; transform:translateY(0) scale(1) } 15%{ opacity:.9 } 100%{ opacity:0; transform:translateY(-90px) scale(.15) } }
@keyframes tol-cosmic-cw { from{ transform:rotate(0deg)   } to{ transform:rotate(360deg) } }
@keyframes tol-cosmic-cc { from{ transform:rotate(0deg)   } to{ transform:rotate(-360deg) } }
@keyframes tol-aura      { 0%,100%{ opacity:.2; transform:scale(1) } 50%{ opacity:.48; transform:scale(1.02) } }
@keyframes tol-flora     { 0%,100%{ opacity:.5  } 50%{ opacity:.92 } }
@keyframes tol-fruit     { 0%,100%{ opacity:.4  } 50%{ opacity:.85 } }
@keyframes tol-panel-in  { from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:translateY(0) } }
@media (prefers-reduced-motion: reduce) {
  [data-tol] { animation: none !important; transition: none !important; }
}
`

function useTreeAnimCSS() {
  useEffect(() => {
    if (document.getElementById('tol-anim-css')) return
    const el = document.createElement('style')
    el.id = 'tol-anim-css'
    el.textContent = ANIM_CSS
    document.head.appendChild(el)
  }, [])
}

// ── Tipos para zonas interactivas ────────────────────────────────────────────

type ZoneId = 'raices' | 'tronco' | 'nucleo' | 'copa' | 'flores' | 'frutos' | 'cosmico'

interface ZoneConfig {
  label:      string
  stat:       string
  color:      string
  statKey:    keyof CultivationStats | null
  // [left%, top%, width%, height%] del hotspot en el contenedor
  hotspot:    [number, number, number, number]
  // centro del glow de highlight [cx%, cy%]
  glowAt:     [number, number]
  // índice mínimo de etapa (0=semilla…5=ancestral) para aparecer
  fromStage:  number
}

const ZONE_CONFIGS: Record<ZoneId, ZoneConfig> = {
  raices:  { label:'Raíces',           stat:'Finanzas',     color:'#00C2CB', statKey:'finanzas',     hotspot:[8,  70, 84, 28], glowAt:[50,85], fromStage:0 },
  tronco:  { label:'Meridianos',       stat:'Disciplina',   color:'#2979FF', statKey:'disciplina',   hotspot:[32, 36, 36, 34], glowAt:[50,58], fromStage:1 },
  nucleo:  { label:'Núcleo · Qi',      stat:'Esencia',      color:'#FFB703', statKey:null,           hotspot:[37, 52, 26, 16], glowAt:[50,60], fromStage:0 },
  copa:    { label:'Copa',             stat:'Vitalidad',    color:'#10D97F', statKey:'vitalidad',    hotspot:[4,  4,  92, 48], glowAt:[50,22], fromStage:1 },
  flores:  { label:'Flores',           stat:'Conocimiento', color:'#9B5DE5', statKey:'conocimiento', hotspot:[8,  12, 84, 40], glowAt:[50,28], fromStage:2 },
  frutos:  { label:'Frutos',           stat:'Trabajo',      color:'#FFB703', statKey:'trabajo',      hotspot:[12, 20, 76, 38], glowAt:[28,36], fromStage:2 },
  cosmico: { label:'Conexión Cósmica', stat:'La Unión',     color:'#FFFFFF', statKey:null,           hotspot:[0,  0, 100,100], glowAt:[50,50], fromStage:5 },
}

// Orden DOM: los más específicos (núcleo) al final = mayor z-index
const ZONE_ORDER: ZoneId[] = ['cosmico','copa','flores','frutos','tronco','raices','nucleo']

const ZONE_DESCRIPTIONS: Record<ZoneId, (nivel: number) => string> = {
  raices:  () => 'Las raíces son tus fundamentos financieros. Se fortalecen con cada registro y decisión consciente.',
  tronco:  () => 'Los meridianos conducen la energía de tu disciplina. Reflejan la constancia de tu práctica.',
  nucleo:  () => 'El núcleo es tu esencia. Aquí converge toda la energía que has cultivado.',
  copa:    () => 'La copa representa tu vitalidad. Se expande cuando cuidas tu equilibrio vital.',
  flores:  () => 'Las flores son el fruto de tu conocimiento. Crecen con cada aprendizaje y cada logro.',
  frutos:  () => 'Los frutos son el resultado de tu trabajo. Maduran con la constancia del esfuerzo.',
  cosmico: (n) => n >= 20
    ? 'La Unión. Has alcanzado la trascendencia. Tu árbol y tu esencia son una sola cosa.'
    : 'Tu árbol comienza a conectar con el cosmos. La trascendencia está cerca.',
}

// ── Capa 1: Asset base ───────────────────────────────────────────────────────

function AssetBase({ stage, vida }: { stage: TreeStageInfo; vida: number }) {
  const [missing, setMissing] = useState(false)
  const src = `/assets/rpg/tree/${stage.file}`

  // 4 estados de Vida:  vigoroso / debilitado / agotado / crítico
  let filter = 'none'
  if (vida === 0) {
    filter = 'saturate(0) brightness(0.25) sepia(0.5)'
  } else if (vida < 35) {
    filter = 'saturate(0.12) brightness(0.42) sepia(0.25)'
  } else if (vida < 70) {
    const t = (vida - 35) / 35
    filter = `saturate(${(0.15 + t * 0.85).toFixed(2)}) brightness(${(0.48 + t * 0.52).toFixed(2)})`
  }

  if (missing) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="rounded-2xl border border-dashed border-[#3D3B50] bg-[#1A1822]/80 px-8 py-10 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[.25em] text-slate-600">
            Asset pendiente
          </p>
          <p className="mt-3 text-xl font-bold text-slate-400">{stage.label}</p>
          <p className="mt-1.5 font-mono text-[11px] text-slate-600">{stage.file}</p>
          <p className="mt-1 text-[9px] text-slate-700">/public/assets/rpg/tree/</p>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`Árbol de vida — ${stage.label}`}
      className="h-full w-full object-contain"
      style={{ filter, transition: 'filter 1.4s ease' }}
      onError={() => setMissing(true)}
      draggable={false}
    />
  )
}

// ── Capa 2: Energía de raíces (Finanzas) ─────────────────────────────────────
// Ilumina la base/plataforma donde el asset tiene las raíces.

function RootEnergyLayer({ finanzas, progress }: { finanzas: number; progress: number }) {
  const alpha = (finanzas / 100) * (0.55 + progress * 0.45)
  return (
    <div
      data-tol
      className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
      style={{
        background: `radial-gradient(ellipse 80% 65% at 50% 100%, rgba(0,194,203,${(alpha * 0.62).toFixed(3)}), transparent 75%)`,
        mixBlendMode: 'screen',
        animation: 'tol-breathe 5.5s ease-in-out infinite',
      }}
    />
  )
}

// ── Capa 3: Meridianos (Disciplina) ──────────────────────────────────────────
// Flujo animado sobre la zona del tronco. No dibuja estructura.

function MeridianLayer({ disciplina, progress }: { disciplina: number; progress: number }) {
  const opacity = (disciplina / 100) * (0.42 + progress * 0.58)
  // Más disciplina = flujo más rápido; más rápido = número menor de segundos
  const dur  = 5.5 - (disciplina / 100) * 2.5
  const dur2 = dur * 1.3
  const dur3 = dur * 1.2

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity, mixBlendMode: 'screen' }}
      aria-hidden
      data-tol
    >
      {/* Meridiano central */}
      <path
        d="M50 88 C49 74 51 60 50 46 C49 32 51 20 50 8"
        fill="none" stroke="#2979FF" strokeWidth="0.65" strokeLinecap="round"
        strokeDasharray="320"
        style={{ animation: `tol-meridian ${dur.toFixed(1)}s linear infinite` }}
      />
      {/* Meridiano izquierdo */}
      <path
        d="M46 86 C44 72 45 58 43 44 C41 30 42 20 41 10"
        fill="none" stroke="#2979FF" strokeWidth="0.32" strokeLinecap="round"
        strokeDasharray="280"
        style={{ animation: `tol-meridian ${dur2.toFixed(1)}s linear infinite`, animationDelay: '-1.2s' }}
      />
      {/* Meridiano derecho */}
      <path
        d="M54 86 C56 72 55 58 57 44 C59 30 58 20 59 10"
        fill="none" stroke="#2979FF" strokeWidth="0.32" strokeLinecap="round"
        strokeDasharray="280"
        style={{ animation: `tol-meridian ${dur3.toFixed(1)}s linear infinite`, animationDelay: '-2.4s' }}
      />
    </svg>
  )
}

// ── Capa 4: Copa / Vitalidad ──────────────────────────────────────────────────
// Ilumina la zona superior donde el asset tiene la copa.

function CanopyLayer({ vitalidad, progress, stageIdx }: {
  vitalidad: number; progress: number; stageIdx: number
}) {
  // La copa no existe en semilla (0). Brote (1) tiene hojas pequeñas.
  const stageScale = stageIdx < 1 ? 0.15 : stageIdx < 2 ? 0.45 : 1
  const alpha = (vitalidad / 100) * (0.28 + progress * 0.42) * stageScale

  return (
    <div
      data-tol
      className="pointer-events-none absolute inset-x-0 top-0 h-3/5"
      style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 8%, rgba(16,217,127,${alpha.toFixed(3)}), transparent 78%)`,
        mixBlendMode: 'screen',
        animation: 'tol-breathe 7s ease-in-out infinite',
        animationDelay: '-2.5s',
      }}
    />
  )
}

// ── Capa 5: Flora glow (Conocimiento) ────────────────────────────────────────
// Ilumina las flores que YA EXISTEN en el asset. No dibuja nuevas flores.

function FloraGlowLayer({ conocimiento, progress, stageIdx }: {
  conocimiento: number; progress: number; stageIdx: number
}) {
  if (stageIdx < 2) return null  // semilla y brote no tienen flores
  const base = (conocimiento / 100) * (0.38 + progress * 0.62)

  return (
    <div
      data-tol
      className="pointer-events-none absolute inset-x-0 top-0 h-4/5"
      style={{
        background: [
          `radial-gradient(ellipse 42% 28% at 18% 32%, rgba(155,93,229,${(base * 0.68).toFixed(3)}), transparent 70%)`,
          `radial-gradient(ellipse 36% 24% at 82% 26%, rgba(155,93,229,${(base * 0.58).toFixed(3)}), transparent 68%)`,
          `radial-gradient(ellipse 28% 20% at 55% 48%, rgba(155,93,229,${(base * 0.48).toFixed(3)}), transparent 62%)`,
        ].join(', '),
        mixBlendMode: 'screen',
        animation: 'tol-flora 6.5s ease-in-out infinite',
        animationDelay: '-1.8s',
      }}
    />
  )
}

// ── Capa 6: Fruit glow (Trabajo) ─────────────────────────────────────────────
// Ilumina los frutos que YA EXISTEN en el asset. No dibuja nuevos frutos.

function FruitGlowLayer({ trabajo, progress, stageIdx }: {
  trabajo: number; progress: number; stageIdx: number
}) {
  if (stageIdx < 2) return null  // semilla y brote no tienen frutos
  const base = (trabajo / 100) * (0.38 + progress * 0.62)

  return (
    <div
      data-tol
      className="pointer-events-none absolute inset-x-0 top-0 h-4/5"
      style={{
        background: [
          `radial-gradient(ellipse 22% 20% at 76% 28%, rgba(255,183,3,${(base * 0.72).toFixed(3)}), transparent 62%)`,
          `radial-gradient(ellipse 20% 18% at 24% 36%, rgba(255,183,3,${(base * 0.62).toFixed(3)}), transparent 60%)`,
          `radial-gradient(ellipse 16% 16% at 50% 52%, rgba(255,183,3,${(base * 0.52).toFixed(3)}), transparent 56%)`,
        ].join(', '),
        mixBlendMode: 'screen',
        animation: 'tol-fruit 8.5s ease-in-out infinite',
        animationDelay: '-3.5s',
      }}
    />
  )
}

// ── Capa 7: Núcleo energético (nivel) ────────────────────────────────────────
// Pulso del núcleo con el color del tier. Mismo color que el sello.

function CoreGlowLayer({ nivel, tierColor, progress }: {
  nivel: number; tierColor: string; progress: number
}) {
  const base   = 0.08 + (nivel / 20) * 0.32
  const alpha  = Math.min(base * (0.68 + progress * 0.32), nivel >= 20 ? 0.62 : 0.50)
  const spread = nivel >= 17 ? '42%' : nivel >= 8 ? '32%' : '22%'
  const hexA   = Math.round(alpha * 255).toString(16).padStart(2, '0')
  const dur    = nivel >= 20 ? '2.5s' : '3.8s'

  return (
    <div
      data-tol
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse ${spread} ${spread} at 50% 58%, ${tierColor}${hexA}, transparent 100%)`,
        mixBlendMode: 'screen',
        animation: `tol-pulse ${dur} ease-in-out infinite`,
        animationDelay: '-0.6s',
      }}
    />
  )
}

// ── Capa 8: Aura exterior ────────────────────────────────────────────────────

function AuraLayer({ nivel, tierColor }: { nivel: number; tierColor: string }) {
  const alpha = 0.04 + (nivel / 20) * 0.16
  const size  = nivel >= 17 ? '96%' : nivel >= 8 ? '88%' : '76%'
  const hexA  = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return (
    <div
      data-tol
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse ${size} ${size} at 50% 54%, ${tierColor}${hexA}, transparent 100%)`,
        animation: 'tol-aura 7s ease-in-out infinite',
        animationDelay: '-3.5s',
      }}
    />
  )
}

// ── Capa 9: Partículas de qi ascendentes ─────────────────────────────────────

const P_LEFT  = [8,  18, 28, 36, 44, 56, 64, 72, 82, 92]
const P_DELAY = [0, 1.4, 2.8, 0.7, 2.1, 3.5, 1.1, 0.3, 2.6, 1.8]

function ParticleLayer({ nivel, tierColor }: { nivel: number; tierColor: string }) {
  if (nivel < 5) return null
  const count = Math.min(Math.floor(nivel / 2), 10)
  const size  = nivel >= 17 ? 4 : 3
  const dur   = Math.max(3.5, 5.5 - (nivel / 20) * 2)  // más nivel = más rápido

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {P_LEFT.slice(0, count).map((x, i) => (
        <div
          key={i}
          data-tol
          className="absolute rounded-full"
          style={{
            left:            `${x}%`,
            bottom:          `${18 + (i % 4) * 12}%`,
            width:           `${size}px`,
            height:          `${size}px`,
            backgroundColor: tierColor,
            opacity:         0.5 + (nivel / 20) * 0.4,
            animation:       `tol-particle ${dur.toFixed(1)}s ease-out infinite`,
            animationDelay:  `${P_DELAY[i]}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Capa 10: Conexión cósmica (Nivel 17-20) ──────────────────────────────────

function CosmicLayer({ nivel, tierColor }: { nivel: number; tierColor: string }) {
  if (nivel < 17) return null
  const t     = (nivel - 17) / 3      // 0→1 de nv.17 a nv.20
  const alpha = 0.14 + t * 0.26
  const hexA  = Math.round(alpha * 255).toString(16).padStart(2, '0')
  const hexB  = Math.round(alpha * 0.55 * 255).toString(16).padStart(2, '0')

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Anillo orbital exterior */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-5%' }}>
        <div
          data-tol
          style={{
            width: '88%', height: '56%',
            border: `1px solid ${tierColor}${hexA}`,
            borderRadius: '50%',
            animation: 'tol-cosmic-cw 20s linear infinite',
          }}
        />
      </div>
      {/* Anillo orbital interior (contra-rotación) */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-5%' }}>
        <div
          data-tol
          style={{
            width: '64%', height: '40%',
            border: `1px solid ${tierColor}${hexB}`,
            borderRadius: '50%',
            animation: 'tol-cosmic-cc 13s linear infinite',
            transform: 'rotate(55deg)',
          }}
        />
      </div>
      {/* Resplandor blanco extra en La Unión */}
      {nivel >= 20 && (
        <div
          data-tol
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255,255,255,.05), transparent 70%)',
            animation: 'tol-pulse 3s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}

// ── Capa 11: Zonas interactivas ───────────────────────────────────────────────

function ZoneHotspots({ stageIdx, nivel, activeZone, onZoneClick }: {
  stageIdx:    number
  nivel:       number
  activeZone:  ZoneId | null
  onZoneClick: (id: ZoneId | null) => void
}) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 10 }}>
      {ZONE_ORDER.map(id => {
        const cfg = ZONE_CONFIGS[id]
        if (stageIdx < cfg.fromStage) return null
        if (id === 'cosmico' && nivel < 17) return null

        const [l, t, w, h] = cfg.hotspot
        const isActive = activeZone === id

        return (
          <button
            key={id}
            aria-label={`${cfg.label} — ${cfg.stat}`}
            onClick={() => onZoneClick(isActive ? null : id)}
            style={{
              position: 'absolute',
              left:     `${l}%`,
              top:      `${t}%`,
              width:    `${w}%`,
              height:   `${h}%`,
              background: isActive
                ? `radial-gradient(ellipse 60% 60% at ${cfg.glowAt[0]}% ${Math.max(10, cfg.glowAt[1] - t)}%, ${cfg.color}22, transparent 70%)`
                : 'transparent',
              border:     'none',
              outline:    'none',
              borderRadius: '50%',
              cursor:     'pointer',
              transition: 'background .3s ease',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Capa 12: Panel de información de zona ────────────────────────────────────

function ZoneInfoPanel({ zoneId, stats, nivel, onClose }: {
  zoneId:  ZoneId
  stats:   CultivationStats
  nivel:   number
  onClose: () => void
}) {
  const cfg   = ZONE_CONFIGS[zoneId]
  const value = cfg.statKey !== null ? Math.round(stats[cfg.statKey]) : null

  return (
    <div
      data-tol
      className="absolute inset-x-2 bottom-2"
      style={{ zIndex: 20, animation: 'tol-panel-in .22s ease-out both' }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background:      'rgba(10,9,18,.90)',
          backdropFilter:  'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border:          `1px solid ${cfg.color}38`,
          boxShadow:       `0 0 24px ${cfg.color}14`,
        }}
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-[.2em]"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {value !== null && (
              <span className="font-mono text-sm font-bold text-white tabular-nums">{value}</span>
            )}
            <button
              onClick={onClose}
              className="text-slate-600 transition-colors hover:text-slate-300 text-lg leading-none"
              aria-label="Cerrar información de zona"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stat label */}
        <p className="mb-2 text-[10px] uppercase tracking-[.15em] text-slate-500">{cfg.stat}</p>

        {/* Barra de progreso — solo zonas con stat */}
        {value !== null && (
          <div className="mb-2.5 h-[3px] rounded-full bg-[#2D2B3D] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width:      `${value}%`,
                background: `linear-gradient(to right, ${cfg.color}70, ${cfg.color})`,
                transition: 'width .8s ease',
              }}
            />
          </div>
        )}

        {/* Descripción */}
        <p className="text-[11px] leading-relaxed text-slate-400">
          {ZONE_DESCRIPTIONS[zoneId](nivel)}
        </p>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

interface TreeOfLifeProps {
  stage:  TreeStageInfo
  nivel:  number
  stats:  CultivationStats
  vida:   number
}

export function TreeOfLife({ stage, nivel, stats, vida }: TreeOfLifeProps) {
  useTreeAnimCSS()

  const tierColor = rpgTierColor(nivel)
  const progress  = stageProgress(nivel, stage)
  const sIdx      = treeStageIndex(stage)

  const [activeZone, setActiveZone] = useState<ZoneId | null>(null)

  // Cierra el panel cuando cambia la etapa
  useEffect(() => { setActiveZone(null) }, [stage.key])

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ aspectRatio: '4 / 5' }}
      // Atributos data para futura integración Three.js
      data-tree-stage={stage.key}
      data-tree-level={nivel}
      data-stage-progress={progress.toFixed(2)}
      data-vida={vida}
    >
      {/* 1 — Asset base — el árbol mismo */}
      <AssetBase stage={stage} vida={vida} />

      {/* 2 — Raíces / Finanzas */}
      <RootEnergyLayer finanzas={stats.finanzas} progress={progress} />

      {/* 3 — Meridianos / Disciplina */}
      <MeridianLayer disciplina={stats.disciplina} progress={progress} />

      {/* 4 — Copa / Vitalidad */}
      <CanopyLayer vitalidad={stats.vitalidad} progress={progress} stageIdx={sIdx} />

      {/* 5 — Flores / Conocimiento */}
      <FloraGlowLayer conocimiento={stats.conocimiento} progress={progress} stageIdx={sIdx} />

      {/* 6 — Frutos / Trabajo */}
      <FruitGlowLayer trabajo={stats.trabajo} progress={progress} stageIdx={sIdx} />

      {/* 7 — Núcleo energético */}
      <CoreGlowLayer nivel={nivel} tierColor={tierColor} progress={progress} />

      {/* 8 — Aura exterior */}
      <AuraLayer nivel={nivel} tierColor={tierColor} />

      {/* 9 — Partículas de qi */}
      <ParticleLayer nivel={nivel} tierColor={tierColor} />

      {/* 10 — Conexión cósmica */}
      <CosmicLayer nivel={nivel} tierColor={tierColor} />

      {/* 11 — Zonas interactivas */}
      <ZoneHotspots
        stageIdx={sIdx}
        nivel={nivel}
        activeZone={activeZone}
        onZoneClick={setActiveZone}
      />

      {/* 12 — Panel de información */}
      {activeZone && (
        <ZoneInfoPanel
          zoneId={activeZone}
          stats={stats}
          nivel={nivel}
          onClose={() => setActiveZone(null)}
        />
      )}
    </div>
  )
}
