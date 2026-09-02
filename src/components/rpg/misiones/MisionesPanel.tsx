import { useEffect, useState } from 'react'
import { useMisiones, useVerificarTodasMisiones } from '@/hooks/rpg/useMisiones'
import { MisionCard } from './MisionCard'
import type { TipoMision } from '@/types/rpg.types'

const TABS: { tipo: TipoMision | 'todas'; label: string }[] = [
  { tipo: 'todas',   label: 'Todas'    },
  { tipo: 'diaria',  label: 'Diarias'  },
  { tipo: 'semanal', label: 'Semanales'},
  { tipo: 'especial',label: 'Especiales'},
]

interface XPToast {
  id:  number
  xp:  number
}

export function MisionesPanel() {
  const { data: misiones, isLoading } = useMisiones()
  const verificarTodas = useVerificarTodasMisiones()
  const [tab,    setTab]    = useState<TipoMision | 'todas'>('todas')
  const [toasts, setToasts] = useState<XPToast[]>([])

  // Al montar: verificar todas las misiones para actualizar progreso + otorgar recompensas
  useEffect(() => {
    verificarTodas.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCompletada(xp: number) {
    const id = Date.now()
    setToasts(t => [...t, { id, xp }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }

  const filtradas = (misiones ?? []).filter(
    m => tab === 'todas' || m.tipo === tab
  )

  const pendientes  = filtradas.filter(m => m.estado !== 'completada').length
  const completadas = filtradas.filter(m => m.estado === 'completada').length

  return (
    <div className="relative">
      {/* XP toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-xp-500/90 text-night-0 text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg animate-bounce"
          >
            +{t.xp} XP
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Misiones</p>
          <p className="text-[11px] text-slate-500">
            {pendientes} pendientes · {completadas} completadas
          </p>
        </div>
        <button
          onClick={() => verificarTodas.mutate()}
          disabled={verificarTodas.isPending}
          className="text-[11px] text-brand-400 hover:text-brand-300 disabled:opacity-50 transition-colors"
        >
          {verificarTodas.isPending ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-night-3/40 rounded-xl p-1">
        {TABS.map(({ tipo, label }) => (
          <button
            key={tipo}
            onClick={() => setTab(tipo)}
            className={[
              'flex-1 text-[10px] font-semibold uppercase tracking-wide py-1.5 rounded-lg transition-all',
              tab === tipo
                ? 'bg-night-2 text-slate-100 shadow'
                : 'text-slate-500 hover:text-slate-400',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
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
          <p className="text-sm text-slate-500">No hay misiones en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pendientes primero, completadas al final */}
          {[
            ...filtradas.filter(m => m.estado !== 'completada'),
            ...filtradas.filter(m => m.estado === 'completada'),
          ].map(m => (
            <MisionCard
              key={m.mision_id}
              mision={m}
              onCompletada={handleCompletada}
            />
          ))}
        </div>
      )}
    </div>
  )
}
