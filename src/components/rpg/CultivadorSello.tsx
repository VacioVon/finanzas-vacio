import { useId } from 'react'
import { rpgTierColor } from '@/types/rpg.types'

interface CultivadorSelloProps {
  nivel:     number
  size?:     number
  className?: string
}

function hexPts(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60) - 90) * (Math.PI / 180)
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

// Evolución visual del sello:
// Nivel 1–4:   hexágono simple
// Nivel 5–9:   + anillo exterior
// Nivel 10–14: + marcas de runa en vértices del anillo
// Nivel 15–18: + núcleo luminoso interior
// Nivel 19–20: + doble anillo, La Unión

export function CultivadorSello({ nivel, size = 88, className = '' }: CultivadorSelloProps) {
  const uid   = useId().replace(/:/g, '')
  const color = rpgTierColor(nivel)

  const showOuterRing  = nivel >= 5
  const showRunes      = nivel >= 10
  const showCore       = nivel >= 15
  const isUnion        = nivel >= 20

  // Intensidad del aura según nivel
  const auraR = nivel <= 4 ? 5 : nivel <= 9 ? 9 : nivel <= 14 ? 14 : nivel <= 18 ? 20 : 28
  const auraO = nivel <= 4 ? '40' : nivel <= 9 ? '70' : nivel <= 14 ? '95' : nivel <= 18 ? 'CC' : 'FF'
  const filter = `drop-shadow(0 0 ${auraR}px ${color}${auraO})`

  const INNER_R  = 36
  const OUTER_R  = 44
  const OUTER2_R = 49

  // Vértices del anillo exterior para las runas
  const runeVerts = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60) - 90) * (Math.PI / 180)
    return { x: 50 + OUTER_R * Math.cos(a), y: 50 + OUTER_R * Math.sin(a) }
  })

  // El texto del nivel se desplaza ligeramente hacia arriba cuando hay label inferior
  const numY = isUnion ? '43' : showCore ? '48' : '52'

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      style={{ filter }}
      role="img"
      aria-label={`Sello de cultivador nivel ${nivel}`}
    >
      <defs>
        {showCore && (
          <radialGradient id={`${uid}-g`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </radialGradient>
        )}
      </defs>

      {/* Fondo translúcido del hexágono */}
      <polygon
        points={hexPts(50, 50, INNER_R)}
        fill={color}
        fillOpacity={isUnion ? 0.18 : 0.07}
      />

      {/* Borde del hexágono principal */}
      <polygon
        points={hexPts(50, 50, INNER_R)}
        fill="none"
        stroke={color}
        strokeWidth={nivel >= 8 ? '1.8' : '1.4'}
        strokeOpacity="0.85"
      />

      {/* Anillo exterior — aparece en nivel 5 */}
      {showOuterRing && (
        <polygon
          points={hexPts(50, 50, OUTER_R)}
          fill="none"
          stroke={color}
          strokeWidth={nivel >= 11 ? '1.0' : '0.7'}
          strokeOpacity="0.42"
        />
      )}

      {/* Segundo anillo — La Unión nivel 20 */}
      {isUnion && (
        <polygon
          points={hexPts(50, 50, OUTER2_R)}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          strokeOpacity="0.28"
        />
      )}

      {/* Runas — diamantes en los vértices del anillo exterior, nivel 10+ */}
      {showRunes && runeVerts.map((v, i) => (
        <rect
          key={i}
          x={v.x - 2}
          y={v.y - 2}
          width="4"
          height="4"
          fill={color}
          fillOpacity="0.85"
          transform={`rotate(45 ${v.x.toFixed(2)} ${v.y.toFixed(2)})`}
        />
      ))}

      {/* Núcleo luminoso radial — nivel 15+ */}
      {showCore && (
        <polygon
          points={hexPts(50, 50, 20)}
          fill={`url(#${uid}-g)`}
        />
      )}

      {/* Número de nivel */}
      <text
        x="50"
        y={numY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={nivel >= 10 ? '22' : '24'}
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={color}
        fillOpacity="0.95"
      >
        {nivel}
      </text>

      {/* "LA UNIÓN" — solo en nivel 20 */}
      {isUnion && (
        <text
          x="50"
          y="64"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="5.5"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill={color}
          fillOpacity="0.75"
          letterSpacing="2"
        >
          LA UNIÓN
        </text>
      )}
    </svg>
  )
}
