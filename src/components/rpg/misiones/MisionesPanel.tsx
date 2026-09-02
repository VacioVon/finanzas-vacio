import { useEffect, useState } from 'react'
import { Zap, Star } from 'lucide-react'
import { useMisiones, useVerificarTodasMisiones } from '@/hooks/rpg/useMisiones'
import { useMisionesManual } from '@/hooks/rpg/useMisionesManual'
import { MisionCard } from './MisionCard'
import { MisionManualCard } from './MisionManualCard'
import { CAMINO_META } from '@/types/rpg.types'
import type { TipoMision, CaminoMision } from '@/types/rpg.types'

type TabId = TipoMision | 'todas' | 'habitos'

const TABS: { tipo: TabId; label: string; emoji: string }[] = [
  { tipo: 'todas',    label: 'Todas',    emoji: '🗺️' },
  { tipo: 'diaria',  label: 'Diarias',  emoji: '🌿' },
  { tipo: 'semanal', label: 'Semanales',emoji: '⚡' },
  { tipo: 'habitos', label: 'Hábitos',  emoji: '🔱' },
]

const CAMINOS = Object.entries(CAMINO_META) as [CaminoMision, typeof CAMINO_META[CaminoMision]][]

interface XPToast  { id: number; xp: number; nivelNuevo?: number }

export function MisionesPanel() {
  const { data: misiones, isLoading: loadingM } = useMisiones()
  const verificarTodas  = useVerificarTodasMisiones()
  const { misiones: misionesManual, xpHoy, capDiario, isLoading: loadingH } = useMisionesManual()

  const [tab,    setTab]    = useState<TabId>('todas')
  const [camino, setCamino] = useState<CaminoMision | 'todos'>('todos')
  const [toasts, setToasts] = useState<XPToast[]>([])

  useEffect(() => {
    verificarTodas.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCompletada(xp: number, nivelNuevo?: number) {
    const id = Date.now()
    setToasts(t => [...t, { id, xp, nivelNuevo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  const esHabitos = tab === 'habitos'
  const filtradas = esHabitos ? [] : (misiones ?? []).filter(m => tab === 'todas' || m.tipo === tab)
  const pendientes  = filtradas.filter(m => m.estado !== 'completada')
  const completadas = filtradas.filter(m => m.estado === 'completada')

  const manualesFiltradas = camino === 'todos'
    ? misionesManual
    : misionesManual.filter(m => m.camino === camino)
  const disponibles = manualesFiltradas.filter(m => m.disponible)
  const bloqueadas  = manualesFiltradas.filter(m => !m.disponible)

  function tabCount(tipo: TabId): number {
    if (tipo === 'habitos') return disponibles.length
    if (tipo === 'todas')   return (misiones ?? []).filter(m => m.estado !== 'completada').length
    return (misiones ?? []).filter(m => m.tipo === tipo && m.estado !== 'completada').length
  }

  return (
    <div className="relative">

      {/* XP / nivel toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 bg-xp-500 text-night-0 text-sm font-bold px-3 py-1.5 rounded-xl shadow-glow-xp">
              <Zap className="size-3.5" />
              +{t.xp} XP
            </div>
            {t.nivelNuevo && (
              <div className="flex items-center gap-1.5 bg-ahorro-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                <Star className="size-3 fill-white" />
                ¡Nivel {t.nivelNuevo}!
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-slate-100">Misiones del cultivador</p>
          {esHabitos ? (
            <p className="text-[11px] text-slate-500 mt-0.5">
              XP manual hoy:{' '}
              <span className="text-xp-400 font-semibold tabular-nums">{xpHoy}</span>
              <span className="text-slate-600"> / {capDiario}</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-0.5">
              <span className="text-xp-400 font-semibold">{pendientes.length}</span> pendientes
              {completadas.length > 0 && ` · ${completadas.length} completadas`}
            </p>
          )}
        </div>
        {!esHabitos && (
          <button
            onClick={() => verificarTodas.mutate()}
            disabled={verificarTodas.isPending}
            className="text-[11px] font-medium text-brand-400 hover:text-brand-300 disabled:opacity-40 transition-colors"
          >
            {verificarTodas.isPending ? 'Actualizando…' : 'Actualizar progreso'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-night-3/40 rounded-xl p-1">
        {TABS.map(({ tipo, label, emoji }) => {
          const count = tabCount(tipo)
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

      {/* ── Tab Hábitos ── */}
      {esHabitos ? (
        loadingH ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-night-3/40 animate-pulse" />)}
          </div>
        ) : misionesManual.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">🔱</p>
            <p className="text-sm font-medium text-slate-400">Sin hábitos activos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filtro por camino */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCamino('todos')}
                className={[
                  'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all',
                  camino === 'todos'
                    ? 'bg-night-2 border-night-border text-slate-200'
                    : 'border-night-border/50 text-slate-500 hover:text-slate-400',
                ].join(' ')}
              >
                Todos
              </button>
              {CAMINOS.map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setCamino(key)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                  style={{
                    color:           camino === key ? meta.color : undefined,
                    borderColor:     camino === key ? `${meta.color}40` : undefined,
                    backgroundColor: camino === key ? `${meta.color}15` : undefined,
                    opacity:         camino !== key && camino !== 'todos' ? 0.45 : 1,
                  }}
                >
                  {meta.emoji} {meta.label}
                </button>
              ))}
            </div>

            {/* Cap diario progress */}
            {xpHoy > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">XP manual hoy</span>
                  <span className="text-[11px] tabular-nums font-bold text-xp-400">
                    {xpHoy}<span className="text-slate-600 font-normal"> / {capDiario}</span>
                  </span>
                </div>
                <div className="h-1.5 bg-night-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-xp-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (xpHoy / capDiario) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Disponibles */}
            {disponibles.length > 0 && (
              <div className="space-y-3">
                {disponibles.map(m => (
                  <MisionManualCard key={m.id} mision={m} onCompletada={handleCompletada} />
                ))}
              </div>
            )}

            {/* Bloqueadas */}
            {bloqueadas.length > 0 && (
              <div>
                {disponibles.length > 0 && (
                  <div className="flex items-center gap-2 my-4">
                    <div className="h-px flex-1 bg-night-border/40" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      En cooldown · {bloqueadas.length}
                    </span>
                    <div className="h-px flex-1 bg-night-border/40" />
                  </div>
                )}
                <div className="space-y-3">
                  {bloqueadas.map(m => (
                    <MisionManualCard key={m.id} mision={m} onCompletada={handleCompletada} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ── Tabs automáticas ── */
        loadingM ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-night-3/40 animate-pulse" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-sm font-medium text-slate-400">Sin misiones en esta categoría</p>
            <p className="text-xs text-slate-600 mt-1">Vuelve más tarde para nuevos desafíos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendientes.length > 0 && (
              <div className="space-y-3">
                {pendientes.map(m => (
                  <MisionCard key={m.mision_id} mision={m} onCompletada={handleCompletada} />
                ))}
              </div>
            )}
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
        )
      )}
    </div>
  )
}
