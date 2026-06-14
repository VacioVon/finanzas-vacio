import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { updatePerfil, uploadAvatar, deleteAvatar } from '@/services/perfil.service'
import type { Profile } from '@/types/app.types'

export function useUpdatePerfil() {
  const { user, setProfile } = useAuthStore()

  return useMutation({
    mutationFn: (data: Partial<Pick<Profile, 'nombre' | 'fecha_sueldo' | 'moneda' | 'tema' | 'avatar_url'>>) =>
      updatePerfil(user!.id, data),
    onSuccess: (updated) => setProfile(updated)
  })
}

export function useUploadAvatar() {
  const { user, setProfile } = useAuthStore()

  return useMutation({
    mutationFn: async (file: File) => {
      const url     = await uploadAvatar(user!.id, file)
      const profile = await updatePerfil(user!.id, { avatar_url: url })
      return profile
    },
    onSuccess: (updated) => setProfile(updated)
  })
}

export function useDeleteAvatar() {
  const { user, setProfile } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      await deleteAvatar(user!.id)
      const profile = await updatePerfil(user!.id, { avatar_url: null })
      return profile
    },
    onSuccess: (updated) => setProfile(updated)
  })
}
