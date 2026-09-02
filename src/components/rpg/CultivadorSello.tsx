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
// Nivel 1–4:   hexágono simple + diamante cima + guiones laterales
// Nivel 5–9:   + anillo exterior + marca superior/inferior
// Nivel 10–14: + runas en vértices + líneas flanqueando el número
// Nivel 15–18: + núcleo luminoso + partículas orbitales (SMIL)
// Nivel 19–20: + doble anillo, partículas densas, La Unión

export function CultivadorSello({ nivel, size = 88, className = '' }: CultivadorSelloProps) {
  const uid   = useId().replace(/:/g, '')
  const color = rpgTierColor(nivel)

  const showOuterRing  = nivel >= 5
  const showRunes      = nivel >= 10
  const showCore       = nivel >= 15
  const showOrbits     = nivel >= 15
  const isUnion        = nivel >= 20

  // Aura drop-shadow
  const auraR = nivel <= 4 ? 5 : nivel <= 9 ? 9 : nivel <= 14 ? 14 : nivel <= 18 ? 22 : 30
  const auraO = nivel <= 4 ? '40' : nivel <= 9 ? '70' : nivel <= 14 ? '95' : nivel <= 18 ? 'CC' : 'FF'
  const filter = `drop-shadow(0 0 ${auraR}px ${color}${auraO})`

  const INNER_R  = 36
  const OUTER_R  = 44
  const OUTER2_R = 49

  // Vértices del anillo exterior para runas
  const runeVerts = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60) - 90) * (Math.PI / 180)
    return { x: 50 + OUTER_R * Math.cos(a), y: 50 + OUTER_R * Math.sin(a) }
  })

  // Posición vertical del número — sube cuando hay decoración superior
  const numY = isUnion ? '44' : showCore ? '49' : showRunes ? '51' : '52'

  // Partículas orbitales: 3 puntos en radio 40, desfasados 120°
  const ORBIT_R = 40
  // Punto de partida en "12 en punto" de la órbita (cx=50, cy=50-ORBIT_R)
  const orbitStart = { cx: 50, cy: 50 - ORBIT_R }

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
        fillOpacity={isUnion ? 0.20 : 0.07}
      />

      {/* Borde del hexágono principal */}
      <polygon
        points={hexPts(50, 50, INNER_R)}
        fill="none"
        stroke={color}
        strokeWidth={nivel >= 8 ? '1.8' : '1.4'}
        strokeOpacity="0.88"
      />

      {/* Anillo exterior — aparece en nivel 5 */}
      {showOuterRing && (
        <polygon
          points={hexPts(50, 50, OUTER_R)}
          fill="none"
          stroke={color}
          strokeWidth={nivel >= 11 ? '1.0' : '0.7'}
          strokeOpacity="0.44"
        />
      )}

      {/* Segundo anillo — La Unión nivel 20 */}
      {isUnion && (
        <polygon
          points={hexPts(50, 50, OUTER2_R)}
          fill="none"
          stroke={color}
          strokeWidth="0.6"
          strokeOpacity="0.32"
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

      {/* ── Diamante en la cima del hexágono (todos los niveles) ── */}
      {/* El diamante ◇ en el vértice superior da sensación de "rango" */}
      <rect
        x="48.2" y="10.2"
        width="3.6" height="3.6"
        transform="rotate(45 50 12)"
        fill={color}
        fillOpacity={nivel >= 10 ? 0.92 : nivel >= 5 ? 0.72 : 0.50}
      />

      {/* Marcas laterales en el vértice inferior — nivel 5+ */}
      {showOuterRing && (
        <>
          <line x1="42" y1="91" x2="46" y2="91" stroke={color} strokeWidth="0.7" strokeOpacity="0.45" strokeLinecap="round" />
          <line x1="54" y1="91" x2="58" y2="91" stroke={color} strokeWidth="0.7" strokeOpacity="0.45" strokeLinecap="round" />
        </>
      )}

      {/* Líneas flanqueando el número — nivel 10+, sensación de título/rango */}
      {showRunes && (
        <>
          <line x1="24" y1={numY} x2="35" y2={numY} stroke={color} strokeWidth="0.6" strokeOpacity="0.38" strokeLinecap="round" />
          <line x1="65" y1={numY} x2="76" y2={numY} stroke={color} strokeWidth="0.6" strokeOpacity="0.38" strokeLinecap="round" />
        </>
      )}

      {/* ── Partículas orbitales (SMIL) — nivel 15+ ── */}
      {/* 3 puntos a radio 40, rotando a 0°/120°/240° de fase */}
      {showOrbits && [0, 120, 240].map((phase, i) => (
        <circle
          key={i}
          cx={orbitStart.cx}
          cy={orbitStart.cy}
          r={isUnion ? 2.8 : 2.2}
          fill={color}
          fillOpacity={isUnion ? 0.85 : 0.65}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`${phase} 50 50`}
            to={`${phase + 360} 50 50`}
            dur={isUnion ? '5s' : '8s'}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* ── Número de nivel ── */}
      <text
        x="50"
        y={numY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={nivel >= 10 ? '21' : '23'}
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
          y="65"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="5.5"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill={color}
          fillOpacity="0.78"
          letterSpacing="2"
        >
          LA UNIÓN
        </text>
      )}
    </svg>
  )
}
