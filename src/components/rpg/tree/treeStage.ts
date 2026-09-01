// ── Árbol de Vida — sistema de etapas ───────────────────────────────────────
// 20 niveles → 6 etapas visuales.
// Rangos: según Biblia_Arbol_de_los_Meridianos_6_Etapas (nivel nunca retrocede).

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
  file:       string           // archivo PNG en /public/assets/rpg/tree/
  levelRange: [number, number] // [min, max] inclusive
}

// Tabla maestra — congelada junto con la Biblia del Árbol
export const TREE_STAGES: readonly TreeStageInfo[] = [
  { key: 'semilla',         label: 'Semilla',         file: 'semilla.png',         levelRange: [1,  2]  },
  { key: 'brote',           label: 'Brote',           file: 'brote.png',           levelRange: [3,  4]  },
  { key: 'arbol-joven',     label: 'Árbol Joven',     file: 'arbol-joven.png',     levelRange: [5,  7]  },
  { key: 'arbol-fuerte',    label: 'Árbol Fuerte',    file: 'arbol-fuerte.png',    levelRange: [8,  11] },
  { key: 'arbol-antiguo',   label: 'Árbol Antiguo',   file: 'arbol-antiguo.png',   levelRange: [12, 16] },
  { key: 'arbol-ancestral', label: 'Árbol Ancestral', file: 'arbol-ancestral.png', levelRange: [17, 20] },
] as const

// Devuelve la etapa correspondiente al nivel (nunca retrocede).
export function treeStageFromLevel(nivel: number): TreeStageInfo {
  return (
    TREE_STAGES.find(s => nivel >= s.levelRange[0] && nivel <= s.levelRange[1])
    ?? TREE_STAGES[0]
  )
}

// Índice 0-5 de la etapa dentro de TREE_STAGES.
export function treeStageIndex(stage: TreeStageInfo): number {
  const idx = TREE_STAGES.findIndex(s => s.key === stage.key)
  return idx < 0 ? 0 : idx
}

// Progresión dentro de la etapa: 0.0 (inicio) → 1.0 (tope).
// Permite que los efectos de capas crezcan dentro de la misma etapa,
// evitando periodos visualmente estáticos entre cambios de asset.
export function stageProgress(nivel: number, stage: TreeStageInfo): number {
  const [min, max] = stage.levelRange
  if (max === min) return 1
  return (nivel - min) / (max - min)
}
