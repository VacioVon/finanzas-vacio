import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { useMisiones } from '@/hooks/rpg/useMisiones'
import { MisionesPanel } from './MisionesPanel'
import { Card } from '@/components/ui/Card'

export function MisionesSummary() {
  const { data: misiones = [], isLoading } = useMisiones()
  const [expandido, setExpandido] = useState(false)

  const pendientes = misiones.filter(m => m.estado !== 'completada')
  const top3 = [...pendientes]
    .sort((a, b) => b.xp_recompensa - a.xp_recompensa)
    .slice(0, 3)

  const tipoColor: Record<string, string> = {
    diaria:  'text-ingreso-400 bg-ingreso-500/10',
    semanal: 'text-brand-400 bg-brand-500/10',
    especial:'text-gasto-400 bg-gasto-500/10',
  }

  return (
    <div>
      {/* Header — toggle */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between mb-2 px-1 group"
      >
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[.22em] text-slate-500 group-hover:text-slate-400 transition-colors">
            Misiones del cultivador
          </p>
          {pendientes.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-xp-500/15 text-xp-400 tabular-nums">
              {pendientes.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-600 transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {expandido ? (
        <Card>
          <MisionesPanel />
        </Card>
      ) : (
        <Card padding="none">
          {isLoading ? (
            <div className="px-4 py-3 text-xs text-slate-500">Cargando misiones…</div>
          ) : top3.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500">Sin misiones pendientes ✨</div>
          ) : (
            top3.map((m, i) => (
              <div
                key={m.mision_id}
                className={[
                  'flex items-center gap-3 px-4 py-2.5',
                  i < top3.length - 1 ? 'border-b border-night-border/30' : ''
                ].join(' ')}
              >
                <span className="text-base leading-none flex-shrink-0">⚔️</span>
                <p className="flex-1 text-xs font-medium text-slate-300 truncate">{m.nombre}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tipoColor[m.tipo] ?? 'text-slate-500 bg-night-3'}`}>
                    {m.tipo}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-xp-400">
                    <Zap className="h-2.5 w-2.5" />
                    {m.xp_recompensa}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Ver todas */}
          <button
            onClick={() => setExpandido(true)}
            className="w-full py-2 text-[11px] font-medium text-xp-400 hover:text-xp-300 transition-colors border-t border-night-border/30 rounded-b-2xl hover:bg-xp-500/5"
          >
            Ver todas las misiones ↓
          </button>
        </Card>
      )}
    </div>
  )
}
