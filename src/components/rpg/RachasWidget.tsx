import { useRPGRachas } from '@/hooks/rpg/useRPG'
import type { RPGRacha } from '@/types/rpg.types'

const RACHA_META: Record<string, { label: string; icono: string; hitos: number[] }> = {
  presupuesto: {
    label: 'Presupuesto',
    icono: '📊',
    hitos: [3, 6, 12],
  },
  deuda_pagos: {
    label: 'Pagos de deuda',
    icono: '📅',
    hitos: [6, 12],
  },
}

function RachaCard({ racha }: { racha: RPGRacha }) {
  const meta = RACHA_META[racha.tipo_racha]
  if (!meta) return null

  const activa = racha.inicio_racha !== null && racha.contador > 0

  // Próximo hito
  const proximoHito = meta.hitos.find(h => h > racha.contador)
  const pctHito = proximoHito
    ? Math.min(100, Math.round((racha.contador / proximoHito) * 100))
    : 100

  return (
    <div className={[
      'flex flex-col gap-2 rounded-2xl border p-3',
      activa ? 'border-brand-500/25 bg-brand-500/5' : 'border-night-border/40 bg-night-2/40',
    ].join(' ')}>
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{meta.icono}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-300 truncate">{meta.label}</p>
          <p className="text-[10px] text-slate-500">
            Mejor: {racha.mejor_racha} {racha.mejor_racha === 1 ? 'mes' : 'meses'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold tabular-nums leading-none ${activa ? 'text-brand-300' : 'text-slate-600'}`}>
            {racha.contador}
          </p>
          <p className="text-[9px] text-slate-500">meses</p>
        </div>
      </div>
      {proximoHito && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-500">Próximo hito: {proximoHito}m</span>
            <span className="text-[9px] tabular-nums text-slate-500">{pctHito}%</span>
          </div>
          <div className="h-1 rounded-full bg-night-3">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-700"
              style={{ width: `${pctHito}%` }}
            />
          </div>
        </div>
      )}
      {!proximoHito && racha.contador >= 12 && (
        <p className="text-[10px] text-[#FFB703] font-medium">¡Racha máxima alcanzada!</p>
      )}
    </div>
  )
}

export function RachasWidget() {
  const { data: rachas = [], isLoading } = useRPGRachas()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-night-3/60" />
        ))}
      </div>
    )
  }

  // Mostrar solo las rachas conocidas, completar las que no existen aún con contador 0
  const rachasMap = new Map(rachas.map(r => [r.tipo_racha, r]))
  const tiposConocidos = Object.keys(RACHA_META)
  const rachasVisibles: RPGRacha[] = tiposConocidos.map(tipo =>
    rachasMap.get(tipo) ?? {
      usuario_id:   '',
      tipo_racha:   tipo,
      inicio_racha: null,
      ultimo_evento: null,
      contador:     0,
      mejor_racha:  0,
    }
  )

  return (
    <div className="grid grid-cols-2 gap-2">
      {rachasVisibles.map(r => (
        <RachaCard key={r.tipo_racha} racha={r} />
      ))}
    </div>
  )
}
