import { supabase } from '@/lib/supabase'
import type { Categoria, Subcategoria, CategoriaFormData } from '@/types/app.types'

// ─── Deduplicación ───────────────────────────────────────────
// La query devuelve categorías del usuario + defaults; si existe
// una categoría con el mismo nombre y tipo, se prefiere la del usuario.

function deduplicar(cats: Categoria[]): Categoria[] {
  const visto = new Map<string, Categoria>()
  for (const c of cats) {
    const key  = `${c.tipo}|${c.nombre.toLowerCase().trim()}`
    const prev = visto.get(key)
    if (!prev || prev.es_default) visto.set(key, c)
  }
  return [...visto.values()].sort((a, b) => a.orden - b.orden)
}

// ─── Lectura ─────────────────────────────────────────────────

export async function getCategorias(userId: string): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*, subcategorias(*)')
    .or(`usuario_id.eq.${userId},es_default.eq.true`)
    .eq('activa', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return deduplicar(data as Categoria[])
}

export async function getCategoriasByTipo(userId: string, tipo: string): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*, subcategorias(*)')
    .or(`usuario_id.eq.${userId},es_default.eq.true`)
    .eq('tipo', tipo)
    .eq('activa', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return deduplicar(data as Categoria[])
}

export async function getSubcategorias(categoriaId: string): Promise<Subcategoria[]> {
  const { data, error } = await supabase
    .from('subcategorias')
    .select('*')
    .eq('categoria_id', categoriaId)
    .eq('activa', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return data as Subcategoria[]
}

// ─── CRUD categorías ─────────────────────────────────────────

export async function createCategoria(
  userId: string,
  form: CategoriaFormData
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert({
      usuario_id: userId,
      nombre:     form.nombre,
      tipo:       form.tipo,
      emoji:      form.emoji || null,
      color:      form.color || '#6B7280',
      activa:     true,
      es_default: false,
      orden:      999
    })
    .select('*, subcategorias(*)')
    .single()

  if (error) throw error
  return data as Categoria
}

export async function updateCategoria(
  id: string,
  form: Partial<CategoriaFormData>
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .update({
      nombre: form.nombre,
      emoji:  form.emoji || null,
      color:  form.color || null
    })
    .eq('id', id)
    .select('*, subcategorias(*)')
    .single()

  if (error) throw error
  return data as Categoria
}

export async function deleteCategoria(id: string): Promise<void> {
  // Soft delete: marcar como inactiva para no romper histórico de movimientos
  const { error } = await supabase
    .from('categorias')
    .update({ activa: false })
    .eq('id', id)

  if (error) throw error
}

// ─── CRUD subcategorías ──────────────────────────────────────

export async function createSubcategoria(
  categoriaId: string,
  nombre: string,
  userId: string
): Promise<Subcategoria> {
  const { data, error } = await supabase
    .from('subcategorias')
    .insert({
      categoria_id: categoriaId,
      usuario_id:   userId,    // requerido por RLS para subcategorías de usuario
      nombre,
      activa:     true,
      es_default: false,
      orden:      999
    })
    .select()
    .single()

  if (error) throw error
  return data as Subcategoria
}

export async function deleteSubcategoria(id: string): Promise<void> {
  const { error } = await supabase
    .from('subcategorias')
    .update({ activa: false })
    .eq('id', id)

  if (error) throw error
}
