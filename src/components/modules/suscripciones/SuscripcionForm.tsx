import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategoriasByTipo } from '@/hooks/useCategorias'
import { useCreateSuscripcion, useUpdateSuscripcion } from '@/hooks/useSuscripciones'
import { todayISO } from '@/utils/dates'
import type { Suscripcion } from '@/types/app.types'

const schema = z.object({
  nombre:          z.string().min(1, 'Requerido'),
  emoji:           z.string().optional(),
  monto:           z.coerce.number().positive('Debe ser mayor a 0'),
  frecuencia:      z.enum(['semanal', 'mensual', 'anual']),
  dia_cobro:       z.coerce.number().min(1).max(31).optional(),
  cuenta_id:       z.string().optional(),
  categoria_id:    z.string().optional(),
  subcategoria_id: z.string().optional(),
  proxima_fecha:   z.string().optional(),
  nota:            z.string().optional()
})

type FormValues = z.infer<typeof schema>

const FRECUENCIA_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual',   label: 'Anual' },
  { value: 'semanal', label: 'Semanal' }
]

interface Props {
  isOpen:    boolean
  onClose:   () => void
  editing?:  Suscripcion | null
  onSuccess?: () => void
}

export function SuscripcionForm({ isOpen, onClose, editing, onSuccess }: Props) {
  const { data: cuentas }    = useCuentas()
  const { data: categorias } = useCategoriasByTipo('gasto')
  const createMutation       = useCreateSuscripcion()
  const updateMutation       = useUpdateSuscripcion()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver:      zodResolver(schema),
      defaultValues: { frecuencia: 'mensual', proxima_fecha: todayISO() }
    })

  const frecuencia         = watch('frecuencia')
  const emoji              = watch('emoji')
  const selectedCategoriaId = watch('categoria_id')

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      reset({
        nombre:          editing.nombre,
        emoji:           editing.emoji          ?? '',
        monto:           editing.monto,
        frecuencia:      editing.frecuencia,
        dia_cobro:       editing.dia_cobro       ?? undefined,
        cuenta_id:       editing.cuenta_id       ?? '',
        categoria_id:    editing.categoria_id    ?? '',
        subcategoria_id: editing.subcategoria_id ?? '',
        proxima_fecha:   editing.proxima_fecha   ?? todayISO(),
        nota:            editing.nota            ?? ''
      })
    } else {
      reset({ frecuencia: 'mensual', proxima_fecha: todayISO() })
    }
  }, [isOpen, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormValues) {
    try {
      const form = {
        nombre:          data.nombre,
        emoji:           data.emoji           || undefined,
        monto:           data.monto,
        frecuencia:      data.frecuencia,
        dia_cobro:       data.dia_cobro       || undefined,
        cuenta_id:       data.cuenta_id       || undefined,
        categoria_id:    data.categoria_id    || undefined,
        subcategoria_id: data.subcategoria_id || undefined,
        proxima_fecha:   data.proxima_fecha   || undefined,
        nota:            data.nota            || undefined
      }
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const cuentaOptions      = (cuentas    ?? []).map(c => ({ value: c.id, label: c.nombre }))
  const categoriaOptions   = (categorias ?? []).map(c => ({ value: c.id, label: `${c.emoji ?? ''} ${c.nombre}`.trim() }))
  const selectedCategoria  = (categorias ?? []).find(c => c.id === selectedCategoriaId)
  const subcategoriaOptions = (selectedCategoria?.subcategorias ?? [])
    .filter(s => s.activa)
    .map(s => ({ value: s.id, label: s.nombre }))
  const isLoading          = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar suscripción' : 'Nueva suscripción'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Emoji + Nombre */}
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0">
            <EmojiPicker
              value={emoji ?? ''}
              onChange={v => setValue('emoji', v)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Nombre"
              placeholder="Ej: Netflix, Spotify, Gimnasio…"
              {...register('nombre')}
              error={errors.nombre?.message}
            />
          </div>
        </div>

        {/* Monto */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monto</label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
            <input
              {...register('monto')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[
                'w-full h-14 pl-8 pr-4 text-center text-2xl font-bold rounded-2xl border bg-white',
                'outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.monto ? 'border-danger-400' : 'border-slate-200'
              ].join(' ')}
            />
          </div>
          {errors.monto && <p className="text-xs text-danger-600 mt-1">{errors.monto.message}</p>}
        </div>

        {/* Frecuencia */}
        <Select
          label="Frecuencia"
          options={FRECUENCIA_OPTIONS}
          {...register('frecuencia')}
          error={errors.frecuencia?.message}
        />

        {/* Día de cobro (solo mensual) */}
        {frecuencia === 'mensual' && (
          <Input
            label="Día de cobro (opcional)"
            type="number"
            placeholder="Ej: 15"
            min={1} max={31}
            {...register('dia_cobro')}
            error={errors.dia_cobro?.message}
          />
        )}

        {/* Próxima fecha */}
        <Input
          label="Próxima fecha de cobro"
          type="date"
          {...register('proxima_fecha')}
          error={errors.proxima_fecha?.message}
        />

        {/* Cuenta */}
        <Select
          label="Cuenta (opcional)"
          options={cuentaOptions}
          placeholder="Sin cuenta asociada"
          {...register('cuenta_id')}
        />

        {/* Categoría */}
        <Select
          label="Categoría (opcional)"
          options={categoriaOptions}
          placeholder="Sin categoría"
          {...register('categoria_id')}
        />

        {/* Subcategoría — aparece solo si la categoría tiene subcategorías */}
        {subcategoriaOptions.length > 0 && (
          <Select
            label="Subcategoría (opcional)"
            options={subcategoriaOptions}
            placeholder="Sin subcategoría"
            {...register('subcategoria_id')}
          />
        )}

        {/* Nota */}
        <Input
          label="Nota (opcional)"
          placeholder="Ej: Plan familiar, se renueva en enero…"
          {...register('nota')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editing ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
