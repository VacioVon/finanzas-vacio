import { useState, useMemo } from 'react'
import { Search, Plus, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { MovimientoCard } from '@/components/modules/movimientos/MovimientoCard'
import { MovimientoFilters } from '@/components/modules/movimientos/MovimientoFilters'
import { MovimientoForm } from '@/components/modules/movimientos/MovimientoForm'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { useMovimientos, useMovimientosDelMes } from '@/hooks/useMovimientos'
import { useCuentas } from '@/hooks/useCuentas'
import { formatCLP } from '@/utils/currency'

type Filtro = 'todos' | 'ingreso' | 'gasto' | 'ahorro' | 'pago_deuda'

const TIPO_CONFIG: Record<string, { icon: string; color: string }> = {
  bancaria:  { icon: '🏦', color: '#2979FF' },
  digital:   { icon: '📱', color: '#00C2CB' },
  debito:    { icon: '🏧', color: '#10D97F' },
  credito:   { icon: '💳', color: '#F4645F' },
  efectivo:  { icon: '💵', color: '#FFB703' },
  inversion: { icon: '📈', color: '#9B5DE5' },
}

export function MovimientosPage() {
  const [filtroTipo, setFiltroTipo]           = useState<Filtro>('todos')
  const [search, setSearch]                   = useState('')
  const [cuentasFiltro, setCuentasFiltro]     = useState<string[]>([])
  const [categoriasFiltro, setCategorias]     = useState<string[]>([])
  const [panelAbierto, setPanelAbierto]       = useState(false)
  const [showForm, setShowForm]               = useState(false)

  // Datos — movimientos SIN filtro server-side (filtramos client-side)
  const { data: todosMovimientos, isLoading } = useMovimientos()
  const { data: movimientosMes }              = useMovimientosDelMes()
  const { data: cuentas }                     = useCuentas()

  // Resumen del mes
  const ingresos  = (movimientosMes ?? []).filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const gastos    = (movimientosMes ?? []).filter(m => m.tipo === 'gasto' && !m.para_tercero).reduce((s, m) => s + m.monto, 0)
  const flujoNeto = ingresos - gastos

  // Categorías únicas del historial (para el panel de filtros)
  const categoriasDisponibles = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string; emoji: string | null; color: string | null }>()
    for (const m of todosMovimientos ?? []) {
      if (m.categoria && m.categoria_id && !mapa.has(m.categoria_id)) {
        mapa.set(m.categoria_id, {
          id:     m.categoria_id,
          nombre: m.categoria.nombre,
          emoji:  m.categoria.emoji ?? null,
          color:  m.categoria.color ?? null,
        })
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [todosMovimientos])

  // Cuentas con movimientos
  const cuentasConMovimientos = useMemo(() => {
    const ids = new Set((todosMovimientos ?? []).map(m => m.cuenta_id).filter(Boolean))
    return (cuentas ?? []).filter(c => ids.has(c.id))
  }, [cuentas, todosMovimientos])

  // Filtrado client-side
  const movimientos = useMemo(() => {
    let list = todosMovimientos ?? []

    if (filtroTipo !== 'todos')
      list = list.filter(m => m.tipo === filtroTipo)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.nota?.toLowerCase().includes(q) ||
        m.comercio?.toLowerCase().includes(q) ||
        m.categoria?.nombre?.toLowerCase().includes(q)
      )
    }

    if (cuentasFiltro.length > 0)
      list = list.filter(m => m.cuenta_id && cuentasFiltro.includes(m.cuenta_id))

    if (categoriasFiltro.length > 0)
      list = list.filter(m => m.categoria_id && categoriasFiltro.includes(m.categoria_id))

    return list
  }, [todosMovimientos, filtroTipo, search, cuentasFiltro, categoriasFiltro])

  // Helpers de filtros activos
  const filtrosActivos = cuentasFiltro.length + categoriasFiltro.length
  function limpiarFiltros() { setCuentasFiltro([]); setCategorias([]) }

  function toggleCuenta(id: string) {
    setCuentasFiltro(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleCategoria(id: string) {
    setCategorias(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <AppLayout nebula="#2979FF">
      <Header
        title="Movimientos"
        action={
          <Button size="sm" variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        }
      />

      <div className="space-y-3 pt-4">

        {/* Resumen del mes */}
        {(ingresos > 0 || gastos > 0) && (
          <div className="px-4 lg:px-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-ingreso-500/10 border border-ingreso-500/20 rounded-2xl p-3">
                <p className="text-[10px] text-ingreso-400 font-semibold uppercase tracking-wide">Ingresos</p>
                <p className="text-sm font-bold text-ingreso-300 mt-0.5 tabular-nums">{formatCLP(ingresos)}</p>
              </div>
              <div className="bg-gasto-500/10 border border-gasto-500/20 rounded-2xl p-3">
                <p className="text-[10px] text-gasto-400 font-semibold uppercase tracking-wide">Gastos</p>
                <p className="text-sm font-bold text-gasto-300 mt-0.5 tabular-nums">{formatCLP(gastos)}</p>
              </div>
            </div>
            {ingresos > 0 && (
              <div className="rounded-2xl border border-night-border bg-night-2 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                    {flujoNeto >= 0 ? 'Disponible del período' : 'Déficit del período'}
                  </p>
                  <p className={`text-sm font-bold tabular-nums ${flujoNeto >= 0 ? 'text-ingreso-400' : 'text-gasto-400'}`}>
                    {flujoNeto >= 0 ? '' : '-'}{formatCLP(Math.abs(flujoNeto))}
                  </p>
                </div>
                <div className="h-1.5 bg-night-0 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ingresos > 0 ? (gastos / ingresos) * 100 : 0)}%`,
                      backgroundColor: gastos / ingresos > 0.9 ? '#F4645F' : gastos / ingresos > 0.7 ? '#FFB703' : '#10D97F',
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-600 mt-1 tabular-nums">
                  {ingresos > 0 ? Math.round((gastos / ingresos) * 100) : 0}% del ingreso utilizado
                </p>
              </div>
            )}
          </div>
        )}

        {/* Barra de búsqueda + botón filtros */}
        <div className="px-4 lg:px-0 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nota, comercio, categoría…"
              className="w-full h-11 pl-9 pr-9 rounded-xl border border-night-border bg-night-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Botón filtros */}
          <button
            onClick={() => setPanelAbierto(v => !v)}
            className={[
              'relative flex items-center gap-1.5 px-3 h-11 rounded-xl border text-sm font-medium transition-all flex-shrink-0',
              panelAbierto || filtrosActivos > 0
                ? 'bg-brand-500/15 border-brand-500/50 text-brand-300'
                : 'bg-night-2 border-night-border text-slate-400 hover:border-brand-500/30 hover:text-slate-300',
            ].join(' ')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${panelAbierto ? 'rotate-180' : ''}`}
            />
            {filtrosActivos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                {filtrosActivos}
              </span>
            )}
          </button>
        </div>

        {/* Panel de filtros — colapsable */}
        {panelAbierto && (
          <div className="px-4 lg:px-0">
            <div className="rounded-2xl border border-night-border/60 bg-night-1 overflow-hidden">

              {/* Encabezado panel */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-night-border/40">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtrar por</p>
                {filtrosActivos > 0 && (
                  <button
                    onClick={limpiarFiltros}
                    className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors font-medium"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              {/* Sección: Cuentas */}
              {cuentasConMovimientos.length > 0 && (
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Cuenta</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {cuentasConMovimientos.map(cuenta => {
                      const cfg      = TIPO_CONFIG[cuenta.tipo] ?? { icon: '💰', color: '#64748B' }
                      const color    = cuenta.color || cfg.color
                      const selected = cuentasFiltro.includes(cuenta.id)
                      return (
                        <button
                          key={cuenta.id}
                          onClick={() => toggleCuenta(cuenta.id)}
                          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all"
                          style={{
                            backgroundColor: selected ? `${color}18` : 'rgba(44,42,56,0.6)',
                            borderColor:     selected ? `${color}60` : '#3D3B50',
                            boxShadow:       selected ? `0 0 10px ${color}20` : 'none',
                          }}
                        >
                          <span className="text-base leading-none">{cfg.icon}</span>
                          <div>
                            <p className="text-xs font-semibold leading-tight" style={{ color: selected ? color : '#CBD5E1' }}>
                              {cuenta.nombre.trim()}
                            </p>
                            <p className="text-[10px] tabular-nums" style={{ color: selected ? `${color}99` : '#64748B' }}>
                              {formatCLP(cuenta.saldo_actual)}
                            </p>
                          </div>
                          {selected && (
                            <X className="h-3 w-3 ml-1 flex-shrink-0" style={{ color }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Separador */}
              {cuentasConMovimientos.length > 0 && categoriasDisponibles.length > 0 && (
                <div className="mx-4 border-t border-night-border/30" />
              )}

              {/* Sección: Categorías */}
              {categoriasDisponibles.length > 0 && (
                <div className="px-4 pt-3 pb-4">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Categoría</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categoriasDisponibles.map(cat => {
                      const color    = cat.color ?? '#64748B'
                      const selected = categoriasFiltro.includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategoria(cat.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all"
                          style={{
                            backgroundColor: selected ? `${color}20` : 'rgba(53,51,68,0.6)',
                            borderColor:     selected ? `${color}60` : '#3D3B50',
                            color:           selected ? color         : '#94A3B8',
                            boxShadow:       selected ? `0 0 8px ${color}25` : 'none',
                          }}
                        >
                          {cat.emoji && <span className="text-sm leading-none">{cat.emoji}</span>}
                          {cat.nombre}
                          {selected && <X className="h-2.5 w-2.5 ml-0.5" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chips de filtros activos — siempre visibles si hay alguno */}
        {(cuentasFiltro.length > 0 || categoriasFiltro.length > 0) && (
          <div className="px-4 lg:px-0 flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {cuentasFiltro.map(id => {
              const c     = (cuentas ?? []).find(x => x.id === id)
              const color = c ? (c.color || TIPO_CONFIG[c.tipo]?.color || '#64748B') : '#64748B'
              return (
                <button
                  key={id}
                  onClick={() => toggleCuenta(id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{ backgroundColor: `${color}18`, borderColor: `${color}50`, color }}
                >
                  {c?.nombre.trim()}
                  <X className="h-3 w-3" />
                </button>
              )
            })}
            {categoriasFiltro.map(id => {
              const cat   = categoriasDisponibles.find(x => x.id === id)
              const color = cat?.color ?? '#64748B'
              return (
                <button
                  key={id}
                  onClick={() => toggleCategoria(id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{ backgroundColor: `${color}18`, borderColor: `${color}50`, color }}
                >
                  {cat?.emoji && <span>{cat.emoji}</span>}
                  {cat?.nombre}
                  <X className="h-3 w-3" />
                </button>
              )
            })}
          </div>
        )}

        {/* Pills de tipo */}
        <MovimientoFilters active={filtroTipo} onChange={setFiltroTipo} />

        {/* Contador de resultados */}
        {(filtrosActivos > 0 || search || filtroTipo !== 'todos') && !isLoading && (
          <p className="px-4 lg:px-0 text-[11px] text-slate-500">
            {movimientos.length} resultado{movimientos.length !== 1 ? 's' : ''}
            {filtrosActivos > 0 || search
              ? <button onClick={() => { limpiarFiltros(); setSearch(''); setFiltroTipo('todos') }}
                  className="ml-2 text-brand-400 hover:text-brand-300">
                  · Ver todos
                </button>
              : null
            }
          </p>
        )}

        {/* Lista */}
        <div className="px-4 lg:px-0 pb-8">
          {isLoading ? (
            <SkeletonList count={5} />
          ) : !movimientos.length ? (
            <EmptyState
              icon="🔍"
              title="Sin resultados"
              description={
                filtrosActivos > 0 || search || filtroTipo !== 'todos'
                  ? 'No hay movimientos con estos filtros'
                  : 'Registra tu primer movimiento'
              }
              action={
                filtrosActivos > 0 || search
                  ? { label: 'Limpiar filtros', onClick: () => { limpiarFiltros(); setSearch(''); setFiltroTipo('todos') } }
                  : { label: 'Agregar movimiento', onClick: () => setShowForm(true) }
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {movimientos.map(mov => (
                <MovimientoCard key={mov.id} movimiento={mov} />
              ))}
            </div>
          )}
        </div>
      </div>

      <MovimientoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
      />
    </AppLayout>
  )
}
