import { useEffect, useRef } from 'react'
import type { Categoria, Subcategoria } from '@/types/app.types'

// ── CSS de selección (inyectado una vez) ─────────────────────────────────────

const PICK_CSS = `
@keyframes catPick { 0%{ transform:scale(1) } 35%{ transform:scale(1.08) } 70%{ transform:scale(.97) } 100%{ transform:scale(1) } }
@keyframes catGlow { 0%,100%{ opacity:.7 } 50%{ opacity:1 } }
.cat-card { transition: transform .18s ease, box-shadow .22s ease, border-color .18s ease; }
.cat-card:active { transform: scale(.94); }
.cat-card.selected { animation: catPick .35s ease-out both; }
.cat-chip { transition: transform .12s ease, background .15s ease; }
.cat-chip:active { transform: scale(.92); }
@media (prefers-reduced-motion: reduce) {
  .cat-card, .cat-card.selected, .cat-chip { animation:none !important; transition:none !important; }
}
`

function useCatPickCSS() {
  useEffect(() => {
    if (document.getElementById('cat-pick-css')) return
    const el = document.createElement('style')
    el.id = 'cat-pick-css'
    el.textContent = PICK_CSS
    document.head.appendChild(el)
  }, [])
}

// ── Fallback de color si la categoría no tiene uno ───────────────────────────

const FALLBACK_COLORS: Record<string, string> = {
  alimentación: '#10D97F', comida: '#10D97F', supermercado: '#10D97F',
  casa:         '#2979FF', hogar: '#2979FF', arriendo: '#2979FF',
  transporte:   '#00C2CB', auto: '#00C2CB', movilidad: '#00C2CB',
  salud:        '#F4645F', medicina: '#F4645F', médico: '#F4645F',
  mascotas:     '#FFB703', mascota: '#FFB703', veterinario: '#FFB703',
  ocio:         '#9B5DE5', entretenimiento: '#9B5DE5', juegos: '#9B5DE5',
  familia:      '#FF6B9D', hijos: '#FF6B9D',
  educación:    '#7C3AED', estudio: '#7C3AED',
  deudas:       '#EF4444', deuda: '#EF4444', crédito: '#EF4444',
  ahorro:       '#34D399',
  ropa:         '#EC4899', vestuario: '#EC4899',
  tecnología:   '#38BDF8', tech: '#38BDF8',
}

function catColor(cat: Categoria): string {
  if (cat.color) return cat.color
  const key = cat.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [k, v] of Object.entries(FALLBACK_COLORS)) {
    if (key.includes(k)) return v
  }
  return '#64748B'
}

// ── Tarjeta de categoría ─────────────────────────────────────────────────────

interface CatCardProps {
  cat:        Categoria
  selected:   boolean
  onClick:    () => void
}

function CatCard({ cat, selected, onClick }: CatCardProps) {
  const color  = catColor(cat)
  const cardRef = useRef<HTMLButtonElement>(null)

  function handleClick() {
    // Forzar re-trigger de la animación
    if (cardRef.current) {
      cardRef.current.classList.remove('selected')
      void cardRef.current.offsetWidth
      cardRef.current.classList.add('selected')
    }
    onClick()
  }

  return (
    <button
      ref={cardRef}
      type="button"
      aria-pressed={selected}
      aria-label={`Categoría ${cat.nombre}`}
      onClick={handleClick}
      className={`cat-card relative flex flex-col items-center justify-center gap-2 px-2 py-3.5 rounded-2xl border overflow-hidden text-center w-full${selected ? ' selected' : ''}`}
      style={{
        backgroundColor: selected ? `${color}18` : 'rgba(53,51,68,0.6)',
        borderColor:     selected ? `${color}70` : 'rgba(61,59,80,0.5)',
        boxShadow:       selected
          ? `0 0 0 1px ${color}40, 0 0 20px ${color}28, inset 0 0 16px ${color}10`
          : '0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      {/* Glow de fondo cuando está seleccionado */}
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:    `radial-gradient(ellipse 90% 80% at 50% 30%, ${color}20, transparent 75%)`,
            animation:     'catGlow 2.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Ícono */}
      <div
        className="relative size-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{
          backgroundColor: `${color}${selected ? '30' : '18'}`,
          boxShadow:       selected ? `0 0 12px ${color}55` : 'none',
        }}
      >
        {cat.emoji ?? '📦'}
        {/* Partícula de brillo cuando seleccionado */}
        {selected && (
          <div
            className="absolute -top-0.5 -right-0.5 size-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}`, animation: 'catGlow 1.8s ease-in-out infinite' }}
          />
        )}
      </div>

      {/* Nombre */}
      <span
        className="text-[11px] font-semibold leading-tight max-w-full truncate px-1"
        style={{ color: selected ? color : '#CBD5E1' }}
      >
        {cat.nombre}
      </span>

      {/* Indicador de selección */}
      {selected && (
        <div
          className="absolute top-1.5 right-1.5 size-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
      )}
    </button>
  )
}

// ── Chip de subcategoría ─────────────────────────────────────────────────────

interface SubChipProps {
  sub:      Subcategoria
  selected: boolean
  color:    string
  onClick:  () => void
}

function SubChip({ sub, selected, color, onClick }: SubChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="cat-chip px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors"
      style={{
        borderColor:     selected ? `${color}70` : 'rgba(61,59,80,0.6)',
        backgroundColor: selected ? `${color}20` : 'rgba(53,51,68,0.5)',
        color:           selected ? color         : '#94A3B8',
        boxShadow:       selected ? `0 0 10px ${color}30` : 'none',
      }}
    >
      {sub.nombre}
    </button>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

interface CategoryPickerProps {
  categories:       Categoria[]
  selectedId:       string
  selectedSubId?:   string
  onSelect:         (catId: string) => void
  onSelectSub?:     (subId: string) => void
  error?:           string
  tipoColor?:       string  // acento del tipo de movimiento para el header
}

export function CategoryPicker({
  categories,
  selectedId,
  selectedSubId,
  onSelect,
  onSelectSub,
  error,
  tipoColor,
}: CategoryPickerProps) {
  useCatPickCSS()

  const selectedCat  = categories.find(c => c.id === selectedId)
  const subcats      = (selectedCat?.subcategorias ?? []).filter(s => s.activa)
  const accentColor  = selectedCat ? catColor(selectedCat) : (tipoColor ?? '#2979FF')

  if (categories.length === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-4 rounded-2xl border border-dashed border-night-border">
        Sin categorías disponibles
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Label con acento del tipo */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${accentColor}60, transparent)` }} />
        <span className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-500">
          Categoría
        </span>
        <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${accentColor}60, transparent)` }} />
      </div>

      {/* Grid de tarjetas 2 columnas */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {categories.map(cat => (
          <CatCard
            key={cat.id}
            cat={cat}
            selected={cat.id === selectedId}
            onClick={() => {
              onSelect(cat.id)
              if (onSelectSub) onSelectSub('')
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-gasto-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      {/* Subcategorías como chips */}
      {subcats.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-[.18em]"
              style={{ color: `${accentColor}80` }}
            >
              Subcategoría
            </span>
            <span className="text-[10px] text-slate-600">(opcional)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subcats.map(sub => (
              <SubChip
                key={sub.id}
                sub={sub}
                selected={sub.id === selectedSubId}
                color={accentColor}
                onClick={() => onSelectSub?.(sub.id === selectedSubId ? '' : sub.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
