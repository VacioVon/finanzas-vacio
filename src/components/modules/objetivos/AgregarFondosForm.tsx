import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAsignarFondosObjetivo } from '@/hooks/useObjetivos'
import { formatCLP } from '@/utils/currency'
import type { ObjetivoAhorro } from '@/types/app.types'

const schema = z.object({
  monto: z.coerce.number().positive('Debe ser mayor a 0'),
  nota:  z.string().max(120).optional()
})
type FormValues = z.infer<typeof schema>

interface AgregarFondosFormProps {
  isOpen:   boolean
  onClose:  () => void
  objetivo: ObjetivoAhorro
}

const inputBase   = 'w-full rounded-2xl border bg-night-3 text-white outline-none transition-colors placeholder:text-slate-500'
const inputRing   = 'focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
const inputBorder = 'border-night-border hover:border-brand-500/40'

export function AgregarFondosForm({ isOpen, onClose, objetivo }: AgregarFondosFormProps) {
  const asignarMutation = useAsignarFondosObjetivo()
  const [modo, setModo] = useState<'agregar' | 'restar'>('agregar')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { monto: 0 }
  })

  const porcentaje = objetivo.monto_objetivo > 0
    ? Math.min(100, (objetivo.monto_actual / objetivo.monto_objetivo) * 100)
    : 0

  async function onSubmit(data: FormValues) {
    const delta = modo === 'agregar' ? data.monto : -data.monto
    try {
      await asignarMutation.mutateAsync({
        id:   objetivo.id,
        delta,
        nota: data.nota?.trim() || undefined
      })
      reset()
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al actualizar objetivo')
    }
  }

  function handleClose() {
    reset()
    setModo('agregar')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar progreso">
      {/* Header del objetivo */}
      <div
        className="flex items-center gap-3 mb-5 p-3 rounded-2xl"
        style={{ backgroundColor: `${objetivo.color}20` }}
      >
        <span className="text-2xl">{objetivo.emoji ?? '🎯'}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{objetivo.nombre}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${porcentaje}%`, backgroundColor: objetivo.color }}
              />
            </div>
            <span className="text-xs font-medium text-white/70 tabular-nums">
              {formatCLP(objetivo.monto_actual)} / {formatCLP(objetivo.monto_objetivo)}
            </span>
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl mb-5">
        <Info className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-300 leading-relaxed">
          Registrar progreso <strong>no mueve ni descuenta dinero</strong> de ninguna cuenta.
          Solo actualiza el avance hacia tu meta. El dinero sigue donde está físicamente.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Selector agregar / restar */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-night-3 rounded-2xl">
          <button
            type="button"
            onClick={() => setModo('agregar')}
            className={[
              'py-2 rounded-xl text-sm font-medium transition-all',
              modo === 'agregar'
                ? 'bg-night-1 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            ].join(' ')}
          >
            ➕ Agregar
          </button>
          <button
            type="button"
            onClick={() => setModo('restar')}
            className={[
              'py-2 rounded-xl text-sm font-medium transition-all',
              modo === 'restar'
                ? 'bg-night-1 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            ].join(' ')}
          >
            ➖ Restar
          </button>
        </div>

        {/* Monto */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {modo === 'agregar' ? 'Cuánto vas a agregar' : 'Cuánto vas a restar'}
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
        </div>

        {/* Nota opcional */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Nota <span className="normal-case font-normal">(opcional)</span>
          </label>
          <input
            {...register('nota')}
            type="text"
            placeholder="Ej: Depósito de junio, transferencia desde sueldo…"
            className={[inputBase, inputRing, 'mt-1 h-10 px-3 text-sm rounded-xl', inputBorder].join(' ')}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={asignarMutation.isPending}
          >
            {modo === 'agregar' ? 'Agregar progreso' : 'Restar progreso'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
