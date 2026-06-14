import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { useCreateCategoria, useUpdateCategoria } from '@/hooks/useCategorias'
import type { Categoria, TipoCategoria } from '@/types/app.types'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido').max(40, 'Máximo 40 caracteres'),
  tipo:   z.enum(['gasto', 'ingreso', 'ahorro', 'inversion']),
  emoji:  z.string().optional(),
  color:  z.string()
})
type FormValues = z.infer<typeof schema>

const TIPOS = [
  { value: 'gasto',    label: '💸 Gasto' },
  { value: 'ingreso',  label: '💰 Ingreso' },
  { value: 'ahorro',   label: '🏦 Ahorro' },
  { value: 'inversion',label: '📈 Inversión' }
]

interface CategoriaFormProps {
  isOpen:    boolean
  onClose:   () => void
  editing?:  Categoria | null
  onSuccess?: () => void
}

export function CategoriaForm({ isOpen, onClose, editing, onSuccess }: CategoriaFormProps) {
  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'gasto', color: '#2563EB' }
  })

  const color = watch('color')

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        reset({
          nombre: editing.nombre,
          tipo:   editing.tipo as TipoCategoria,
          emoji:  editing.emoji ?? '',
          color:  editing.color ?? '#2563EB'
        })
      } else {
        reset({ tipo: 'gasto', color: '#2563EB', nombre: '', emoji: '' })
      }
    }
  }, [isOpen, editing])  // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id:   editing.id,
          form: { nombre: data.nombre, emoji: data.emoji, color: data.color }
        })
      } else {
        await createMutation.mutateAsync({
          nombre: data.nombre,
          tipo:   data.tipo,
          emoji:  data.emoji,
          color:  data.color
        })
      }
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <EmojiPicker
          label="Ícono"
          value={watch('emoji')}
          onChange={e => setValue('emoji', e)}
        />

        <Input
          label="Nombre"
          placeholder="Ej: Deportes"
          {...register('nombre')}
          error={errors.nombre?.message}
        />

        {!editing && (
          <Select
            label="Tipo"
            options={TIPOS}
            {...register('tipo')}
            error={errors.tipo?.message}
          />
        )}

        <ColorPicker
          value={color}
          onChange={c => setValue('color', c)}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
