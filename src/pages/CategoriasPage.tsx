import { useState } from 'react'
import { Plus, Pencil, Trash2, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { CategoriaForm } from '@/components/modules/categorias/CategoriaForm'
import {
  useCategorias,
  useDeleteCategoria,
  useCreateSubcategoria,
  useDeleteSubcategoria
} from '@/hooks/useCategorias'
import type { Categoria } from '@/types/app.types'

const tipoLabel: Record<string, string> = {
  gasto:     'Gastos',
  ingreso:   'Ingresos',
  ahorro:    'Ahorros',
  inversion: 'Inversiones'
}

const tipoColor: Record<string, string> = {
  gasto:     'bg-gasto-500/15 text-gasto-400',
  ingreso:   'bg-ingreso-500/15 text-ingreso-400',
  ahorro:    'bg-ahorro-500/15 text-ahorro-400',
  inversion: 'bg-xp-500/15 text-xp-400'
}

function CategoriaItem({ categoria }: { categoria: Categoria }) {
  const [expanded,     setExpanded]     = useState(false)
  const [addSubOpen,   setAddSubOpen]   = useState(false)
  const [editOpen,     setEditOpen]     = useState(false)
  const [newSubNombre, setNewSubNombre] = useState('')

  const deleteMutation    = useDeleteCategoria()
  const createSubMutation = useCreateSubcategoria()
  const deleteSubMutation = useDeleteSubcategoria()

  const isDefault = categoria.es_default
  const subcats   = categoria.subcategorias?.filter(s => s.activa) ?? []
  const canExpand = subcats.length > 0 || !isDefault   // siempre expandible para agregar subs

  async function handleAddSub() {
    if (!newSubNombre.trim()) return
    try {
      await createSubMutation.mutateAsync({
        categoriaId: categoria.id,
        nombre:      newSubNombre.trim()
      })
      setNewSubNombre('')
      setAddSubOpen(false)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al crear subcategoría')
    }
  }

  function handleDeleteCat() {
    if (!confirm(`¿Eliminar categoría "${categoria.nombre}"?\nLos movimientos existentes conservarán la referencia.`)) return
    deleteMutation.mutate(categoria.id)
  }

  return (
    <>
      <Card padding="sm">
        {/* Cabecera de la categoría */}
        <button
          className="w-full flex items-center gap-3"
          onClick={() => canExpand && setExpanded(e => !e)}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${categoria.color ?? '#6B7280'}20` }}
          >
            {categoria.emoji ?? '📁'}
          </div>

          <div className="flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-200">{categoria.nombre}</p>
              {isDefault && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-night-3 text-slate-500">
                  Sistema
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{subcats.length} subcategoría{subcats.length !== 1 ? 's' : ''}</p>
          </div>

          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${tipoColor[categoria.tipo] ?? 'bg-slate-100 text-slate-500'}`}>
            {tipoLabel[categoria.tipo] ?? categoria.tipo}
          </span>

          {/* Editar/eliminar solo para categorías propias */}
          {!isDefault && (
            <div className="flex items-center gap-0.5 ml-0.5" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setEditOpen(true)}
                className="size-7 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button
                onClick={handleDeleteCat}
                className="size-7 flex items-center justify-center rounded-full hover:bg-gasto-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-danger-400" />
              </button>
            </div>
          )}

          {canExpand && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0 ml-0.5" />
              : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 ml-0.5" />
          )}
        </button>

        {/* Subcategorías expandidas */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-night-border/40">
            {/* Lista de subcategorías */}
            {subcats.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {subcats.map(sub => {
                  const esSistema = sub.es_default || sub.usuario_id === null
                  return (
                    <div
                      key={sub.id}
                      className={[
                        'flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 gap-1',
                        esSistema
                          ? 'bg-night-3/60 text-slate-500'
                          : 'bg-brand-500/10 text-brand-300 border border-dashed border-brand-500/25'
                      ].join(' ')}
                    >
                      <span className="truncate">{sub.nombre}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!esSistema && (
                          <span className="text-[8px] font-semibold text-brand-400 uppercase">mía</span>
                        )}
                        {!esSistema && (
                          <button
                            onClick={() => deleteSubMutation.mutate(sub.id)}
                            className="hover:text-danger-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Agregar subcategoría — disponible para TODAS las categorías */}
            {addSubOpen ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubNombre}
                  onChange={e => setNewSubNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSub()}
                  placeholder="Nombre de la subcategoría"
                  className="flex-1 text-xs px-3 py-2 bg-night-3 text-white border border-night-border rounded-xl outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 placeholder:text-slate-500"
                  autoFocus
                />
                <button
                  onClick={handleAddSub}
                  disabled={createSubMutation.isPending || !newSubNombre.trim()}
                  className="px-3 py-2 bg-brand-500 text-white text-xs rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  Agregar
                </button>
                <button
                  onClick={() => { setAddSubOpen(false); setNewSubNombre('') }}
                  className="px-3 py-2 bg-night-3 text-slate-300 text-xs rounded-xl hover:bg-night-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddSubOpen(true)}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Agregar subcategoría personalizada
              </button>
            )}
          </div>
        )}
      </Card>

      <CategoriaForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editing={categoria}
      />
    </>
  )
}

export function CategoriasPage() {
  const { data: categorias, isLoading } = useCategorias()
  const [filtro,   setFiltro]   = useState<string>('todos')
  const [formOpen, setFormOpen] = useState(false)

  const tiposDisponibles = ['todos', 'gasto', 'ingreso', 'ahorro']

  const categoriasFiltradas = (categorias ?? []).filter(
    c => filtro === 'todos' || c.tipo === filtro
  )

  return (
    <AppLayout>
      <Header title="Categorías" />

      <div className="space-y-4 pt-4">
        {/* Leyenda */}
        <div className="flex items-center gap-3 px-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-night-3 border border-night-border/60" />
            Sistema
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-brand-500/10 border border-dashed border-brand-500/25" />
            Personalizadas (tuyas)
          </span>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-4">
          {tiposDisponibles.map(t => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={[
                'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors capitalize',
                filtro === t
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                  : 'bg-night-2 text-slate-400 border border-night-border hover:border-brand-500/30'
              ].join(' ')}
            >
              {t === 'todos' ? 'Todas' : tipoLabel[t] ?? t}
            </button>
          ))}
        </div>

        <div className="px-4">
          {isLoading ? (
            <SkeletonList count={5} />
          ) : (
            <div className="space-y-2">
              {categoriasFiltradas.map(cat => (
                <CategoriaItem key={cat.id} categoria={cat} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB para nueva categoría propia */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-5 size-14 bg-brand-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-600 active:scale-95 transition-all z-30"
        aria-label="Nueva categoría"
      >
        <Plus className="h-7 w-7" />
      </button>

      <CategoriaForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />

      <div className="h-4" />
    </AppLayout>
  )
}
