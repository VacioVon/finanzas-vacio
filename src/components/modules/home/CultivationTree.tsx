import { useId } from 'react'
import { Card } from '@/components/ui/Card'
import { useRPGPerfil } from '@/hooks/rpg/useRPG'
import { rpgTierColor } from '@/types/rpg.types'
import { CultivadorPlaca } from '@/components/rpg/CultivadorPlaca'

export interface CultivationStats {
  finanzas:     number
  disciplina:   number
  vitalidad:    number
  conocimiento: number
  trabajo:      number
}

interface CultivationTreeProps {
  stats?: CultivationStats
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export function CultivationTree({ stats: statsProp }: CultivationTreeProps) {
  const { data: perfil } = useRPGPerfil()

  const raw: CultivationStats = statsProp ?? (perfil ? {
    finanzas:     perfil.stat_finanzas,
    disciplina:   perfil.stat_disciplina,
    vitalidad:    perfil.stat_vitalidad,
    conocimiento: perfil.stat_conocimiento,
    trabajo:      perfil.stat_trabajo,
  } : { finanzas: 0, disciplina: 0, vitalidad: 0, conocimiento: 0, trabajo: 0 })

  const safeStats: CultivationStats = {
    finanzas:     clamp(raw.finanzas),
    disciplina:   clamp(raw.disciplina),
    vitalidad:    clamp(raw.vitalidad),
    conocimiento: clamp(raw.conocimiento),
    trabajo:      clamp(raw.trabajo),
  }

  const nivel      = perfil?.nivel ?? 1
  const tierColor  = rpgTierColor(nivel)

  const uid         = useId().replace(/:/g, '')
  const rootScale   = 0.72 + safeStats.finanzas    / 360
  const trunkScale  = 0.82 + safeStats.disciplina  / 420
  const canopyScale = 0.58 + safeStats.vitalidad   / 190
  const flowerCount = Math.round(safeStats.conocimiento / 25)
  const fruitCount  = Math.round(safeStats.trabajo      / 25)

  // Núcleo del árbol responde al nivel: dim en nivel 1, intenso en nivel 20
  const coreOpacity = 0.07 + (nivel / 20) * 0.30

  return (
    <Card padding="none" className="relative isolate overflow-hidden bg-[#11101A] border-[#3D3B50]/80">

      {/* Fondo ambiental */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: [
            'radial-gradient(ellipse at 50% 48%, rgba(30,96,64,.18), transparent 55%)',
            'radial-gradient(ellipse at 12% 90%, rgba(41,121,255,.10), transparent 42%)',
          ].join(', '),
        }}
      />

      {/* ── Identidad del cultivador ── */}
      <CultivadorPlaca />

      {/* ── Conector energético cultivador ↔ árbol ── */}
      <div className="relative mx-4 flex items-center justify-center py-1 sm:mx-6">
        <div
          className="h-px flex-1 rounded-full"
          style={{ backgroundColor: `${tierColor}18` }}
        />
        <div
          className="mx-3 size-1.5 rounded-full"
          style={{ backgroundColor: tierColor, opacity: 0.40 }}
        />
        <div
          className="h-px flex-1 rounded-full"
          style={{ backgroundColor: `${tierColor}18` }}
        />
      </div>

      {/* ── Árbol de vida ── */}
      <div className="relative mx-auto aspect-[1.22/1] w-full max-w-[680px] min-h-[260px] sm:min-h-[320px]">
        <svg
          viewBox="0 0 700 570"
          className="h-full w-full"
          role="img"
          aria-label="Árbol de vida — manifestación de tu progreso"
        >
          <defs>
            <radialGradient id={`${uid}-core`}>
              <stop stopColor="#B9FFE0" />
              <stop offset=".32" stopColor="#10D97F" />
              <stop offset="1"   stopColor="#1E6040" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}-bark`} x1="0" y1="1" x2="1" y2="0">
              <stop stopColor="#24150F" />
              <stop offset=".5" stopColor="#6B3420" />
              <stop offset="1"  stopColor="#342019" />
            </linearGradient>
            <linearGradient id={`${uid}-leaf`} x1="0" y1="1" x2="1" y2="0">
              <stop stopColor="#143C2A" />
              <stop offset=".55" stopColor="#2A6828" />
              <stop offset="1"   stopColor="#79B65A" />
            </linearGradient>
            <filter id={`${uid}-soft`}><feGaussianBlur stdDeviation="12" /></filter>
          </defs>

          {/* Sombra base */}
          <ellipse cx="350" cy="465" rx="250" ry="30" fill="#020306" opacity=".62" />

          {/* Raíces — Finanzas */}
          <g
            transform={`translate(350 450) scale(${rootScale}) translate(-350 -450)`}
            fill="none"
            strokeLinecap="round"
          >
            <path
              d="M350 445 C314 470 268 481 208 477 C171 475 142 489 112 507 C155 487 192 494 231 501 C281 510 324 493 350 463 C375 493 419 510 469 501 C508 494 545 487 588 507 C558 489 529 475 492 477 C432 481 386 470 350 445Z"
              fill="#24160F" stroke="#63351F" strokeWidth="9"
            />
            <path
              d="M343 455 C300 484 259 497 212 493 M357 455 C400 484 441 497 488 493 M318 461 C282 478 252 480 223 475 M382 461 C418 478 448 480 477 475"
              stroke="#1E6040" strokeWidth="3" opacity=".9"
            />
          </g>

          {/* Tronco — Disciplina */}
          <g transform={`translate(350 440) scale(${trunkScale}) translate(-350 -440)`}>
            <path
              d="M309 454 C316 409 300 374 306 337 C313 298 339 272 342 230 C345 193 330 162 347 122 C359 159 378 183 371 224 C365 264 389 287 398 322 C407 357 383 409 391 454 C368 468 330 468 309 454Z"
              fill={`url(#${uid}-bark)`} stroke="#7A4228" strokeWidth="4"
            />
            <path
              d="M346 392 C338 341 351 306 347 272 C342 234 357 195 352 158 M373 400 C365 358 379 332 366 294 M326 407 C334 371 319 345 335 311"
              fill="none" stroke="#B26236" strokeWidth="5" opacity=".55"
            />
            <path
              d="M350 276 C304 249 266 208 245 163 M355 250 C406 232 445 194 465 146 M345 222 C314 203 291 181 276 149 M365 210 C396 191 419 166 432 135"
              fill="none" stroke="#472210" strokeWidth="20" strokeLinecap="round"
            />
            <path
              d="M350 276 C304 249 266 208 245 163 M355 250 C406 232 445 194 465 146"
              fill="none" stroke="#77412A" strokeWidth="5" strokeLinecap="round"
            />
          </g>

          {/* Copa — Vitalidad */}
          <g transform={`translate(350 220) scale(${canopyScale}) translate(-350 -220)`}>
            <path
              d="M350 74 C309 45 267 76 264 113 C218 97 181 132 203 168 C154 174 151 226 189 246 C167 282 205 319 247 302 C267 343 318 332 335 299 C370 327 420 306 423 267 C471 266 489 217 455 187 C484 148 447 108 409 116 C405 72 371 52 350 74Z"
              fill={`url(#${uid}-leaf)`} stroke="#316B35" strokeWidth="5"
            />
            <path
              d="M220 182 C276 164 314 130 350 91 M350 91 C377 122 410 143 452 177 M241 267 C287 245 318 215 350 177 M350 177 C386 218 408 243 433 263"
              fill="none" stroke="#83B85B" strokeWidth="3" opacity=".35"
            />

            {/* Flores — Conocimiento */}
            {Array.from({ length: flowerCount }).map((_, i) => (
              <path
                key={`fl-${i}`}
                d={`M${276 + i * 42} ${138 + (i % 2) * 48} c-8-13 8-21 15-9 c7-12 23-4 15 9 c8 13-8 21-15 9 c-7 12-23 4-15-9Z`}
                fill="#9B5DE5" opacity=".9"
              />
            ))}

            {/* Frutos — Trabajo */}
            {Array.from({ length: fruitCount }).map((_, i) => (
              <path
                key={`fr-${i}`}
                d={`M${300 + i * 47} ${226 + (i % 2) * 18} q10-13 20 0 q0 20-10 25 q-10-5-10-25Z`}
                fill="#FFB703" stroke="#FFE08A" strokeWidth="2"
              />
            ))}
          </g>

          {/* Núcleo — opacidad modulada por nivel */}
          <circle
            cx="350" cy="255" r="75"
            fill={`url(#${uid}-core)`}
            opacity={coreOpacity}
            filter={`url(#${uid}-soft)`}
          />

          {/* Meridiano central */}
          <path
            d="M350 218 C339 239 341 260 350 282 C359 260 361 239 350 218Z"
            fill={`url(#${uid}-core)`}
            opacity=".9"
          />

          {/* Partículas de conocimiento */}
          <g fill="#9B5DE5">
            <circle cx="244" cy="159" r="3" />
            <circle cx="465" cy="145" r="2.5" />
            <circle cx="418" cy="201" r="2" />
          </g>

          {/* Partículas de flujo */}
          <g fill="#00C2CB" opacity=".7">
            <circle cx="198" cy="292" r="2" />
            <circle cx="496" cy="251" r="2.5" />
            <circle cx="283" cy="106" r="1.8" />
          </g>
        </svg>
      </div>

      {/* ── Stats footer ── */}
      <div className="relative grid grid-cols-5 gap-1 border-t border-white/5 px-3 py-3 sm:px-6">
        {([
          ['Finanzas',     safeStats.finanzas,     'text-mover-400'],
          ['Disciplina',   safeStats.disciplina,   'text-brand-400'],
          ['Vitalidad',    safeStats.vitalidad,    'text-ingreso-400'],
          ['Conocimiento', safeStats.conocimiento, 'text-ahorro-400'],
          ['Trabajo',      safeStats.trabajo,      'text-xp-400'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="text-center">
            <p className={`text-sm font-semibold tabular-nums ${color}`}>
              {Math.round(value)}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
