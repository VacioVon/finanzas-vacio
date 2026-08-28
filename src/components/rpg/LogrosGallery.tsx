import { useRPGLogros, useRPGLogrosCatalogo } from '@/hooks/rpg/useRPG'
import type { RPGLogroCatalogo } from '@/types/rpg.types'

function LogroChip({
  catalogo,
  obtenido,
  fecha,
}: {
  catalogo: RPGLogroCatalogo
  obtenido: boolean
  fecha?: string
}) {
  return (
    <div
      title={obtenido ? `Obtenido: ${fecha ? new Date(fecha).toLocaleDateString('es-CL') : ''}` : catalogo.descripcion}
      className={[
        'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors',
        obtenido
          ? 'border-[#FFB703]/30 bg-[#FFB703]/8'
          : 'border-night-border/40 bg-night-2/40 opacity-40',
      ].join(' ')}
    >
      <span className="text-2xl leading-none">{catalogo.emoji}</span>
      <p className={`text-[11px] font-medium leading-tight text-balance ${obtenido ? 'text-slate-200' : 'text-slate-500'}`}>
        {catalogo.nombre}
      </p>
      {obtenido && catalogo.xp_bonus > 0 && (
        <span className="text-[9px] font-medium tabular-nums text-[#FFB703]">+{catalogo.xp_bonus} XP</span>
      )}
    </div>
  )
}

export function LogrosGallery() {
  const { data: logros    = [], isLoading: loadingLogros }   = useRPGLogros()
  const { data: catalogo  = [], isLoading: loadingCatalogo } = useRPGLogrosCatalogo()

  const loading = loadingLogros || loadingCatalogo

  const obtenidoMap = new Map(logros.map(l => [l.logro_tipo, l.obtenido_en]))

  // Separar obtenidos y bloqueados (no ocultos)
  const visibles = catalogo.filter(c => !c.oculto || obtenidoMap.has(c.logro_tipo))

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-night-3/60" />
        ))}
      </div>
    )
  }

  if (visibles.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-slate-500">
        Aún no hay logros disponibles
      </p>
    )
  }

  const conseguidos = visibles.filter(c => obtenidoMap.has(c.logro_tipo))
  const bloqueados  = visibles.filter(c => !obtenidoMap.has(c.logro_tipo))

  return (
    <div className="space-y-3">
      {conseguidos.length > 0 && (
        <p className="text-[10px] font-medium uppercase tracking-[.18em] text-[#FFB703]/70">
          Conseguidos · {conseguidos.length}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {conseguidos.map(c => (
          <LogroChip
            key={c.logro_tipo}
            catalogo={c}
            obtenido
            fecha={obtenidoMap.get(c.logro_tipo)}
          />
        ))}
      </div>
      {bloqueados.length > 0 && (
        <>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[.18em] text-slate-600">
            Por obtener · {bloqueados.length}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {bloqueados.map(c => (
              <LogroChip key={c.logro_tipo} catalogo={c} obtenido={false} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
