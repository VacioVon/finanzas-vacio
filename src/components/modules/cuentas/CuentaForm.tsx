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
  nombre:        z.string().min(1, 'Requerido'),
  tipo:          z.enum(['bancaria', 'digital', 'debito', 'credito', 'efectivo', 'inversion']),
  institucion:   z.string().optional(),
  saldo_inicial: z.coerce.number().min(0),
  limite:        z.coerce.number().optional(),
  color:         z.string()
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
  '#2563EB', '#7C3AED', '#0891B2', '#16A34A',
  '#D97706', '#DC2626', '#DB2777', '#0F172A'
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
        nombre:        editingCuenta.nombre,
        tipo:          editingCuenta.tipo,
        institucion:   editingCuenta.institucion ?? '',
        saldo_inicial: editingCuenta.saldo_actual,   // muestra el saldo actual en el campo
        limite:        editingCuenta.limite ?? undefined,
        color:         editingCuenta.color
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
      if (editingCuenta) {
        // ✅ CORREGIDO: incluye saldo_actual en el payload de update
        await updateMutation.mutateAsync({
          id: editingCuenta.id,
          updates: {
            nombre:       data.nombre,
            tipo:         data.tipo,
            institucion:  data.institucion || undefined,
            saldo_actual: data.saldo_inicial,   // campo form → columna DB correcta
            limite:       data.tipo === 'credito' ? (data.limite ?? null) : null,
            color:        data.color
          }
        })
      } else {
        await createMutation.mutateAsync({
          nombre:       data.nombre,
          tipo:         data.tipo,
          institucion:  data.institucion,
          saldo_inicial: data.saldo_inicial,
          limite:       data.limite,
          color:        data.color
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
          <Input
            label="Límite de crédito"
            type="number"
            inputMode="numeric"
            prefix="$"
            placeholder="0"
            {...register('limite')}
          />
        )}

        {/* Selector de color */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORES.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className={[
                  'w-8 h-8 rounded-full transition-all',
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-slate-700 scale-110'
                    : 'hover:scale-105'
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
