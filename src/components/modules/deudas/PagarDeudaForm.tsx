import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useCuentas } from '@/hooks/useCuentas'
import { useCreateMovimiento } from '@/hooks/useMovimientos'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import type { Deuda } from '@/types/app.types'

const schema = z.object({
  monto:     z.coerce.number().positive('Debe ser mayor a 0'),
  cuenta_id: z.string().min(1, 'Selecciona una cuenta'),
  fecha:     z.string().min(1, 'Requerido'),
  nota:      z.string().max(120).optional()
})
type FormValues = z.infer<typeof schema>

interface PagarDeudaFormProps {
  isOpen:  boolean
  onClose: () => void
  deuda:   Deuda
}

export function PagarDeudaForm({ isOpen, onClose, deuda }: PagarDeudaFormProps) {
  const { data: cuentas } = useCuentas()
  const createMov         = useCreateMovimiento()

  const cuentaOptions = (cuentas ?? [])
    .filter(c => c.activa && c.tipo !== 'inversion')
    .map(c => ({ value: c.id, label: c.nombre }))

  const porcentajePagado = deuda.monto_total > 0
    ? Math.min(100, ((deuda.monto_total - deuda.monto_pendiente) / deuda.monto_total) * 100)
    : 0

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      monto: deuda.cuota_mensual ?? deuda.monto_pendiente,
      fecha: todayISO()
    }
  })

  // Actualizar monto default cuando cambia la deuda o se abre el modal
  useEffect(() => {
    if (isOpen) {
      reset({
        monto:     deuda.cuota_mensual ?? deuda.monto_pendiente,
        fecha:     todayISO(),
        cuenta_id: '',
        nota:      ''
      })
    }
  }, [isOpen, deuda, reset])

  async function onSubmit(data: FormValues) {
    try {
      await createMov.mutateAsync({
        tipo:      'pago_deuda',
        fecha:     data.fecha,
        monto:     data.monto,
        cuenta_id: data.cuenta_id,
        deuda_id:  deuda.id,
        nota:      data.nota || undefined
      })
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al registrar pago')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago">

      {/* Cabecera de la deuda */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-slate-50">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${deuda.categoria?.color ?? '#6B7280'}20` }}
        >
          {deuda.categoria?.emoji ?? '💳'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{deuda.nombre}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1">
              <ProgressBar
                value={deuda.monto_total - deuda.monto_pendiente}
                max={deuda.monto_total}
                color="green"
                size="sm"
              />
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0">
              {formatCLP(deuda.monto_pendiente)} pendiente
            </span>
          </div>
        </div>
      </div>

      {/* Aviso informativo */}
      <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-xl mb-5">
        <Info className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary-700 leading-relaxed">
          El pago se descontará de la cuenta seleccionada y reducirá el saldo pendiente de la deuda.
          {deuda.cuota_mensual
            ? ` Cuota sugerida: ${formatCLP(deuda.cuota_mensual)}.`
            : ''}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Monto */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Monto a pagar
          </label>
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

          {/* Accesos rápidos */}
          {deuda.cuota_mensual && deuda.cuota_mensual !== deuda.monto_pendiente && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => reset(v => ({ ...v, monto: deuda.cuota_mensual! }))}
                className="flex-1 py-1.5 text-xs bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cuota: {formatCLP(deuda.cuota_mensual)}
              </button>
              <button
                type="button"
                onClick={() => reset(v => ({ ...v, monto: deuda.monto_pendiente }))}
                className="flex-1 py-1.5 text-xs bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Total: {formatCLP(deuda.monto_pendiente)}
              </button>
            </div>
          )}
        </div>

        {/* Cuenta de origen */}
        <Select
          label="Pagar desde"
          options={cuentaOptions}
          placeholder="Selecciona una cuenta"
          error={errors.cuenta_id?.message}
          {...register('cuenta_id')}
        />

        {/* Fecha */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Fecha del pago</label>
          <input
            {...register('fecha')}
            type="date"
            className="w-full mt-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Nota */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Nota <span className="normal-case font-normal">(opcional)</span>
          </label>
          <input
            {...register('nota')}
            type="text"
            placeholder="Cuota 3, pago anticipado…"
            className="w-full mt-1 h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-300"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={createMov.isPending}>
            Registrar pago
          </Button>
        </div>
      </form>
    </Modal>
  )
}
