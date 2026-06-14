import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/app.types'

export async function updatePerfil(
  userId: string,
  data: Partial<Pick<Profile, 'nombre' | 'fecha_sueldo' | 'moneda' | 'tema' | 'avatar_url'>>
): Promise<Profile> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return updated as Profile
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  // upsert: reemplaza si ya existe
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Agrega timestamp para evitar cache del navegador
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function deleteAvatar(userId: string): Promise<void> {
  // Intentar eliminar las variantes comunes de extensión
  const paths = ['jpg', 'jpeg', 'png', 'webp'].map(ext => `${userId}/avatar.${ext}`)
  await supabase.storage.from('avatars').remove(paths)
  // No lanzar error si no existe — simplemente no hay nada que borrar
}
