import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuthStore } from '@/store/authStore'
import { useUpdatePerfil, useUploadAvatar, useDeleteAvatar } from '@/hooks/usePerfil'

const schema = z.object({
  nombre:       z.string().min(1, 'Requerido').max(60),
  moneda:       z.enum(['CLP', 'USD', 'EUR']),
  fecha_sueldo: z.coerce.number().int().min(1).max(31).optional()
})
type FormValues = z.infer<typeof schema>

const MONEDAS = [
  { value: 'CLP', label: '🇨🇱 CLP — Peso Chileno' },
  { value: 'USD', label: '🇺🇸 USD — Dólar' },
  { value: 'EUR', label: '🇪🇺 EUR — Euro' }
]

const DIAS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `Día ${i + 1}`
}))

interface PerfilFormProps {
  isOpen:  boolean
  onClose: () => void
}

export function PerfilForm({ isOpen, onClose }: PerfilFormProps) {
  const { profile } = useAuthStore()
  const updateMutation = useUpdatePerfil()
  const uploadMutation = useUploadAvatar()
  const deleteMutation = useDeleteAvatar()
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  })

  useEffect(() => {
    if (isOpen && profile) {
      reset({
        nombre:       profile.nombre,
        moneda:       (profile.moneda as 'CLP' | 'USD' | 'EUR') ?? 'CLP',
        fecha_sueldo: profile.fecha_sueldo ?? undefined
      })
      setAvatarPreview(null)
    }
  }, [isOpen, profile])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2 MB')
      return
    }
    // Preview local inmediata
    setAvatarPreview(URL.createObjectURL(file))
    // Upload
    await uploadMutation.mutateAsync(file)
  }

  async function handleDeleteAvatar() {
    if (!confirm('¿Eliminar foto de perfil?')) return
    setAvatarPreview(null)
    await deleteMutation.mutateAsync()
  }

  async function onSubmit(data: FormValues) {
    try {
      await updateMutation.mutateAsync({
        nombre:       data.nombre,
        moneda:       data.moneda,
        fecha_sueldo: data.fecha_sueldo ?? null
      })
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  // Avatar a mostrar: preview local > url guardada > inicial del nombre
  const avatarUrl     = avatarPreview ?? profile?.avatar_url
  const inicialNombre = profile?.nombre?.[0]?.toUpperCase() ?? 'U'
  const avatarIsLoading = uploadMutation.isPending || deleteMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar perfil" theme="dark" accent="#2979FF">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-card"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center text-3xl font-bold text-brand-300 border-2 border-night-border shadow-card">
                {inicialNombre}
              </div>
            )}

            {/* Overlay de carga */}
            {avatarIsLoading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}

            {/* Botón cámara */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarIsLoading}
              className="absolute -bottom-1 -right-1 size-7 bg-brand-500 text-white rounded-full flex items-center justify-center shadow hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Acciones de avatar */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarIsLoading}
              className="text-brand-400 hover:text-brand-300 font-medium disabled:opacity-50"
            >
              {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {avatarUrl && !avatarPreview && (
              <>
                <span className="text-slate-200">|</span>
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={avatarIsLoading}
                  className="text-gasto-400 hover:text-gasto-300 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">JPG, PNG o WebP · máx. 2 MB</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {/* Campos de texto */}
        <Input
          label="Nombre"
          placeholder="Tu nombre"
          {...register('nombre')}
          error={errors.nombre?.message}
        />

        <Select
          label="Moneda"
          options={MONEDAS}
          {...register('moneda')}
          error={errors.moneda?.message}
        />

        <div>
          <Select
            label="Día de cobro del sueldo (opcional)"
            options={DIAS}
            placeholder="Sin configurar"
            {...register('fecha_sueldo')}
          />
          <p className="text-xs text-slate-400 mt-1">
            Define el inicio de tu mes presupuestario. Ej: si cobras el 28, tu "julio" va del 28-jun al 27-jul.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={updateMutation.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
