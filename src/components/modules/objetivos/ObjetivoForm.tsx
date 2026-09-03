import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCreateObjetivo, useUpdateObjetivo } from '@/hooks/useObjetivos'
import { useCuentas } from '@/hooks/useCuentas'
import type { ObjetivoAhorro } from '@/types/app.types'

const schema = z.object({
  nombre:               z.string().min(1, 'Requerido').max(60),
  emoji:                z.string().optional(),
  color:                z.string(),
  monto_objetivo:       z.coerce.number().positive('Debe ser mayor a 0'),
  fecha_objetivo:       z.string().optional(),
  descripcion:          z.string().optional(),
  cuenta_vinculada_id:  z.string().optional(),
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
  const { data: cuentas } = useCuentas()

  const inversionCuentas = (cuentas ?? []).filter(c => c.activa && c.tipo === 'inversion')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#2563EB' }
  })

  const color             = watch('color')
  const cuentaVinculadaId = watch('cuenta_vinculada_id') ?? ''

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        reset({
          nombre:              editing.nombre,
          emoji:               editing.emoji ?? '',
          color:               editing.color,
          monto_objetivo:      editing.monto_objetivo,
          fecha_objetivo:      editing.fecha_objetivo ?? '',
          descripcion:         editing.descripcion ?? '',
          cuenta_vinculada_id: editing.cuenta_vinculada_id ?? '',
        })
      } else {
        reset({ color: '#2563EB', nombre: '', emoji: '', monto_objetivo: 0, cuenta_vinculada_id: '' })
      }
    }
  }, [isOpen, editing])  // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormValues) {
    try {
      const form = {
        nombre:              data.nombre,
        emoji:               data.emoji,
        color:               data.color,
        monto_objetivo:      data.monto_objetivo,
        fecha_objetivo:      data.fecha_objetivo || undefined,
        descripcion:         data.descripcion,
        cuenta_vinculada_id: data.cuenta_vinculada_id || null,
      }

      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar objetivo' : 'Nuevo objetivo'} theme="dark" accent="#9B5DE5">
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
                'w-full h-14 pl-8 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border bg-night-3 text-white',
                'outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 placeholder:text-slate-500',
                errors.monto_objetivo ? 'border-gasto-500' : 'border-night-border hover:border-brand-500/40'
              ].join(' ')}
            />
          </div>
          {errors.monto_objetivo && (
            <p className="text-xs text-gasto-400 mt-1">{errors.monto_objetivo.message}</p>
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

        {/* Vinculación a cuenta de inversión */}
        {inversionCuentas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Vincular a inversión
              </p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-ahorro-500/15 text-ahorro-400">
                Opcional
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
              El progreso del objetivo se calculará desde el saldo del fondo vinculado.
            </p>
            <AccountPicker
              cuentas={inversionCuentas}
              selectedId={cuentaVinculadaId}
              onChange={id => setValue('cuenta_vinculada_id', id)}
              allowNull
              nullLabel="Sin vincular"
              only={['inversion']}
            />
          </div>
        )}

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
