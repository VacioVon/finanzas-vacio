// ── Árbol de Vida — sistema de etapas ───────────────────────────────────────
// 20 niveles → 6 etapas visuales.
// El asset de etapa NUNCA retrocede (nivel nunca decrece — spec congelada).
// Los efectos/layers modula la intensidad visual DENTRO de cada etapa.

export type TreeStage =
  | 'semilla'
  | 'brote'
  | 'arbol-joven'
  | 'arbol-fuerte'
  | 'arbol-antiguo'
  | 'arbol-ancestral'

export interface TreeStageInfo {
  key:        TreeStage
  label:      string           // nombre de etapa para UI
  file:       string           // nombre del WebP esperado
  levelRange: [number, number] // [min, max] inclusive
}

// Tabla maestra de etapas — congelada junto con los 20 niveles del RPG
export const TREE_STAGES: readonly TreeStageInfo[] = [
  { key: 'semilla',         label: 'Semilla',         file: 'semilla.webp',         levelRange: [1,  2]  },
  { key: 'brote',           label: 'Brote',           file: 'brote.webp',           levelRange: [3,  4]  },
  { key: 'arbol-joven',     label: 'Árbol Joven',     file: 'arbol-joven.webp',     levelRange: [5,  9]  },
  { key: 'arbol-fuerte',    label: 'Árbol Fuerte',    file: 'arbol-fuerte.webp',    levelRange: [10, 13] },
  { key: 'arbol-antiguo',   label: 'Árbol Antiguo',   file: 'arbol-antiguo.webp',   levelRange: [14, 17] },
  { key: 'arbol-ancestral', label: 'Árbol Ancestral', file: 'arbol-ancestral.webp', levelRange: [18, 20] },
] as const

// Devuelve la etapa correspondiente al nivel.
// Nunca retrocede porque el nivel nunca decrece.
export function treeStageFromLevel(nivel: number): TreeStageInfo {
  return (
    TREE_STAGES.find(s => nivel >= s.levelRange[0] && nivel <= s.levelRange[1])
    ?? TREE_STAGES[0]
  )
}

// Progresión dentro de la etapa actual: 0.0 (inicio de etapa) → 1.0 (límite superior).
// Permite que los efectos cresciendo dentro de la misma etapa, evitando
// largos tramos visualmente estáticos entre cambios de asset.
export function stageProgress(nivel: number, stage: TreeStageInfo): number {
  const [min, max] = stage.levelRange
  if (max === min) return 1
  return (nivel - min) / (max - min)
}
