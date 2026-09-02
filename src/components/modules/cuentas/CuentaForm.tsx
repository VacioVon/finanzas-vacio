import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCreateCuenta, useUpdateCuenta } from '@/hooks/useCuentas'
import { colorCuenta } from '@/utils/financial'
import type { Cuenta, TipoCuenta } from '@/types/app.types'

const schema = z.object({
  nombre:          z.string().min(1, 'Requerido'),
  tipo:            z.enum(['bancaria', 'digital', 'debito', 'credito', 'efectivo', 'inversion']),
  institucion:     z.string().optional(),
  saldo_inicial:   z.coerce.number().min(0),
  limite:          z.coerce.number().optional(),
  color:           z.string(),
  dia_facturacion: z.coerce.number().int().min(1).max(31).optional(),
  dia_vencimiento: z.coerce.number().int().min(1).max(31).optional(),
  pago_minimo_pct: z.coerce.number().min(0).max(100).optional()
})

type FormValues = z.infer<typeof schema>

const TIPOS_CUENTA: { value: TipoCuenta; label: string }[] = [
  { value: 'bancaria',  label: '🏦 Cuenta Bancaria' },
  { value: 'digital',   label: '📱 Cuenta Digital' },
  { value: 'debito',    label: '💳 Tarjeta Débito' },
  { value: 'credito',   label: '💳 Tarjeta Crédito' },
  { value: 'efectivo',  label: '💵 Efectivo' },
  { value: 'inversion', label: '📈 Inversión' }
]

const COLORES = [
  // Azules
  '#2979FF', '#2563EB', '#3B82F6', '#0EA5E9', '#06B6D4',
  // Verdes
  '#10D97F', '#16A34A', '#22C55E', '#84CC16', '#65A30D',
  // Violetas y rosados
  '#9B5DE5', '#7C3AED', '#A855F7', '#EC4899', '#DB2777',
  // Rojos y naranjas
  '#F4645F', '#DC2626', '#F97316', '#D97706', '#EAB308',
  // Neutros
  '#64748B', '#475569', '#334155', '#0F172A',
]

interface CuentaFormProps {
  isOpen: boolean
  onClose: () => void
  editingCuenta?: Cuenta | null
}

export function CuentaForm({ isOpen, onClose, editingCuenta }: CuentaFormProps) {
  const createMutation = useCreateCuenta()
  const updateMutation = useUpdateCuenta()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'bancaria', saldo_inicial: 0, color: '#2563EB' }
  })

  const tipo          = watch('tipo')
  const selectedColor = watch('color')

  // Pre-llenar cuando se edita
  useEffect(() => {
    if (editingCuenta) {
      reset({
        nombre:          editingCuenta.nombre,
        tipo:            editingCuenta.tipo,
        institucion:     editingCuenta.institucion ?? '',
        saldo_inicial:   editingCuenta.saldo_actual,
        limite:          editingCuenta.limite ?? undefined,
        color:           editingCuenta.color,
        dia_facturacion: editingCuenta.dia_facturacion ?? undefined,
        dia_vencimiento: editingCuenta.dia_vencimiento ?? undefined,
        pago_minimo_pct: editingCuenta.pago_minimo_pct ?? undefined
      })
    } else {
      reset({ tipo: 'bancaria', saldo_inicial: 0, color: '#2563EB' })
    }
  }, [editingCuenta, isOpen, reset])

  // Color automático solo en modo creación
  useEffect(() => {
    if (!editingCuenta) {
      setValue('color', colorCuenta(tipo))
    }
  }, [tipo, editingCuenta, setValue])

  async function onSubmit(data: FormValues) {
    try {
      const esCredito = data.tipo === 'credito'
      if (editingCuenta) {
        await updateMutation.mutateAsync({
          id: editingCuenta.id,
          updates: {
            nombre:          data.nombre,
            tipo:            data.tipo,
            institucion:     data.institucion || undefined,
            saldo_actual:    data.saldo_inicial,
            limite:          esCredito ? (data.limite ?? null) : null,
            color:           data.color,
            dia_facturacion: esCredito ? (data.dia_facturacion ?? null) : null,
            dia_vencimiento: esCredito ? (data.dia_vencimiento ?? null) : null,
            pago_minimo_pct: esCredito ? (data.pago_minimo_pct ?? null) : null
          }
        })
      } else {
        await createMutation.mutateAsync({
          nombre:          data.nombre,
          tipo:            data.tipo,
          institucion:     data.institucion,
          saldo_inicial:   data.saldo_inicial,
          limite:          data.limite,
          color:           data.color,
          dia_facturacion: esCredito ? data.dia_facturacion : undefined,
          dia_vencimiento: esCredito ? data.dia_vencimiento : undefined,
          pago_minimo_pct: esCredito ? data.pago_minimo_pct : undefined
        })
      }
      reset()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      alert(msg)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCuenta ? 'Editar cuenta' : 'Nueva cuenta'}
      theme="dark"
      accent="#10D97F"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Ej: BancoEstado"
          {...register('nombre')}
          error={errors.nombre?.message}
        />

        <Select
          label="Tipo de cuenta"
          options={TIPOS_CUENTA}
          {...register('tipo')}
          error={errors.tipo?.message}
        />

        <Input
          label="Institución (opcional)"
          placeholder="Ej: BancoEstado, Mercado Pago"
          {...register('institucion')}
        />

        <Input
          label={editingCuenta ? 'Saldo actual' : 'Saldo inicial'}
          type="number"
          inputMode="numeric"
          prefix="$"
          placeholder="0"
          {...register('saldo_inicial')}
          error={errors.saldo_inicial?.message}
          hint={editingCuenta ? 'Actualiza el saldo manualmente si hay discrepancias' : undefined}
        />

        {tipo === 'credito' && (
          <>
            <Input
              label="Límite de crédito"
              type="number"
              inputMode="numeric"
              prefix="$"
              placeholder="0"
              {...register('limite')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Día de facturación"
                type="number"
                inputMode="numeric"
                placeholder="Ej: 20"
                hint="Día en que cierra el ciclo"
                {...register('dia_facturacion')}
                error={errors.dia_facturacion?.message}
              />
              <Input
                label="Día de vencimiento"
                type="number"
                inputMode="numeric"
                placeholder="Ej: 5"
                hint="Día límite de pago"
                {...register('dia_vencimiento')}
                error={errors.dia_vencimiento?.message}
              />
            </div>
            <Input
              label="Pago mínimo (%)"
              type="number"
              inputMode="decimal"
              placeholder="Ej: 5"
              hint="Porcentaje del saldo como pago mínimo"
              {...register('pago_minimo_pct')}
              error={errors.pago_minimo_pct?.message}
            />
          </>
        )}

        {/* Selector de color */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Color</label>
            <div className="flex items-center gap-2">
              <div
                className="size-5 rounded-full border-2 border-white/20"
                style={{ backgroundColor: selectedColor }}
              />
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={e => setValue('color', e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <span className="text-[11px] text-brand-400 font-medium hover:text-brand-300 transition-colors">
                  Personalizar →
                </span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {COLORES.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className={[
                  'size-8 rounded-full transition-all active:scale-90',
                  selectedColor === color
                    ? 'ring-2 ring-offset-1 ring-offset-night-2 ring-white/60 scale-110'
                    : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
                ].join(' ')}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editingCuenta ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
