import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useRegistrarCobro } from '@/hooks/useCobros'
import { useCuentas } from '@/hooks/useCuentas'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import type { CuentaPorCobrar } from '@/types/app.types'

const schema = z.object({
  monto:     z.coerce.number().positive('Debe ser mayor a 0'),
  cuenta_id: z.string().min(1, 'Selecciona una cuenta'),
  fecha:     z.string().min(1),
  nota:      z.string().max(120).optional()
})
type FormValues = z.infer<typeof schema>

const inputBase   = 'w-full rounded-xl border bg-night-3 text-white outline-none transition-colors placeholder:text-slate-500'
const inputRing   = 'focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
const inputBorder = 'border-night-border hover:border-brand-500/40'

interface CobrarFormProps {
  isOpen:  boolean
  onClose: () => void
  cobro:   CuentaPorCobrar
}

export function CobrarForm({ isOpen, onClose, cobro }: CobrarFormProps) {
  const mutation  = useRegistrarCobro()
  const { data: cuentas } = useCuentas()

  const pendiente = cobro.monto_original - cobro.monto_pagado

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { monto: pendiente, cuenta_id: '', fecha: todayISO(), nota: '' }
  })

  useEffect(() => {
    if (isOpen) reset({ monto: pendiente, cuenta_id: '', fecha: todayISO(), nota: '' })
  }, [isOpen, pendiente, reset])

  const cuentaOptions = (cuentas ?? [])
    .filter(c => c.tipo !== 'credito')
    .map(c => ({ value: c.id, label: c.nombre }))

  async function onSubmit(data: FormValues) {
    try {
      await mutation.mutateAsync({
        cobraId:  cobro.id,
        monto:    data.monto,
        cuentaId: data.cuenta_id,
        fecha:    data.fecha,
        nota:     data.nota
      })
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al registrar el cobro')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar cobro">
      {/* Info del cobro */}
      <div className="mb-5 p-3 rounded-2xl bg-ingreso-500/10 border border-ingreso-500/25">
        <p className="text-xs text-ingreso-400 font-semibold uppercase tracking-wide">
          {cobro.persona}
        </p>
        {cobro.descripcion && (
          <p className="text-sm text-white mt-0.5">{cobro.descripcion}</p>
        )}
        <p className="text-xs text-slate-400 mt-1 tabular-nums">
          Pendiente: <span className="text-white font-semibold">{formatCLP(pendiente)}</span>
          {cobro.monto_pagado > 0 && (
            <span className="text-slate-500 ml-1">
              · ya cobrado {formatCLP(cobro.monto_pagado)}
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Monto */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Monto recibido
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
                errors.monto ? 'border-gasto-500' : inputBorder
              ].join(' ')}
            />
          </div>
          {errors.monto && <p className="text-xs text-gasto-400 mt-1">{errors.monto.message}</p>}
        </div>

        {/* Cuenta */}
        <Select
          label="Cuenta donde recibes"
          options={cuentaOptions}
          {...register('cuenta_id')}
          error={errors.cuenta_id?.message}
        />

        {/* Fecha */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Fecha</label>
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
            placeholder="Observación del cobro…"
            className={[inputBase, inputRing, 'mt-1 h-10 px-3 text-sm', inputBorder].join(' ')}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="ingreso" fullWidth loading={mutation.isPending}>
            Registrar cobro
          </Button>
        </div>
      </form>
    </Modal>
  )
}
