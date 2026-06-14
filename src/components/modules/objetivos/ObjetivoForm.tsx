import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { useCreateObjetivo, useUpdateObjetivo } from '@/hooks/useObjetivos'
import type { ObjetivoAhorro } from '@/types/app.types'

const schema = z.object({
  nombre:          z.string().min(1, 'Requerido').max(60),
  emoji:           z.string().optional(),
  color:           z.string(),
  monto_objetivo:  z.coerce.number().positive('Debe ser mayor a 0'),
  fecha_objetivo:  z.string().optional(),
  descripcion:     z.string().optional()
})
type FormValues = z.infer<typeof schema>

interface ObjetivoFormProps {
  isOpen:    boolean
  onClose:   () => void
  editing?:  ObjetivoAhorro | null
}

export function ObjetivoForm({ isOpen, onClose, editing }: ObjetivoFormProps) {
  const createMutation = useCreateObjetivo()
  const updateMutation = useUpdateObjetivo()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#2563EB' }
  })

  const color = watch('color')
  const emoji = watch('emoji')

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        reset({
          nombre:         editing.nombre,
          emoji:          editing.emoji ?? '',
          color:          editing.color,
          monto_objetivo: editing.monto_objetivo,
          fecha_objetivo: editing.fecha_objetivo ?? '',
          descripcion:    editing.descripcion ?? ''
        })
      } else {
        reset({ color: '#2563EB', nombre: '', emoji: '', monto_objetivo: 0 })
      }
    }
  }, [isOpen, editing])  // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id:   editing.id,
          form: {
            nombre:         data.nombre,
            emoji:          data.emoji,
            color:          data.color,
            monto_objetivo: data.monto_objetivo,
            fecha_objetivo: data.fecha_objetivo || undefined,
            descripcion:    data.descripcion
          }
        })
      } else {
        await createMutation.mutateAsync({
          nombre:         data.nombre,
          emoji:          data.emoji,
          color:          data.color,
          monto_objetivo: data.monto_objetivo,
          fecha_objetivo: data.fecha_objetivo || undefined,
          descripcion:    data.descripcion
        })
      }
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <EmojiPicker
          label="Ícono"
          value={watch('emoji')}
          onChange={e => setValue('emoji', e)}
        />

        <Input
          label="Nombre"
          placeholder="Ej: Viaje a Europa"
          {...register('nombre')}
          error={errors.nombre?.message}
        />

        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Meta</label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
            <input
              {...register('monto_objetivo')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[
                'w-full h-14 pl-8 pr-4 text-center text-2xl font-bold rounded-2xl border bg-white',
                'outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.monto_objetivo ? 'border-danger-400' : 'border-slate-200'
              ].join(' ')}
            />
          </div>
          {errors.monto_objetivo && (
            <p className="text-xs text-danger-600 mt-1">{errors.monto_objetivo.message}</p>
          )}
        </div>

        <ColorPicker
          value={color}
          onChange={c => setValue('color', c)}
        />

        <Input
          label="Fecha objetivo (opcional)"
          type="date"
          {...register('fecha_objetivo')}
        />

        <Input
          label="Descripción (opcional)"
          placeholder="Ej: Ahorro para las vacaciones de verano"
          {...register('descripcion')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editing ? 'Guardar' : 'Crear objetivo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
