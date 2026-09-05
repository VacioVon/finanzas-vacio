import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowDownLeft, Building2, User, Landmark, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useCreateTransferenciaExterna } from '@/hooks/useTransferenciasExternas'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import type { PersonaTipo } from '@/types/app.types'

const schema = z.object({
  monto:          z.coerce.number().positive('Debe ser mayor a 0'),
  fecha:          z.string().min(1, 'Requerido'),
  cuenta_id:      z.string().min(1, 'Selecciona una cuenta'),
  persona_nombre: z.string().min(1, 'Ingresa el nombre'),
  persona_tipo:   z.enum(['persona', 'empresa', 'banco', 'otro'] as const),
  proposito:      z.string().optional(),
  es_devolucion:  z.boolean().default(false),
  nota:           z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  isOpen:  boolean
  onClose: () => void
}

const PERSONA_TIPOS: { value: PersonaTipo; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'persona',  label: 'Persona',  icon: <User className="h-4 w-4" />,      color: '#10D97F' },
  { value: 'empresa',  label: 'Empresa',  icon: <Building2 className="h-4 w-4" />, color: '#2979FF' },
  { value: 'banco',    label: 'Banco',    icon: <Landmark className="h-4 w-4" />,   color: '#9B5DE5' },
  { value: 'otro',     label: 'Otro',     icon: <ArrowDownLeft className="h-4 w-4" />, color: '#FFB703' },
]

const COLOR = '#10D97F'

export function TransferenciaExternaForm({ isOpen, onClose }: Props) {
  const { data: cuentas } = useCuentas()
  const createMutation    = useCreateTransferenciaExterna()

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha:         todayISO(),
      persona_tipo:  'persona',
      es_devolucion: false,
    }
  })

  const personaTipo  = watch('persona_tipo')
  const esDevolucion = watch('es_devolucion')
  const monto        = Number(watch('monto') ?? 0)
  const selectedCuentaId = watch('cuenta_id')

  function handleClose() {
    reset()
    onClose()
  }

  async function onSubmit(data: FormValues) {
    try {
      await createMutation.mutateAsync({
        persona_nombre: data.persona_nombre,
        persona_tipo:   data.persona_tipo,
        proposito:      data.proposito,
        es_devolucion:  data.es_devolucion,
        monto:          data.monto,
        fecha:          data.fecha,
        cuenta_id:      data.cuenta_id,
        nota:           data.nota,
      })
      handleClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al registrar')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Dinero recibido">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Banner decorativo */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${COLOR}12 0%, #23212C 70%)` }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${COLOR}CC 0%, transparent 70%)` }}
          />
          <div
            className="size-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${COLOR}20`, boxShadow: `0 0 14px ${COLOR}35` }}
          >
            📥
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Transferencia externa</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Registra dinero que recibes de otra persona, empresa o banco
            </p>
          </div>
        </div>

        {/* Tipo de origen */}
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">Origen</p>
          <div className="grid grid-cols-4 gap-2">
            {PERSONA_TIPOS.map(pt => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setValue('persona_tipo', pt.value)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all"
                style={{
                  borderColor:     personaTipo === pt.value ? `${pt.color}50` : '#3D3B50',
                  backgroundColor: personaTipo === pt.value ? `${pt.color}12` : 'transparent',
                  color:           personaTipo === pt.value ? pt.color : '#64748B',
                }}
              >
                {pt.icon}
                <span className="text-[10px] font-semibold">{pt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ¿Es devolución? */}
        <button
          type="button"
          onClick={() => setValue('es_devolucion', !esDevolucion)}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all"
          style={{
            borderColor:     esDevolucion ? '#10D97F50' : '#3D3B50',
            backgroundColor: esDevolucion ? '#10D97F0C' : 'transparent',
          }}
        >
          <RotateCcw
            className="h-4 w-4 flex-shrink-0"
            style={{ color: esDevolucion ? '#10D97F' : '#475569' }}
          />
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-slate-200">Es una devolución</p>
            <p className="text-[10px] text-slate-500">Alguien te devuelve dinero que prestaste</p>
          </div>
          <div
            className="size-5 rounded-full border-2 flex-shrink-0 transition-all"
            style={{
              borderColor:     esDevolucion ? '#10D97F' : '#3D3B50',
              backgroundColor: esDevolucion ? '#10D97F' : 'transparent',
            }}
          />
        </button>

        {/* Nombre de la persona */}
        <Input
          label="Nombre de quien envía"
          placeholder="Ej: Juan Pérez, Empresa ABC"
          error={errors.persona_nombre?.message}
          {...register('persona_nombre')}
        />

        {/* Propósito */}
        <Input
          label="Propósito (opcional)"
          placeholder="Ej: Devolución préstamo, Pago trabajo, Regalo"
          {...register('proposito')}
        />

        {/* Monto y fecha */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto"
            type="number"
            step="1"
            min="1"
            placeholder="0"
            error={errors.monto?.message}
            {...register('monto')}
          />
          <Input
            label="Fecha"
            type="date"
            error={errors.fecha?.message}
            {...register('fecha')}
          />
        </div>

        {/* Cuenta destino */}
        <AccountPicker
          cuentas={(cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito')}
          selectedId={selectedCuentaId ?? ''}
          onChange={id => setValue('cuenta_id', id, { shouldValidate: true })}
          label="Cuenta donde llega"
          error={errors.cuenta_id?.message}
          exclude={['credito', 'inversion']}
        />

        {/* Nota */}
        <Input
          label="Nota (opcional)"
          placeholder="Detalles adicionales"
          {...register('nota')}
        />

        {/* Preview monto */}
        {monto > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: `${COLOR}10`, border: `1px solid ${COLOR}25` }}
          >
            <p className="text-xs text-slate-400 mb-1">Recibirás</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: COLOR }}>
              +{formatCLP(monto)}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="ingreso"
            className="flex-1"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Registrando…' : 'Registrar ingreso'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
