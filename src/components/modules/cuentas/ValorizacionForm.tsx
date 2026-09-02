import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCreateValorizacion } from '@/hooks/useValorizaciones'
import { formatCLP } from '@/utils/currency'
import { todayISO } from '@/utils/dates'
import type { Cuenta } from '@/types/app.types'

const schema = z.object({
  fecha: z.string().min(1, 'Requerido'),
  valor: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
  nota:  z.string().max(120).optional()
})
type FormValues = z.infer<typeof schema>

const inputBase   = 'w-full rounded-xl border bg-night-3 text-white outline-none transition-colors placeholder:text-slate-500'
const inputRing   = 'focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
const inputBorder = 'border-night-border hover:border-brand-500/40'

interface ValorizacionFormProps {
  isOpen:   boolean
  onClose:  () => void
  cuenta:   Cuenta
}

export function ValorizacionForm({ isOpen, onClose, cuenta }: ValorizacionFormProps) {
  const mutation = useCreateValorizacion()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fecha: todayISO(), valor: cuenta.saldo_actual }
  })

  useEffect(() => {
    if (isOpen) {
      reset({ fecha: todayISO(), valor: cuenta.saldo_actual, nota: '' })
    }
  }, [isOpen, cuenta.saldo_actual, reset])

  async function onSubmit(data: FormValues) {
    try {
      await mutation.mutateAsync({
        cuentaId: cuenta.id,
        fecha:    data.fecha,
        valor:    data.valor,
        nota:     data.nota
      })
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al registrar')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Actualizar valor" theme="dark" accent="#10D97F">
      {/* Header de la cuenta */}
      <div
        className="flex items-center gap-3 mb-5 p-3 rounded-2xl"
        style={{ backgroundColor: `${cuenta.color}20` }}
      >
        <TrendingUp className="h-5 w-5 flex-shrink-0" style={{ color: cuenta.color }} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{cuenta.nombre}</p>
          <p className="text-xs text-white/60 tabular-nums">
            Valor actual: {formatCLP(cuenta.saldo_actual)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nuevo valor */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Valor del portafolio
          </label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
            <input
              {...register('valor')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[
                inputBase, inputRing,
                'h-14 pl-8 pr-4 text-center text-2xl font-bold tabular-nums',
                errors.valor ? 'border-gasto-500 focus:ring-gasto-500/50' : inputBorder
              ].join(' ')}
            />
          </div>
          {errors.valor && <p className="text-xs text-gasto-400 mt-1">{errors.valor.message}</p>}
        </div>

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
            placeholder="Ej: Cierre mensual, rebalanceo…"
            className={[inputBase, inputRing, 'mt-1 h-10 px-3 text-sm', inputBorder].join(' ')}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={mutation.isPending}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
