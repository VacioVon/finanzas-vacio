import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { usePlanificaciones } from '@/hooks/usePlanificaciones'
import { useCuentas } from '@/hooks/useCuentas'
import { useObjetivos } from '@/hooks/useObjetivos'
import { useCategorias } from '@/hooks/useCategorias'
import { formatCLP } from '@/utils/currency'
import type { TipoPlanificacion, PlanificacionFormData, RecurrenciaPlan } from '@/types/app.types'

// ── Schema ────────────────────────────────────────────────────
const schema = z.object({
  tipo:              z.enum(['gasto','ingreso','ahorro','mover']),
  monto:             z.number({ invalid_type_error: 'Ingresa un monto' }).positive('Monto debe ser positivo'),
  fecha:             z.string().min(1, 'Selecciona una fecha'),
  categoria_id:      z.string().optional(),
  descripcion:       z.string().optional(),
  comercio:          z.string().optional(),
  cuenta_id:         z.string().optional(),
  cuenta_destino_id: z.string().optional(),
  objetivo_id:       z.string().optional(),
  nota:              z.string().optional(),
  con_recurrencia:   z.boolean().default(false),
  frecuencia:        z.enum(['semanal','quincenal','mensual','personalizada']).optional(),
  intervalo_dias:    z.number().optional(),
  recurrencia_fin:   z.string().optional(),
  ocurrencias_restantes: z.number().optional(),
  limite_tipo:       z.enum(['sin_limite','fecha','ocurrencias']).default('sin_limite'),
})

type FormValues = z.infer<typeof schema>

// ── Tema visual por tipo ──────────────────────────────────────
const TIPO_THEME: Record<TipoPlanificacion, {
  label: string; accent: string; btnVariant: 'gasto'|'ingreso'|'ahorro'|'mover'
}> = {
  gasto:   { label: 'Gasto',     accent: 'text-gasto-400',   btnVariant: 'gasto'   },
  ingreso: { label: 'Ingreso',   accent: 'text-ingreso-400', btnVariant: 'ingreso' },
  ahorro:  { label: 'Ahorro',    accent: 'text-ahorro-400',  btnVariant: 'ahorro'  },
  mover:   { label: 'Mover',     accent: 'text-mover-400',   btnVariant: 'mover'   },
}

const inputDark = 'w-full bg-night-3 border border-night-border text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-500'

interface Props {
  isOpen:     boolean
  onClose:    () => void
  fechaInicial?: string  // pre-llenada desde el calendario
}

export function PlanificacionForm({ isOpen, onClose, fechaInicial }: Props) {
  const [tipo, setTipo] = useState<TipoPlanificacion>('gasto')
  const { crear } = usePlanificaciones()
  const { data: cuentasData }   = useCuentas()
  const { data: objetivosData } = useObjetivos()
  const { data: categoriasData } = useCategorias()

  const cuentas   = cuentasData?.filter(c => c.activa) ?? []
  const objetivos = objetivosData?.filter(o => o.estado === 'activo') ?? []
  const categorias = (categoriasData ?? []).filter(c => {
    if (tipo === 'gasto')   return c.tipo === 'gasto'
    if (tipo === 'ingreso') return c.tipo === 'ingreso'
    if (tipo === 'ahorro')  return c.tipo === 'ahorro'
    return false
  })

  const theme = TIPO_THEME[tipo]

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo,
      fecha: fechaInicial ?? format(new Date(), 'yyyy-MM-dd'),
      con_recurrencia: false,
      limite_tipo: 'sin_limite',
    }
  })

  const conRecurrencia = watch('con_recurrencia')
  const frecuencia     = watch('frecuencia')
  const limiteTipo     = watch('limite_tipo')

  function handleTipoChange(t: TipoPlanificacion) {
    setTipo(t)
    setValue('tipo', t)
    setValue('cuenta_id', '')
    setValue('cuenta_destino_id', '')
    setValue('objetivo_id', '')
  }

  async function onSubmit(values: FormValues) {
    let recurrencia: RecurrenciaPlan | undefined
    let ocurrencias_restantes: number | null = null

    if (values.con_recurrencia && values.frecuencia) {
      recurrencia = {
        frecuencia:    values.frecuencia,
        intervalo_dias: values.frecuencia === 'personalizada' ? values.intervalo_dias : undefined,
        fin:           values.limite_tipo === 'fecha' ? (values.recurrencia_fin || null) : null,
      }
      if (values.limite_tipo === 'ocurrencias' && values.ocurrencias_restantes) {
        ocurrencias_restantes = values.ocurrencias_restantes - 1  // -1 porque la primera ya se crea ahora
      }
    }

    const form: PlanificacionFormData = {
      tipo:                 values.tipo,
      monto:                values.monto,
      fecha:                values.fecha,
      categoria_id:         values.categoria_id || undefined,
      descripcion:          values.descripcion || undefined,
      comercio:             values.comercio || undefined,
      cuenta_id:            values.cuenta_id || undefined,
      cuenta_destino_id:    tipo === 'mover' ? (values.cuenta_destino_id || undefined) : undefined,
      objetivo_id:          tipo === 'ahorro' ? (values.objetivo_id || undefined) : undefined,
      nota:                 values.nota || undefined,
      recurrencia,
      ocurrencias_restantes,
    }

    await crear.mutateAsync(form)
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planificar" theme="dark">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Selector de tipo */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-night-0 rounded-xl">
          {(['gasto','ingreso','ahorro','mover'] as TipoPlanificacion[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTipoChange(t)}
              className={[
                'py-1.5 rounded-lg text-xs font-medium transition-all',
                tipo === t
                  ? `bg-night-3 ${TIPO_THEME[t].accent} shadow-sm`
                  : 'text-slate-500 hover:text-slate-300'
              ].join(' ')}
            >
              {TIPO_THEME[t].label}
            </button>
          ))}
        </div>

        {/* Monto */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Monto</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="0"
              {...register('monto', { valueAsNumber: true })}
              className={`${inputDark} pl-7 text-lg font-semibold ${theme.accent}`}
            />
          </div>
          {errors.monto && <p className="text-xs text-gasto-400 mt-1">{errors.monto.message}</p>}
        </div>

        {/* Fecha */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
          <input type="date" {...register('fecha')} className={inputDark} />
          {errors.fecha && <p className="text-xs text-gasto-400 mt-1">{errors.fecha.message}</p>}
        </div>

        {/* Cuenta(s) */}
        {tipo === 'mover' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Desde</label>
              <select {...register('cuenta_id')} className={inputDark}>
                <option value="">Selecciona</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Hacia</label>
              <select {...register('cuenta_destino_id')} className={inputDark}>
                <option value="">Selecciona</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              {tipo === 'ingreso' ? 'Cuenta destino' : 'Cuenta'}
            </label>
            <select {...register('cuenta_id')} className={inputDark}>
              <option value="">Selecciona una cuenta</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Objetivo (solo ahorro) */}
        {tipo === 'ahorro' && objetivos.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Objetivo (opcional)</label>
            <select {...register('objetivo_id')} className={inputDark}>
              <option value="">Sin objetivo específico</option>
              {objetivos.map(o => (
                <option key={o.id} value={o.id}>
                  {o.emoji ? `${o.emoji} ` : ''}{o.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Categoría (no aplica en mover) */}
        {tipo !== 'mover' && categorias.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
            <select {...register('categoria_id')} className={inputDark}>
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ''}{c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Descripción / Comercio */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
            <input type="text" placeholder="Ej: Cena" {...register('descripcion')} className={inputDark} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Comercio</label>
            <input type="text" placeholder="Ej: Jumbo" {...register('comercio')} className={inputDark} />
          </div>
        </div>

        {/* Nota */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Nota (opcional)</label>
          <input type="text" placeholder="..." {...register('nota')} className={inputDark} />
        </div>

        {/* Recurrencia */}
        <div className="border border-night-border rounded-xl p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('con_recurrencia')}
              className="w-4 h-4 rounded border-night-border bg-night-3 accent-brand-500"
            />
            <span className="text-sm text-slate-300">Repetir</span>
          </label>

          {conRecurrencia && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Frecuencia</label>
                <select {...register('frecuencia')} className={inputDark}>
                  <option value="">Selecciona</option>
                  <option value="semanal">Semanal (cada 7 días)</option>
                  <option value="quincenal">Quincenal (cada 15 días)</option>
                  <option value="mensual">Mensual</option>
                  <option value="personalizada">Personalizada</option>
                </select>
              </div>

              {frecuencia === 'personalizada' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Cada cuántos días</label>
                  <input
                    type="number"
                    min="1"
                    {...register('intervalo_dias', { valueAsNumber: true })}
                    className={inputDark}
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Límite</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['sin_limite','fecha','ocurrencias'] as const).map(lt => (
                    <button
                      key={lt}
                      type="button"
                      onClick={() => setValue('limite_tipo', lt)}
                      className={[
                        'py-1.5 rounded-lg text-xs font-medium transition-all',
                        limiteTipo === lt
                          ? 'bg-night-3 text-white shadow-sm border border-night-border'
                          : 'text-slate-500 hover:text-slate-300'
                      ].join(' ')}
                    >
                      {lt === 'sin_limite' ? 'Sin límite' : lt === 'fecha' ? 'Hasta fecha' : 'N veces'}
                    </button>
                  ))}
                </div>
              </div>

              {limiteTipo === 'fecha' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Fecha de término</label>
                  <input type="date" {...register('recurrencia_fin')} className={inputDark} />
                </div>
              )}

              {limiteTipo === 'ocurrencias' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Número de veces</label>
                  <input
                    type="number"
                    min="2"
                    placeholder="Ej: 12"
                    {...register('ocurrencias_restantes', { valueAsNumber: true })}
                    className={inputDark}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={theme.btnVariant}
            className="flex-1"
            loading={crear.isPending}
          >
            Planificar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
