import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { useCompletarMisionManual } from '@/hooks/rpg/useMisionesManual'
import { CAMINO_META } from '@/types/rpg.types'
import type { CaminoMision } from '@/types/rpg.types'

interface MisionManualCardProps {
  mision: {
    id:            string
    nombre:        string
    descripcion:   string | null
    emoji:         string
    camino:        CaminoMision
    stat_key:      CaminoMision
    xp_recompensa: number
    disponible:    boolean
    disponible_en: string | null
    cap_alcanzado: boolean
  }
  onCompletada?: (xp: number, nivelNuevo?: number) => void
}

function formatCooldown(isoTs: string): string {
  const ms      = new Date(isoTs).getTime() - Date.now()
  const totalMin = Math.ceil(ms / 60_000)
  if (totalMin <= 0)    return 'pronto'
  if (totalMin < 60)    return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function MisionManualCard({ mision, onCompletada }: MisionManualCardProps) {
  const completar = useCompletarMisionManual()
  const [error, setError] = useState<string | null>(null)
  const meta = CAMINO_META[mision.camino]

  async function handleCompletar() {
    if (!mision.disponible || completar.isPending) return
    setError(null)
    try {
      const res = await completar.mutateAsync(mision.id)
      if (res.ok && res.xp_otorgada) {
        const nivelNuevo = res.rpg?.subio_nivel ? res.rpg.nivel_nuevo : undefined
        onCompletada?.(res.xp_otorgada, nivelNuevo)
      } else if (!res.ok) {
        if (res.error === 'cooldown') setError('Cooldown activo')
        else if (res.error === 'limite_diario_alcanzado') setError('Límite diario alcanzado')
        else setError(res.error ?? 'Error desconocido')
      }
    } catch {
      setError('Error al completar')
    }
  }

  const bloqueado = !mision.disponible || mision.cap_alcanzado

  return (
    <div className={[
      'rounded-xl border transition-all',
      bloqueado ? 'border-night-border/40 bg-night-2/40' : 'border-night-border bg-night-2',
    ].join(' ')}>

      {/* Cuerpo */}
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">

        {/* Emoji */}
        <span className={`text-2xl leading-none flex-shrink-0 mt-0.5 ${bloqueado ? 'opacity-40' : ''}`}>
          {mision.emoji}
        </span>

        <div className="flex-1 min-w-0">
          {/* Camino chip */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border mb-1.5"
            style={{
              color:            meta.color,
              borderColor:      `${meta.color}30`,
              backgroundColor:  `${meta.color}12`,
            }}
          >
            {meta.emoji} {meta.label}
          </span>

          {/* Nombre */}
          <p className={`text-sm font-semibold text-balance leading-snug ${bloqueado ? 'text-slate-500' : 'text-slate-100'}`}>
            {mision.nombre}
          </p>
          {mision.descripcion && (
            <p className="text-xs text-slate-600 text-pretty mt-0.5">{mision.descripcion}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={[
        'flex items-center justify-between gap-2 px-4 py-2.5 rounded-b-xl border-t',
        bloqueado ? 'border-night-border/30 bg-night-2/20' : 'border-night-border/50 bg-night-3/20',
      ].join(' ')}>

        {/* XP badge */}
        <span className={`flex items-center gap-1 text-[11px] font-bold ${bloqueado ? 'text-slate-600' : 'text-xp-400'}`}>
          <Zap className="size-3" />
          +{mision.xp_recompensa} XP
        </span>

        {/* Estado / botón */}
        {mision.cap_alcanzado ? (
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
            Límite diario
          </span>
        ) : mision.disponible_en ? (
          <span className="text-[11px] font-medium text-slate-600">
            Disponible en {formatCooldown(mision.disponible_en)}
          </span>
        ) : (
          <button
            onClick={handleCompletar}
            disabled={completar.isPending}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-all flex-shrink-0"
            style={{
              color:           meta.color,
              borderColor:     `${meta.color}30`,
              backgroundColor: `${meta.color}12`,
            }}
          >
            {completar.isPending
              ? <Loader2 className="size-3 animate-spin" />
              : null
            }
            {completar.isPending ? 'Registrando…' : 'Lo hice ✓'}
          </button>
        )}
      </div>

      {/* Error inline */}
      {error && (
        <p className="px-4 pb-2 text-[10px] text-gasto-400">{error}</p>
      )}
    </div>
  )
}
