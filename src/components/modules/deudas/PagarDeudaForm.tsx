import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AccountPicker } from '@/components/ui/AccountPicker'
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

const inputBase   = 'w-full rounded-xl border bg-night-3 text-white outline-none transition-colors placeholder:text-slate-500'
const inputRing   = 'focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
const inputBorder = 'border-night-border hover:border-brand-500/40'

export function PagarDeudaForm({ isOpen, onClose, deuda }: PagarDeudaFormProps) {
  const { data: cuentas } = useCuentas()
  const createMov         = useCreateMovimiento()

  const cuentasPago = (cuentas ?? []).filter(c => c.activa && c.tipo !== 'inversion')

  const realPagado    = deuda.monto_pagado_real    ?? Math.max(0, deuda.monto_total - deuda.monto_pendiente)
  const realPendiente = deuda.monto_pendiente_real ?? Math.max(0, deuda.monto_total - realPagado)

  const porcentajePagado = deuda.monto_total > 0
    ? Math.min(100, (realPagado / deuda.monto_total) * 100)
    : 0

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      monto: deuda.cuota_mensual ?? realPendiente,
      fecha: todayISO()
    }
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        monto:     deuda.cuota_mensual ?? realPendiente,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago" theme="dark" accent="#F4645F">

      {/* Cabecera de la deuda */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-night-3 border border-night-border/60">
        <div
          className="size-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${deuda.categoria?.color ?? '#6B7280'}20` }}
        >
          {deuda.categoria?.emoji ?? '💳'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-200">{deuda.nombre}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1">
              <ProgressBar
                value={realPagado}
                max={deuda.monto_total}
                color="green"
                size="sm"
              />
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
              {formatCLP(realPendiente)} pendiente
            </span>
          </div>
        </div>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-2 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl mb-5">
        <Info className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-300 leading-relaxed">
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
                inputBase, inputRing,
                'h-14 pl-8 pr-4 text-center text-2xl font-bold tabular-nums',
                errors.monto ? 'border-gasto-500 focus:ring-gasto-500/50' : inputBorder
              ].join(' ')}
            />
          </div>
          {errors.monto && <p className="text-xs text-gasto-400 mt-1">{errors.monto.message}</p>}

          {deuda.cuota_mensual && deuda.cuota_mensual !== realPendiente && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => reset(v => ({ ...v, monto: deuda.cuota_mensual! }))}
                className="flex-1 py-1.5 text-xs bg-night-3 text-slate-300 rounded-xl border border-night-border hover:bg-night-2 transition-colors tabular-nums"
              >
                Cuota: {formatCLP(deuda.cuota_mensual)}
              </button>
              <button
                type="button"
                onClick={() => reset(v => ({ ...v, monto: realPendiente }))}
                className="flex-1 py-1.5 text-xs bg-night-3 text-slate-300 rounded-xl border border-night-border hover:bg-night-2 transition-colors tabular-nums"
              >
                Total: {formatCLP(realPendiente)}
              </button>
            </div>
          )}
        </div>

        <AccountPicker
          cuentas={cuentasPago}
          selectedId={watch('cuenta_id') ?? ''}
          onChange={id => setValue('cuenta_id', id, { shouldValidate: true })}
          label="Pagar desde"
          error={errors.cuenta_id?.message}
          exclude={['inversion']}
        />

        {/* Fecha */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Fecha del pago</label>
          <input
            {...register('fecha')}
            type="date"
            className={[inputBase, inputRing, 'mt-1 h-11 px-3 text-sm', inputBorder].join(' ')}
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
            className={[inputBase, inputRing, 'mt-1 h-10 px-3 text-sm', inputBorder].join(' ')}
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
