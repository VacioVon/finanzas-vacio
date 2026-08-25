import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCreateDeuda, useUpdateDeuda } from '@/hooks/useDeudas'
import { useCategorias } from '@/hooks/useCategorias'
import { todayISO } from '@/utils/dates'
import type { Deuda } from '@/types/app.types'

const schema = z.object({
  nombre:            z.string().min(1, 'Requerido').max(80),
  categoria_id:      z.string().optional(),
  monto_total:       z.coerce.number().positive('Debe ser mayor a 0'),
  cuotas_total:      z.coerce.number().int().min(1).optional(),
  cuota_mensual:     z.coerce.number().min(0).optional(),
  interes:           z.coerce.number().min(0).max(200).optional(),
  fecha_compra:      z.string().min(1, 'Requerido'),
  fecha_prox_pago:   z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  nota:              z.string().max(200).optional()
})
type FormValues = z.infer<typeof schema>

interface DeudaFormProps {
  isOpen:   boolean
  onClose:  () => void
  editing?: Deuda | null
}

const inputBase   = 'w-full rounded-xl border bg-night-3 text-white text-sm outline-none transition-colors placeholder:text-slate-500'
const inputRing   = 'focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
const inputBorder = 'border-night-border hover:border-brand-500/40'

export function DeudaForm({ isOpen, onClose, editing }: DeudaFormProps) {
  const createMutation = useCreateDeuda()
  const updateMutation = useUpdateDeuda()
  const { data: categorias } = useCategorias()

  const catOptions = (categorias ?? [])
    .filter(c => c.activa)
    .map(c => ({ value: c.id, label: `${c.emoji ?? ''} ${c.nombre}`.trim() }))

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fecha_compra: todayISO(), interes: 0, cuotas_total: 1 }
  })

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      reset({
        nombre:            editing.nombre,
        categoria_id:      editing.categoria_id ?? '',
        monto_total:       editing.monto_total,
        cuotas_total:      editing.cuotas_total,
        cuota_mensual:     editing.cuota_mensual ?? undefined,
        interes:           editing.interes,
        fecha_compra:      editing.fecha_compra,
        fecha_prox_pago:   editing.fecha_prox_pago ?? '',
        fecha_vencimiento: editing.fecha_vencimiento ?? '',
        nota:              editing.nota ?? ''
      })
    } else {
      reset({ fecha_compra: todayISO(), interes: 0, cuotas_total: 1 })
    }
  }, [isOpen, editing, reset])

  async function onSubmit(data: FormValues) {
    const form = {
      nombre:            data.nombre,
      categoria_id:      data.categoria_id || undefined,
      monto_total:       data.monto_total,
      cuotas_total:      data.cuotas_total || 1,
      cuota_mensual:     data.cuota_mensual || undefined,
      interes:           data.interes || 0,
      fecha_compra:      data.fecha_compra,
      fecha_prox_pago:   data.fecha_prox_pago  || undefined,
      fecha_vencimiento: data.fecha_vencimiento || undefined,
      nota:              data.nota || undefined
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar deuda')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar deuda' : 'Nueva deuda'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <Input
          label="Nombre de la deuda"
          placeholder="Ej: Crédito de consumo BCI, Cuotas TV…"
          error={errors.nombre?.message}
          {...register('nombre')}
        />

        <Select
          label="Categoría (opcional)"
          options={catOptions}
          placeholder="Sin categoría"
          {...register('categoria_id')}
        />

        {/* Monto total */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Monto total de la deuda
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input
              {...register('monto_total')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[
                inputBase, inputRing, 'h-11 pl-7 pr-4',
                errors.monto_total ? 'border-gasto-500 focus:ring-gasto-500/50' : inputBorder
              ].join(' ')}
            />
          </div>
          {errors.monto_total && <p className="text-xs text-gasto-400 mt-1">{errors.monto_total.message}</p>}
        </div>

        {/* Cuotas + Cuota mensual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              N° cuotas
            </label>
            <input
              {...register('cuotas_total')}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="1"
              className={[inputBase, inputRing, 'mt-1 h-11 px-3', inputBorder].join(' ')}
            />
            <p className="text-[10px] text-slate-500 mt-0.5">1 = pago único</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Cuota mensual
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                {...register('cuota_mensual')}
                type="number"
                inputMode="numeric"
                placeholder="Opcional"
                className={[inputBase, inputRing, 'h-11 pl-7 pr-3', inputBorder].join(' ')}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Vacío = pago libre</p>
          </div>
        </div>

        {/* Interés */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Tasa de interés anual (%)
          </label>
          <input
            {...register('interes')}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            className={[inputBase, inputRing, 'mt-1 h-11 px-3', inputBorder].join(' ')}
          />
          <p className="text-[10px] text-slate-500 mt-0.5">0 = sin interés (préstamo familiar, cuotas sin cargo)</p>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de origen"
            type="date"
            error={errors.fecha_compra?.message}
            {...register('fecha_compra')}
          />
          <Input
            label="Próximo pago"
            type="date"
            {...register('fecha_prox_pago')}
          />
        </div>

        <Input
          label="Fecha de vencimiento (opcional)"
          type="date"
          {...register('fecha_vencimiento')}
        />

        <Input
          label="Nota (opcional)"
          placeholder="Condiciones, acuerdos, detalles…"
          {...register('nota')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editing ? 'Guardar cambios' : 'Crear deuda'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
