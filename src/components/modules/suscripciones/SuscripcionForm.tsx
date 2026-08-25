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
  frecuencia:      z.enum(['semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']),
  dia_cobro:       z.coerce.number().min(1).max(31).optional(),
  cuenta_id:       z.string().optional(),
  categoria_id:    z.string().optional(),
  subcategoria_id: z.string().optional(),
  proxima_fecha:   z.string().optional(),
  nota:            z.string().optional(),
  tipo:            z.enum(['servicio', 'gasto_fijo']),
  monto_tipo:      z.enum(['fijo', 'estimado']),
  fecha_fin:       z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const TIPO_OPTIONS = [
  { value: 'servicio',   label: 'Servicio — Netflix, Spotify, gym…' },
  { value: 'gasto_fijo', label: 'Gasto fijo — Luz, agua, dividendo…' },
]

const FRECUENCIA_OPTIONS = [
  { value: 'mensual',    label: 'Mensual' },
  { value: 'semanal',    label: 'Semanal' },
  { value: 'quincenal',  label: 'Quincenal' },
  { value: 'bimestral',  label: 'Bimestral (cada 2 meses)' },
  { value: 'trimestral', label: 'Trimestral (cada 3 meses)' },
  { value: 'semestral',  label: 'Semestral (cada 6 meses)' },
  { value: 'anual',      label: 'Anual' },
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
      defaultValues: {
        frecuencia:  'mensual',
        proxima_fecha: todayISO(),
        tipo:        'servicio',
        monto_tipo:  'fijo',
      }
    })

  const frecuencia          = watch('frecuencia')
  const emoji               = watch('emoji')
  const monto_tipo          = watch('monto_tipo')
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
        nota:            editing.nota            ?? '',
        tipo:            editing.tipo            ?? 'servicio',
        monto_tipo:      editing.monto_tipo      ?? 'fijo',
        fecha_fin:       editing.fecha_fin       ?? '',
      })
    } else {
      reset({ frecuencia: 'mensual', proxima_fecha: todayISO(), tipo: 'servicio', monto_tipo: 'fijo' })
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
        nota:            data.nota            || undefined,
        tipo:            data.tipo,
        monto_tipo:      data.monto_tipo,
        fecha_fin:       data.fecha_fin       || undefined,
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

  const cuentaOptions       = (cuentas    ?? []).map(c => ({ value: c.id, label: c.nombre }))
  const categoriaOptions    = (categorias ?? []).map(c => ({ value: c.id, label: `${c.emoji ?? ''} ${c.nombre}`.trim() }))
  const selectedCategoria   = (categorias ?? []).find(c => c.id === selectedCategoriaId)
  const subcategoriaOptions = (selectedCategoria?.subcategorias ?? [])
    .filter(s => s.activa)
    .map(s => ({ value: s.id, label: s.nombre }))
  const isLoading           = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar compromiso' : 'Nuevo compromiso'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Tipo de compromiso */}
        <Select
          label="Tipo"
          options={TIPO_OPTIONS}
          {...register('tipo')}
          error={errors.tipo?.message}
        />

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
              placeholder="Ej: Netflix, Spotify, Luz Enel…"
              {...register('nombre')}
              error={errors.nombre?.message}
            />
          </div>
        </div>

        {/* Monto + toggle fijo/estimado */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monto</label>
            <div className="flex gap-1 p-0.5 bg-night-3 rounded-lg border border-night-border">
              {(['fijo', 'estimado'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValue('monto_tipo', opt)}
                  className={[
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                    monto_tipo === opt
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  ].join(' ')}
                >
                  {opt === 'fijo' ? 'Exacto' : 'Estimado'}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            {monto_tipo === 'estimado' && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">~$</span>
            )}
            {monto_tipo === 'fijo' && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
            )}
            <input
              {...register('monto')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[
                'w-full h-14 pl-10 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border bg-night-3 text-white',
                'outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 placeholder:text-slate-500',
                errors.monto ? 'border-gasto-500' : 'border-night-border hover:border-brand-500/40'
              ].join(' ')}
            />
          </div>
          {monto_tipo === 'estimado' && (
            <p className="text-[10px] text-slate-500 mt-1">
              Valor de referencia — el monto real puede variar. Se mostrará con ~ en el calendario.
            </p>
          )}
          {errors.monto && <p className="text-xs text-gasto-400 mt-1">{errors.monto.message}</p>}
        </div>

        {/* Frecuencia */}
        <Select
          label="Frecuencia"
          options={FRECUENCIA_OPTIONS}
          {...register('frecuencia')}
          error={errors.frecuencia?.message}
        />

        {/* Día de cobro (solo mensual y sus múltiplos con día fijo) */}
        {(frecuencia === 'mensual' || frecuencia === 'bimestral' || frecuencia === 'trimestral' || frecuencia === 'semestral' || frecuencia === 'anual') && (
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

        {subcategoriaOptions.length > 0 && (
          <Select
            label="Subcategoría (opcional)"
            options={subcategoriaOptions}
            placeholder="Sin subcategoría"
            {...register('subcategoria_id')}
          />
        )}

        {/* Fecha de vencimiento del compromiso */}
        <Input
          label="Fecha de término (opcional)"
          type="date"
          hint="Si tiene fecha de fin — ej. dividendo hasta dic 2026"
          {...register('fecha_fin')}
        />

        {/* Nota */}
        <Input
          label="Nota (opcional)"
          placeholder="Ej: Plan familiar, contrato hasta enero…"
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
