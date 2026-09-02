import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCreateCuota, useUpdateCuota } from '@/hooks/useCuotas'
import { useCuentas } from '@/hooks/useCuentas'
import { todayISO } from '@/utils/dates'
import { formatCLP } from '@/utils/currency'
import { calcularTCT } from '@/utils/financial'
import type { CuotaCredito } from '@/types/app.types'

const EMOJIS_COMPRAS = [
  // Tecnología
  '📱','💻','🖥️','⌨️','🖱️','📷','📹','🎮','🕹️','⌚','📺','🔊','🎧','🖨️',
  // Moda y calzado
  '👟','👠','👜','👗','🧥','🧣','🧤','🕶️','💍','👒','🎩',
  // Hogar
  '🛍️','🛋️','🛏️','🪑','🚿','🪴','🧹','🧺','🍳','🫕','🧊',
  // Deportes y fitness
  '🏋️','🚲','⚽','🏀','🎾','🏊','🧘','🏄','🎿','🥊',
  // Comida y restaurantes
  '🍕','🍔','🍣','☕','🍷','🥗','🎂','🍦',
  // Salud y bienestar
  '💊','🩺','🏥','🧴','🪥','💉',
  // Transporte
  '🚗','🚕','✈️','🚢','🏍️','🛵',
  // Educación y libros
  '🎓','📚','📖','🖊️','🗒️',
  // Entretenimiento
  '🎸','🎹','🎺','🎭','🎬','🎟️','🎠',
  // Viajes
  '🧳','🗺️','🏖️','⛺','🎡',
  // Regalos y otros
  '🎁','🎀','💐','🌟','✨',
]

const schema = z.object({
  cuenta_id:               z.string().min(1, 'Selecciona la tarjeta'),
  nombre:                  z.string().min(1, 'Requerido').max(80),
  emoji:                   z.string().optional(),
  monto_total:             z.coerce.number().positive('Debe ser mayor a 0'),
  monto_cuota:             z.coerce.number().positive('Debe ser mayor a 0'),
  cuotas_total:            z.coerce.number().int().min(1),
  cuotas_pagadas_inicial:  z.coerce.number().int().min(0).optional(),
  interes:                 z.coerce.number().min(0).max(200).optional(),
  comision:                z.coerce.number().min(0).optional(),
  fecha_inicio:            z.string().min(1, 'Requerido'),
  nota:                    z.string().max(200).optional()
}).refine(
  d => (d.cuotas_pagadas_inicial ?? 0) <= d.cuotas_total,
  { message: 'No puede ser mayor al total de cuotas', path: ['cuotas_pagadas_inicial'] }
)
type FormValues = z.infer<typeof schema>

interface CuotaFormProps {
  isOpen:   boolean
  onClose:  () => void
  editing?: CuotaCredito | null
}

const inputBase = 'w-full rounded-xl border bg-night-3 text-white text-sm outline-none transition-colors placeholder:text-slate-500'
const inputRing = 'focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
const inputBorder = 'border-night-border hover:border-brand-500/40'
const inputError  = 'border-gasto-500 focus:ring-gasto-500/50 focus:border-gasto-500'

export function CuotaForm({ isOpen, onClose, editing }: CuotaFormProps) {
  const createMutation = useCreateCuota()
  const updateMutation = useUpdateCuota()
  const { data: cuentas } = useCuentas()

  const [paraTercero,   setParaTercero]   = useState(false)
  const [terceroNombre, setTerceroNombre] = useState('')

  const tarjetaOptions = (cuentas ?? [])
    .filter(c => c.activa && c.tipo === 'credito')
    .map(c => ({ value: c.id, label: c.nombre }))

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fecha_inicio: todayISO(), interes: 0, comision: 0, emoji: '🛍️' }
  })

  const montoTotal       = watch('monto_total')  ?? 0
  const cuotasTotal      = watch('cuotas_total') ?? 0
  const cuotasPagadas    = Number(watch('cuotas_pagadas_inicial') ?? 0)
  const comision         = watch('comision') ?? 0
  const interesWatch     = watch('interes') ?? 0
  const selectedEmoji    = watch('emoji')

  const esModoHistorial  = cuotasPagadas > 0
  const cuotasPendientes = Math.max(0, cuotasTotal - cuotasPagadas)
  const costoReal        = montoTotal + comision
  const tctPreview       = calcularTCT(montoTotal, interesWatch, comision, cuotasTotal)

  useEffect(() => {
    if (montoTotal > 0 && cuotasTotal > 0 && !editing) {
      setValue('monto_cuota', Math.ceil(montoTotal / cuotasTotal))
    }
  }, [montoTotal, cuotasTotal, editing, setValue])

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setParaTercero(editing.para_tercero)
      setTerceroNombre(editing.tercero_nombre ?? '')
      reset({
        cuenta_id:              editing.cuenta_id,
        nombre:                 editing.nombre,
        emoji:                  editing.emoji ?? '🛍️',
        monto_total:            editing.monto_total,
        monto_cuota:            editing.monto_cuota,
        cuotas_total:           editing.cuotas_total,
        cuotas_pagadas_inicial: editing.cuotas_pagadas,
        interes:                editing.interes,
        comision:               editing.comision,
        fecha_inicio:           editing.fecha_inicio,
        nota:                   editing.nota ?? ''
      })
    } else {
      setParaTercero(false)
      setTerceroNombre('')
      reset({ fecha_inicio: todayISO(), interes: 0, comision: 0, emoji: '🛍️', cuotas_pagadas_inicial: 0 })
    }
  }, [isOpen, editing, reset])

  async function onSubmit(data: FormValues) {
    const form = {
      cuenta_id:               data.cuenta_id,
      nombre:                  data.nombre,
      emoji:                   data.emoji || '🛍️',
      monto_total:             data.monto_total,
      monto_cuota:             data.monto_cuota,
      cuotas_total:            data.cuotas_total,
      cuotas_pagadas_inicial:  data.cuotas_pagadas_inicial ?? 0,
      interes:                 data.interes  ?? 0,
      comision:                data.comision ?? 0,
      para_tercero:            paraTercero,
      tercero_nombre:          paraTercero && terceroNombre.trim() ? terceroNombre.trim() : undefined,
      fecha_inicio:            data.fecha_inicio,
      nota:                    data.nota || undefined
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const isLoading   = createMutation.isPending || updateMutation.isPending
  const submitLabel = editing
    ? 'Guardar cambios'
    : esModoHistorial
    ? '📋 Cargar historial'
    : 'Registrar compra'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar compra en cuotas' : 'Registrar compra en cuotas'}
      theme="dark"
      accent="#2979FF"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {tarjetaOptions.length === 0 && (
          <div className="p-3 bg-xp-500/10 rounded-xl text-xs text-xp-400">
            No tienes tarjetas de crédito configuradas. Agrega una cuenta tipo "Crédito" primero.
          </div>
        )}

        <Select
          label="Tarjeta de crédito"
          options={tarjetaOptions}
          placeholder="Selecciona la tarjeta"
          error={errors.cuenta_id?.message}
          {...register('cuenta_id')}
        />

        {/* Ícono */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Ícono</label>
            {selectedEmoji && (
              <span className="text-xl leading-none">{selectedEmoji}</span>
            )}
          </div>
          <div className="max-h-36 overflow-y-auto rounded-xl bg-night-3/60 p-2 border border-night-border/40">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS_COMPRAS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setValue('emoji', e)}
                  className={[
                    'size-9 rounded-xl text-lg transition-all flex-shrink-0',
                    selectedEmoji === e
                      ? 'bg-brand-500/30 ring-2 ring-brand-500/60 scale-110'
                      : 'hover:bg-night-2 active:scale-95'
                  ].join(' ')}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Input
          label="Nombre de la compra"
          placeholder="Ej: Proteína Whey, Skechers, Smart TV…"
          error={errors.nombre?.message}
          {...register('nombre')}
        />

        {/* Monto financiado */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Monto financiado
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input
              {...register('monto_total')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[inputBase, inputRing, 'h-11 pl-7 pr-4', errors.monto_total ? inputError : inputBorder].join(' ')}
            />
          </div>
          {errors.monto_total && <p className="text-xs text-gasto-400 mt-1">{errors.monto_total.message}</p>}
        </div>

        {/* Cuotas: total + ya pagadas + valor cuota */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</label>
            <input
              {...register('cuotas_total')}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="3"
              className={[inputBase, inputRing, 'mt-1 h-11 px-3 text-center', errors.cuotas_total ? inputError : inputBorder].join(' ')}
            />
            {errors.cuotas_total && <p className="text-[10px] text-gasto-400 mt-1">{errors.cuotas_total.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Ya pagadas</label>
            <input
              {...register('cuotas_pagadas_inicial')}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              className={[
                inputBase, inputRing, 'mt-1 h-11 px-3 text-center',
                errors.cuotas_pagadas_inicial
                  ? inputError
                  : esModoHistorial
                  ? 'border-xp-500/50 bg-xp-500/10 text-xp-300 font-semibold focus:ring-xp-500/50 focus:border-xp-500'
                  : inputBorder
              ].join(' ')}
            />
            {errors.cuotas_pagadas_inicial && (
              <p className="text-[10px] text-gasto-400 mt-1">{errors.cuotas_pagadas_inicial.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">$ Cuota</label>
            <div className="relative mt-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <input
                {...register('monto_cuota')}
                type="number"
                inputMode="numeric"
                placeholder="Auto"
                className={[inputBase, inputRing, 'h-11 pl-5 pr-2 text-center', errors.monto_cuota ? inputError : inputBorder].join(' ')}
              />
            </div>
            {errors.monto_cuota && <p className="text-[10px] text-gasto-400 mt-1">{errors.monto_cuota.message}</p>}
          </div>
        </div>

        {/* Banner modo historial / info */}
        {esModoHistorial ? (
          <div className="flex items-start gap-2.5 p-3.5 bg-xp-500/10 border border-xp-500/25 rounded-xl">
            <span className="text-lg flex-shrink-0">📋</span>
            <div>
              <p className="text-xs font-bold text-xp-300 mb-0.5">
                Reconstrucción de historial
              </p>
              <p className="text-xs text-xp-400 leading-relaxed">
                Esta compra ya tiene{' '}
                <strong>{cuotasPagadas} de {cuotasTotal || '?'}</strong> cuotas pagadas.{' '}
                {cuotasPendientes > 0
                  ? <>Quedan <strong>{cuotasPendientes}</strong> cuota{cuotasPendientes !== 1 ? 's' : ''} por pagar.</>
                  : <span className="font-semibold">Se marcará como completada.</span>
                }
              </p>
            </div>
          </div>
        ) : (
          montoTotal > 0 && (
            <div className="flex items-start gap-2 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
              <Info className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-300 leading-relaxed">
                Las cuotas son <strong>informacionales</strong>. No afectan el saldo de la tarjeta — ese impacto ya se registró en el movimiento de gasto.
              </p>
            </div>
          )
        )}

        {/* Comisión / impuesto */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Comisión / Impuesto{' '}
            <span className="font-normal normal-case text-slate-500">— opcional</span>
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input
              {...register('comision')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[inputBase, inputRing, 'h-11 pl-7 pr-4', inputBorder].join(' ')}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Ej: "IMPUESTO COMPRA CUOTAS". No altera el monto ni el cálculo de cuotas.
          </p>
          {(comision > 0 || interesWatch > 0) && montoTotal > 0 && cuotasTotal > 0 && (
            <div className="mt-2 space-y-1.5 px-3 py-2.5 bg-night-3 rounded-xl border border-night-border">
              {comision > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Costo total ({formatCLP(montoTotal)} + {formatCLP(comision)} comisión)
                  </span>
                  <span className="text-xs font-bold text-slate-300 tabular-nums">{formatCLP(costoReal)}</span>
                </div>
              )}
              {tctPreview !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">TCT estimada</span>
                  <span className="text-xs font-bold text-gasto-400 tabular-nums">{tctPreview}% anual</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interés + Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Interés anual (%)
            </label>
            <input
              {...register('interes')}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0"
              className={[inputBase, inputRing, 'mt-1 h-11 px-3', inputBorder].join(' ')}
            />
            <p className="text-[10px] text-slate-500 mt-0.5">0 = sin interés</p>
          </div>
          <Input
            label="Fecha de compra"
            type="date"
            error={errors.fecha_inicio?.message}
            {...register('fecha_inicio')}
          />
        </div>

        {/* Compra para tercero */}
        <div className={[
          'rounded-2xl border transition-all',
          paraTercero ? 'border-xp-500/30 bg-xp-500/10' : 'border-night-border bg-night-3/50'
        ].join(' ')}>
          <button
            type="button"
            onClick={() => setParaTercero(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3"
          >
            <div className={[
              'size-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors',
              paraTercero ? 'bg-xp-500 border-xp-500' : 'border-night-border bg-night-3'
            ].join(' ')}>
              {paraTercero && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
            <div className="flex items-center gap-2 flex-1 text-left">
              <Users className={`h-4 w-4 ${paraTercero ? 'text-xp-400' : 'text-slate-400'}`} />
              <div>
                <p className={`text-xs font-semibold ${paraTercero ? 'text-xp-300' : 'text-slate-300'}`}>
                  Compra para otra persona
                </p>
                <p className="text-[10px] text-slate-500">
                  Se excluirá del análisis personal de cuotas
                </p>
              </div>
            </div>
          </button>
          {paraTercero && (
            <div className="px-4 pb-4 border-t border-xp-500/20 pt-3">
              <label className="text-xs text-slate-400 font-medium">¿Para quién? (opcional)</label>
              <input
                type="text"
                value={terceroNombre}
                onChange={e => setTerceroNombre(e.target.value)}
                placeholder="Ej: Mamá, Pareja, Juan…"
                maxLength={60}
                className={[inputBase, inputRing, 'mt-1 h-10 px-3', 'border-xp-500/30 hover:border-xp-500/50'].join(' ')}
              />
            </div>
          )}
        </div>

        <Input
          label="Nota (opcional)"
          placeholder="Tienda, referencia, detalles…"
          {...register('nota')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={tarjetaOptions.length === 0}
          >
            {submitLabel}
          </Button>
        </div>

      </form>
    </Modal>
  )
}
