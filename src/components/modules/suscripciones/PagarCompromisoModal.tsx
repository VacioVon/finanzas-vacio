import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useRegistrarPagoCompromiso } from '@/hooks/useSuscripciones'
import { todayISO } from '@/utils/dates'
import { formatCLP } from '@/utils/currency'
import type { Suscripcion } from '@/types/app.types'

const schema = z.object({
  cuenta_id: z.string().min(1, 'Selecciona una cuenta'),
  monto:     z.coerce.number().positive('Debe ser mayor a 0'),
  fecha:     z.string().min(1, 'Requerido'),
  nota:      z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  isOpen:       boolean
  onClose:      () => void
  compromiso:   Suscripcion | null
}

export function PagarCompromisoModal({ isOpen, onClose, compromiso }: Props) {
  const { data: cuentas }  = useCuentas()
  const pagarMutation       = useRegistrarPagoCompromiso()
  const [error, setError]   = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha:     todayISO(),
      monto:     compromiso?.monto ?? 0,
      cuenta_id: compromiso?.cuenta_id ?? '',
    }
  })

  const defaultMonto = compromiso?.monto ?? 0
  const cuentaIdSeleccionada = watch('cuenta_id')

  async function onSubmit(data: FormValues) {
    if (!compromiso) return
    setError(null)
    try {
      await pagarMutation.mutateAsync({
        compromiso,
        pago: {
          cuenta_id:    data.cuenta_id,
          monto:        data.monto,
          fecha:        data.fecha,
          nota:         data.nota || undefined,
        }
      })
      reset()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago')
    }
  }

  if (!compromiso) return null

  const esEstimado = compromiso.monto_tipo === 'estimado'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago" theme="dark" accent="#00C2CB">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Info del compromiso */}
        <div className="flex items-center gap-3 p-3 bg-night-2 rounded-xl border border-night-border">
          <span className="text-2xl">{compromiso.emoji ?? '🔄'}</span>
          <div>
            <p className="text-sm font-semibold text-white">{compromiso.nombre}</p>
            {esEstimado && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Monto estimado — edítalo si el valor real es diferente
              </p>
            )}
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-white tabular-nums">
              {esEstimado ? '~' : ''}{formatCLP(defaultMonto)}
            </p>
            <p className="text-[10px] text-slate-500">referencia</p>
          </div>
        </div>

        {/* Monto real */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Monto {esEstimado ? 'real (editable)' : 'del pago'}
          </label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
            <input
              {...register('monto')}
              type="number"
              inputMode="numeric"
              defaultValue={defaultMonto}
              placeholder="0"
              className={[
                'w-full h-14 pl-10 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border bg-night-3 text-white',
                'outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 placeholder:text-slate-500',
                errors.monto ? 'border-gasto-500' : 'border-night-border hover:border-brand-500/40'
              ].join(' ')}
            />
          </div>
          {errors.monto && <p className="text-xs text-gasto-400 mt-1">{errors.monto.message}</p>}
        </div>

        <AccountPicker
          label="Pagar desde"
          cuentas={(cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito')}
          selectedId={cuentaIdSeleccionada}
          onChange={id => setValue('cuenta_id', id, { shouldValidate: true })}
          error={errors.cuenta_id?.message}
        />

        <Input
          label="Fecha del pago"
          type="date"
          {...register('fecha')}
          error={errors.fecha?.message}
        />

        <Input
          label="Nota (opcional)"
          placeholder="Referencia, número de boleta…"
          {...register('nota')}
        />

        {error && (
          <p className="text-xs text-gasto-400 bg-gasto-500/10 border border-gasto-500/25 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={pagarMutation.isPending}>
            Registrar pago
          </Button>
        </div>
      </form>
    </Modal>
  )
}
