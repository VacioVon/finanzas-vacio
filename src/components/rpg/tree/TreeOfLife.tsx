// ── Árbol de Vida — motor visual por capas ──────────────────────────────────
//
// Arquitectura:
//   Capa 1 — Asset base       (<img> WebP por etapa, con filtro de Vida)
//   Capa 2 — Energía de raíces (Finanzas  → glow cian en la base)
//   Capa 3 — Meridianos        (Disciplina → líneas de energía sobre el tronco)
//   Capa 4 — Copa / Vitalidad  (Vitalidad  → glow verde en la copa)
//   Capa 5 — Flora             (Conocimiento → overlay artístico, pendiente de assets)
//   Capa 6 — Frutos            (Trabajo      → overlay artístico, pendiente de assets)
//   Capa 7 — Núcleo energético (nivel → conecta con el sello del cultivador)
//
// EL CÓDIGO NO DIBUJA EL ÁRBOL.
// EL ASSET ES EL ÁRBOL.
// EL CÓDIGO LE DA VIDA.

import { useState } from 'react'
import { rpgTierColor } from '@/types/rpg.types'
import type { CultivationStats } from '@/components/modules/home/CultivationTree'
import type { TreeStageInfo } from './treeStage'
import { stageProgress } from './treeStage'

interface TreeOfLifeProps {
  stage:  TreeStageInfo
  nivel:  number
  stats:  CultivationStats
  vida:   number
}

// ── Capa 1: Asset base ────────────────────────────────────────────────────
// Carga el WebP de la etapa; muestra placeholder identificado si no existe.
// La Vida degrada el brillo y saturación de este layer.
function AssetBase({ stage, vida }: { stage: TreeStageInfo; vida: number }) {
  const [missing, setMissing] = useState(false)
  const src = `/assets/rpg/tree/${stage.file}`

  // Vida ≥ 70: sin filtro. 35-69: degrada leve. < 35: agotado.
  let vidaFilter = 'none'
  if (vida < 70) {
    const t = vida / 70  // 0→1
    vidaFilter = `saturate(${(0.15 + t * 0.85).toFixed(2)}) brightness(${(0.50 + t * 0.50).toFixed(2)})`
  }

  if (missing) {
    // Placeholder — no simula el árbol, solo identifica el asset esperado
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center"
        style={{ filter: vidaFilter }}
      >
        <div className="rounded-xl border border-dashed border-[#3D3B50] bg-[#1A1822]/70 px-8 py-10 text-center">
          <p className="text-[9px] font-medium uppercase tracking-[.22em] text-slate-600">
            Asset pendiente
          </p>
          <p className="mt-2.5 text-lg font-bold text-slate-400">{stage.label}</p>
          <p className="mt-1.5 font-mono text-[10px] text-slate-600">{stage.file}</p>
          <p className="mt-1 text-[9px] text-slate-700">
            /public/assets/rpg/tree/
          </p>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`Árbol de vida — ${stage.label}`}
      className="h-full w-full object-contain"
      style={{ filter: vidaFilter }}
      onError={() => setMissing(true)}
      draggable={false}
    />
  )
}

// ── Capa 2: Energía de raíces (Finanzas) ─────────────────────────────────
// Glow cian emergiendo de la base del árbol.
// No dibuja raíces — ilumina la zona donde el asset las tiene.
function RootEnergyLayer({ finanzas, progress }: { finanzas: number; progress: number }) {
  // La intensidad crece con el stat Y con el progreso dentro de la etapa
  const base    = finanzas / 100
  const boosted = base * (0.6 + progress * 0.4)
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
      style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 100%, rgba(0,194,203,${(boosted * 0.55).toFixed(3)}), transparent 80%)`,
      }}
    />
  )
}

// ── Capa 3: Meridianos (Disciplina) ──────────────────────────────────────
// Trazos de energía finos superpuestos sobre la zona del tronco del asset.
// No dibujan el tronco — son flujos de qi que lo habitan.
// preserveAspectRatio="none": los meridianos se adaptan proporciones del contenedor.
function MeridianLayer({ disciplina, progress }: { disciplina: number; progress: number }) {
  const opacity = (disciplina / 100) * (0.5 + progress * 0.5)
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity }}
      aria-hidden
    >
      {/* Meridiano central — flujo principal de qi */}
      <path
        d="M50 84 C49 72 51 60 50 48 C49 36 51 24 50 14"
        fill="none" stroke="#2979FF" strokeWidth="0.45" strokeLinecap="round" opacity="0.85"
      />
      {/* Meridiano izquierdo — flujo secundario */}
      <path
        d="M47 82 C45 68 46 55 44 43 C42 31 43 22 42 14"
        fill="none" stroke="#2979FF" strokeWidth="0.25" strokeLinecap="round" opacity="0.45"
      />
      {/* Meridiano derecho — flujo secundario */}
      <path
        d="M53 82 C55 68 54 55 56 43 C58 31 57 22 58 14"
        fill="none" stroke="#2979FF" strokeWidth="0.25" strokeLinecap="round" opacity="0.45"
      />
    </svg>
  )
}

// ── Capa 4: Vitalidad de la copa (Vitalidad) ─────────────────────────────
// Glow verde sobre la zona superior del asset.
// No dibuja hojas — intensifica la zona donde el asset las tiene.
function CanopyLayer({ vitalidad, progress }: { vitalidad: number; progress: number }) {
  const intensity = (vitalidad / 100) * (0.5 + progress * 0.5)
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-3/5"
      style={{
        background: `radial-gradient(ellipse 65% 55% at 50% 15%, rgba(16,217,127,${(intensity * 0.28).toFixed(3)}), transparent 80%)`,
      }}
    />
  )
}

// ── Capa 5: Flora (Conocimiento) ─────────────────────────────────────────
// PREPARADO — a la espera de overlay assets artísticos.
//
// Cuando los assets estén listos:
//   count  = Math.round(conocimiento / 25)  // 0-4 capas
//   assets = `/assets/rpg/tree/{stage.key}/flores-{1..count}.webp`
//   Cada WebP es un overlay transparente posicionado sobre la copa del asset base.
//
// No usar círculos ni formas geométricas como representación principal.
// Las flores DEBEN ser layers artísticos diseñados para cada etapa de árbol.
function FloraLayer(_: { conocimiento: number; stage: TreeStageInfo }) {
  // TODO: cargar overlays artísticos de flores cuando los assets estén listos
  return null
}

// ── Capa 6: Frutos (Trabajo) ─────────────────────────────────────────────
// PREPARADO — a la espera de overlay assets artísticos.
//
// Cuando los assets estén listos:
//   count  = Math.round(trabajo / 25)  // 0-4 capas
//   assets = `/assets/rpg/tree/{stage.key}/frutos-{1..count}.webp`
//
// No usar círculos ni puntos de glow como representación principal.
function FruitLayer(_: { trabajo: number; stage: TreeStageInfo }) {
  // TODO: cargar overlays artísticos de frutos cuando los assets estén listos
  return null
}

// ── Capa 7: Núcleo energético (nivel) ────────────────────────────────────
// Glow del núcleo conectado al tier del cultivador.
// Mismo color que el sello — misma energía, dos manifestaciones.
function CoreGlowLayer({ nivel, tierColor, progress }: {
  nivel:     number
  tierColor: string
  progress:  number
}) {
  // Opacidad crece con nivel absoluto + progreso dentro de la etapa
  const base     = 0.07 + (nivel / 20) * 0.28
  const boosted  = base * (0.7 + progress * 0.3)
  const alpha    = Math.round(Math.min(boosted, 0.42) * 255).toString(16).padStart(2, '0')
  // La Unión: núcleo expandido
  const spread   = nivel >= 20 ? '42%' : '32%'

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse ${spread} ${spread} at 50% 40%, ${tierColor}${alpha}, transparent 100%)`,
      }}
    />
  )
}

// ── TreeOfLife — componente principal ────────────────────────────────────
export function TreeOfLife({ stage, nivel, stats, vida }: TreeOfLifeProps) {
  const tierColor = rpgTierColor(nivel)
  const progress  = stageProgress(nivel, stage)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '700 / 570' }}
      // Expone estado para futura integración Three.js / animaciones externas
      data-tree-stage={stage.key}
      data-tree-level={nivel}
      data-stage-progress={progress.toFixed(2)}
      data-vida={vida}
    >
      {/* 1. Asset base — el árbol mismo */}
      <AssetBase stage={stage} vida={vida} />

      {/* 2. Energía de raíces — Finanzas */}
      <RootEnergyLayer finanzas={stats.finanzas} progress={progress} />

      {/* 3. Meridianos — Disciplina */}
      <MeridianLayer disciplina={stats.disciplina} progress={progress} />

      {/* 4. Copa / Vitalidad */}
      <CanopyLayer vitalidad={stats.vitalidad} progress={progress} />

      {/* 5. Flora — Conocimiento (pendiente de overlay assets) */}
      <FloraLayer conocimiento={stats.conocimiento} stage={stage} />

      {/* 6. Frutos — Trabajo (pendiente de overlay assets) */}
      <FruitLayer trabajo={stats.trabajo} stage={stage} />

      {/* 7. Núcleo — nivel, conectado al sello del cultivador */}
      <CoreGlowLayer nivel={nivel} tierColor={tierColor} progress={progress} />
    </div>
  )
}
