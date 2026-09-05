import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useCreateDineroAsignado } from '@/hooks/useDineroAsignado'
import { formatCLP } from '@/utils/currency'
import type { DineroAsignado, DineroAsignadoFormData, PropositoTipo } from '@/types/app.types'

const schema = z.object({
  cuenta_id:       z.string().min(1, 'Selecciona una cuenta'),
  nombre:          z.string().min(1, 'Ingresa un nombre'),
  emoji:           z.string().optional(),
  monto_reservado: z.coerce.number().positive('Debe ser mayor a 0'),
  proposito_tipo:  z.enum(['deuda', 'compra', 'objetivo', 'ahorro', 'emergencia', 'otro'] as const),
  descripcion:     z.string().optional(),
  fecha_limite:    z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  isOpen:    boolean
  onClose:   () => void
  cuentaId?: string    // pre-seleccionar cuenta
  editing?:  DineroAsignado | null
}

const PROPOSITOS: { value: PropositoTipo; label: string; emoji: string; color: string }[] = [
  { value: 'deuda',      label: 'Deuda',      emoji: '💳', color: '#F4645F' },
  { value: 'compra',     label: 'Compra',     emoji: '🛒', color: '#2979FF' },
  { value: 'objetivo',   label: 'Objetivo',   emoji: '🎯', color: '#9B5DE5' },
  { value: 'ahorro',     label: 'Ahorro',     emoji: '🏦', color: '#10D97F' },
  { value: 'emergencia', label: 'Emergencia', emoji: '🆘', color: '#FFB703' },
  { value: 'otro',       label: 'Otro',       emoji: '📦', color: '#00C2CB' },
]

export function DineroAsignadoForm({ isOpen, onClose, cuentaId, editing }: Props) {
  const { data: cuentas } = useCuentas()
  const createMutation    = useCreateDineroAsignado()

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      proposito_tipo: 'compra',
      emoji:          '📦',
    }
  })

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      reset({
        cuenta_id:       editing.cuenta_id,
        nombre:          editing.nombre,
        emoji:           editing.emoji,
        monto_reservado: editing.monto_reservado,
        proposito_tipo:  editing.proposito_tipo,
        descripcion:     editing.descripcion ?? '',
        fecha_limite:    editing.fecha_limite ?? '',
      })
    } else {
      reset({
        cuenta_id:      cuentaId ?? '',
        proposito_tipo: 'compra',
        emoji:          '📦',
      })
    }
  }, [isOpen, editing, cuentaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const propositoTipo   = watch('proposito_tipo')
  const monto           = Number(watch('monto_reservado') ?? 0)
  const selectedCuenta  = watch('cuenta_id')
  const propConfig      = PROPOSITOS.find(p => p.value === propositoTipo)!
  const color           = propConfig?.color ?? '#2979FF'

  function handleClose() {
    reset()
    onClose()
  }

  async function onSubmit(data: FormValues) {
    try {
      const form: DineroAsignadoFormData = {
        cuenta_id:       data.cuenta_id,
        nombre:          data.nombre,
        emoji:           propConfig.emoji,
        color:           color,
        monto_reservado: data.monto_reservado,
        proposito_tipo:  data.proposito_tipo,
        descripcion:     data.descripcion || undefined,
        fecha_limite:    data.fecha_limite || undefined,
      }
      await createMutation.mutateAsync(form)
      handleClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al crear sobre')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reservar dinero">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Banner */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${color}12 0%, #23212C 70%)` }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${color}CC 0%, transparent 70%)` }}
          />
          <div
            className="size-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${color}20`, boxShadow: `0 0 12px ${color}35` }}
          >
            {propConfig?.emoji ?? '📦'}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Sobre de dinero</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Reserva parte del saldo de una cuenta para un propósito específico
            </p>
          </div>
        </div>

        {/* Propósito */}
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">Para qué es</p>
          <div className="grid grid-cols-3 gap-2">
            {PROPOSITOS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setValue('proposito_tipo', p.value)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all"
                style={{
                  borderColor:     propositoTipo === p.value ? `${p.color}50` : '#3D3B50',
                  backgroundColor: propositoTipo === p.value ? `${p.color}12` : 'transparent',
                }}
              >
                <span className="text-lg">{p.emoji}</span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: propositoTipo === p.value ? p.color : '#64748B' }}
                >
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <Input
          label="Nombre del sobre"
          placeholder={`Ej: Cuota TV, Fondo emergencia, ${propConfig?.label ?? 'Propósito'}`}
          error={errors.nombre?.message}
          {...register('nombre')}
        />

        {/* Cuenta */}
        <AccountPicker
          cuentas={(cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito' && c.tipo !== 'inversion')}
          selectedId={selectedCuenta ?? ''}
          onChange={id => setValue('cuenta_id', id, { shouldValidate: true })}
          label="Cuenta origen"
          error={errors.cuenta_id?.message}
          exclude={['credito', 'inversion']}
        />

        {/* Monto y fecha */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto a reservar"
            type="number"
            step="1"
            min="1"
            placeholder="0"
            error={errors.monto_reservado?.message}
            {...register('monto_reservado')}
          />
          <Input
            label="Fecha límite (opcional)"
            type="date"
            {...register('fecha_limite')}
          />
        </div>

        {/* Descripción */}
        <Input
          label="Descripción (opcional)"
          placeholder="Detalles del propósito"
          {...register('descripcion')}
        />

        {/* Preview */}
        {monto > 0 && (
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}
          >
            <span className="text-xs text-slate-400">Monto reservado</span>
            <span className="text-base font-bold tabular-nums" style={{ color }}>
              {formatCLP(monto)}
            </span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={createMutation.isPending}
            style={{ backgroundColor: color, borderColor: color }}
          >
            {createMutation.isPending ? 'Creando…' : 'Crear sobre'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
