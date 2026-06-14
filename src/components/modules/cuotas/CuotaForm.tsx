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
import type { CuotaCredito } from '@/types/app.types'

const EMOJIS_COMPRAS = ['🛍️','👟','📱','💻','🖥️','📺','🎮','🏠','🚗','✈️','🎓','💊','🛋️','⌚','📷','🎸','🏋️','👗','🧳','🎁']

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

export function CuotaForm({ isOpen, onClose, editing }: CuotaFormProps) {
  const createMutation = useCreateCuota()
  const updateMutation = useUpdateCuota()
  const { data: cuentas } = useCuentas()

  // Estado para tercero fuera de RHF (consistente con MovimientoForm)
  const [paraTercero,   setParaTercero]   = useState(false)
  const [terceroNombre, setTerceroNombre] = useState('')

  // Solo tarjetas de crédito
  const tarjetaOptions = (cuentas ?? [])
    .filter(c => c.activa && c.tipo === 'credito')
    .map(c => ({ value: c.id, label: c.nombre }))

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fecha_inicio: todayISO(), interes: 0, comision: 0, emoji: '🛍️' }
  })

  const montoTotal        = watch('monto_total')   ?? 0
  const cuotasTotal       = watch('cuotas_total')  ?? 0
  const cuotasPagadas     = Number(watch('cuotas_pagadas_inicial') ?? 0)
  const comision          = watch('comision') ?? 0
  const selectedEmoji     = watch('emoji')

  // Modo historial: cuando ya hay cuotas pagadas
  const esModoHistorial   = cuotasPagadas > 0
  const cuotasPendientes  = Math.max(0, cuotasTotal - cuotasPagadas)
  const costoReal         = montoTotal + comision

  // Auto-calcular cuota mensual
  useEffect(() => {
    if (montoTotal > 0 && cuotasTotal > 0 && !editing) {
      setValue('monto_cuota', Math.ceil(montoTotal / cuotasTotal))
    }
  }, [montoTotal, cuotasTotal, editing, setValue])

  // Inicializar form
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

  const isLoading  = createMutation.isPending || updateMutation.isPending
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
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {tarjetaOptions.length === 0 && (
          <div className="p-3 bg-warning-50 rounded-xl text-xs text-warning-700">
            No tienes tarjetas de crédito configuradas. Agrega una cuenta tipo "Crédito" primero.
          </div>
        )}

        {/* ── 1. Tarjeta ─────────────────────────────────────────── */}
        <Select
          label="Tarjeta de crédito"
          options={tarjetaOptions}
          placeholder="Selecciona la tarjeta"
          error={errors.cuenta_id?.message}
          {...register('cuenta_id')}
        />

        {/* ── 2. Ícono ───────────────────────────────────────────── */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Ícono</label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EMOJIS_COMPRAS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setValue('emoji', e)}
                className={[
                  'w-9 h-9 rounded-xl text-lg transition-all',
                  selectedEmoji === e
                    ? 'bg-primary-100 ring-2 ring-primary-400 scale-110'
                    : 'bg-slate-100 hover:bg-slate-200'
                ].join(' ')}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Nombre ──────────────────────────────────────────── */}
        <Input
          label="Nombre de la compra"
          placeholder="Ej: Proteína Whey, Skechers, Smart TV…"
          error={errors.nombre?.message}
          {...register('nombre')}
        />

        {/* ── 4. Monto financiado ────────────────────────────────── */}
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
              className={[
                'w-full h-11 pl-7 pr-4 rounded-xl border bg-white text-sm outline-none',
                'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.monto_total ? 'border-danger-400' : 'border-slate-200'
              ].join(' ')}
            />
          </div>
          {errors.monto_total && <p className="text-xs text-danger-600 mt-1">{errors.monto_total.message}</p>}
        </div>

        {/* ── 5. Cuotas: total + ya pagadas + valor cuota ────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</label>
            <input
              {...register('cuotas_total')}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="3"
              className={[
                'w-full mt-1 h-11 px-3 rounded-xl border bg-white text-sm outline-none text-center',
                'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.cuotas_total ? 'border-danger-400' : 'border-slate-200'
              ].join(' ')}
            />
            {errors.cuotas_total && <p className="text-[10px] text-danger-600 mt-1">{errors.cuotas_total.message}</p>}
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
                'w-full mt-1 h-11 px-3 rounded-xl border text-sm outline-none text-center transition-colors',
                'focus:ring-2',
                esModoHistorial
                  ? 'border-warning-300 bg-warning-50 text-warning-800 font-semibold focus:ring-warning-400 focus:border-warning-400'
                  : 'border-slate-200 bg-white focus:ring-primary-500 focus:border-primary-500',
                errors.cuotas_pagadas_inicial ? 'border-danger-400' : ''
              ].join(' ')}
            />
            {errors.cuotas_pagadas_inicial && (
              <p className="text-[10px] text-danger-600 mt-1">{errors.cuotas_pagadas_inicial.message}</p>
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
                className={[
                  'w-full h-11 pl-5 pr-2 rounded-xl border bg-white text-sm outline-none text-center',
                  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  errors.monto_cuota ? 'border-danger-400' : 'border-slate-200'
                ].join(' ')}
              />
            </div>
            {errors.monto_cuota && <p className="text-[10px] text-danger-600 mt-1">{errors.monto_cuota.message}</p>}
          </div>
        </div>

        {/* ── Banner modo historial ──────────────────────────────── */}
        {esModoHistorial ? (
          <div className="flex items-start gap-2.5 p-3.5 bg-warning-50 border border-warning-200 rounded-xl">
            <span className="text-lg flex-shrink-0">📋</span>
            <div>
              <p className="text-xs font-bold text-warning-800 mb-0.5">
                Reconstrucción de historial
              </p>
              <p className="text-xs text-warning-700 leading-relaxed">
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
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Las cuotas son <strong>informacionales</strong>. No afectan el saldo de la tarjeta — ese impacto ya se registró en el movimiento de gasto.
              </p>
            </div>
          )
        )}

        {/* ── 6. Comisión / impuesto (opcional) ──────────────────── */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Comisión / Impuesto{' '}
            <span className="font-normal normal-case text-slate-300">— opcional</span>
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input
              {...register('comision')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className="w-full h-11 pl-7 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Ej: "IMPUESTO COMPRA CUOTAS". No altera el monto ni el cálculo de cuotas.
          </p>
          {comision > 0 && montoTotal > 0 && (
            <div className="mt-2 flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500">
                Costo financiero real ({formatCLP(montoTotal)} + {formatCLP(comision)})
              </span>
              <span className="text-sm font-bold text-slate-900">{formatCLP(costoReal)}</span>
            </div>
          )}
        </div>

        {/* ── 7. Interés + Fecha ─────────────────────────────────── */}
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
              className="w-full mt-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">0 = sin interés</p>
          </div>
          <Input
            label="Fecha de compra"
            type="date"
            error={errors.fecha_inicio?.message}
            {...register('fecha_inicio')}
          />
        </div>

        {/* ── 8. Compra para tercero ─────────────────────────────── */}
        <div className={[
          'rounded-2xl border transition-all',
          paraTercero ? 'border-warning-200 bg-warning-50' : 'border-slate-200 bg-white'
        ].join(' ')}>
          <button
            type="button"
            onClick={() => setParaTercero(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3"
          >
            <div className={[
              'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors',
              paraTercero ? 'bg-warning-500 border-warning-500' : 'border-slate-300 bg-white'
            ].join(' ')}>
              {paraTercero && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
            <div className="flex items-center gap-2 flex-1 text-left">
              <Users className={`h-4 w-4 ${paraTercero ? 'text-warning-600' : 'text-slate-400'}`} />
              <div>
                <p className={`text-xs font-semibold ${paraTercero ? 'text-warning-700' : 'text-slate-700'}`}>
                  Compra para otra persona
                </p>
                <p className="text-[10px] text-slate-400">
                  Se excluirá del análisis personal de cuotas
                </p>
              </div>
            </div>
          </button>
          {paraTercero && (
            <div className="px-4 pb-4 border-t border-warning-100 pt-3">
              <label className="text-xs text-slate-500 font-medium">¿Para quién? (opcional)</label>
              <input
                type="text"
                value={terceroNombre}
                onChange={e => setTerceroNombre(e.target.value)}
                placeholder="Ej: Mamá, Pareja, Juan…"
                maxLength={60}
                className="w-full mt-1 h-10 px-3 rounded-xl border border-warning-200 bg-white text-sm outline-none focus:ring-2 focus:ring-warning-400"
              />
            </div>
          )}
        </div>

        {/* ── 9. Nota ────────────────────────────────────────────── */}
        <Input
          label="Nota (opcional)"
          placeholder="Tienda, referencia, detalles…"
          {...register('nota')}
        />

        {/* Botones */}
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
