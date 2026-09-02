import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useMisiones, useVerificarTodasMisiones } from '@/hooks/rpg/useMisiones'
import { MisionCard } from './MisionCard'
import type { TipoMision } from '@/types/rpg.types'

const TABS: { tipo: TipoMision | 'todas'; label: string; emoji: string }[] = [
  { tipo: 'todas',    label: 'Todas',     emoji: '🗺️' },
  { tipo: 'diaria',   label: 'Diarias',   emoji: '🌿' },
  { tipo: 'semanal',  label: 'Semanales', emoji: '⚡' },
  { tipo: 'especial', label: 'Especiales', emoji: '🔥' },
]

interface XPToast { id: number; xp: number }

export function MisionesPanel() {
  const { data: misiones, isLoading } = useMisiones()
  const verificarTodas = useVerificarTodasMisiones()
  const [tab,    setTab]    = useState<TipoMision | 'todas'>('todas')
  const [toasts, setToasts] = useState<XPToast[]>([])

  useEffect(() => {
    verificarTodas.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCompletada(xp: number) {
    const id = Date.now()
    setToasts(t => [...t, { id, xp }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }

  const filtradas   = (misiones ?? []).filter(m => tab === 'todas' || m.tipo === tab)
  const pendientes  = filtradas.filter(m => m.estado !== 'completada')
  const completadas = filtradas.filter(m => m.estado === 'completada')

  return (
    <div className="relative">

      {/* XP toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-1.5 bg-xp-500 text-night-0 text-sm font-bold px-3 py-1.5 rounded-xl shadow-glow-xp"
          >
            <Zap className="size-3.5" />
            +{t.xp} XP
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-slate-100">Misiones del cultivador</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            <span className="text-xp-400 font-semibold">{pendientes.length}</span> pendientes
            {completadas.length > 0 && ` · ${completadas.length} completadas`}
          </p>
        </div>
        <button
          onClick={() => verificarTodas.mutate()}
          disabled={verificarTodas.isPending}
          className="text-[11px] font-medium text-brand-400 hover:text-brand-300 disabled:opacity-40 transition-colors"
        >
          {verificarTodas.isPending ? 'Actualizando…' : 'Actualizar progreso'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-night-3/40 rounded-xl p-1">
        {TABS.map(({ tipo, label, emoji }) => {
          const count = tipo === 'todas'
            ? (misiones ?? []).filter(m => m.estado !== 'completada').length
            : (misiones ?? []).filter(m => m.tipo === tipo && m.estado !== 'completada').length
          return (
            <button
              key={tipo}
              onClick={() => setTab(tipo)}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all',
                tab === tipo
                  ? 'bg-night-2 text-slate-100 shadow'
                  : 'text-slate-500 hover:text-slate-400',
              ].join(' ')}
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">{label}</span>
              {count > 0 && (
                <span className={`text-[9px] tabular-nums font-bold leading-none ${tab === tipo ? 'text-xp-400' : 'text-slate-600'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl bg-night-3/40 animate-pulse" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-2xl mb-2">🗺️</p>
          <p className="text-sm font-medium text-slate-400">Sin misiones en esta categoría</p>
          <p className="text-xs text-slate-600 mt-1">Vuelve más tarde para nuevos desafíos</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Pendientes */}
          {pendientes.length > 0 && (
            <div className="space-y-3">
              {pendientes.map(m => (
                <MisionCard key={m.mision_id} mision={m} onCompletada={handleCompletada} />
              ))}
            </div>
          )}

          {/* Separador + completadas */}
          {completadas.length > 0 && (
            <div>
              {pendientes.length > 0 && (
                <div className="flex items-center gap-2 my-4">
                  <div className="h-px flex-1 bg-night-border/40" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Completadas · {completadas.length}
                  </span>
                  <div className="h-px flex-1 bg-night-border/40" />
                </div>
              )}
              <div className="space-y-3">
                {completadas.map(m => (
                  <MisionCard key={m.mision_id} mision={m} onCompletada={handleCompletada} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
