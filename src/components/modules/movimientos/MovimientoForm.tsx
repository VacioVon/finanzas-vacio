import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FileUploader } from '@/components/ui/FileUploader'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategoriasByTipo } from '@/hooks/useCategorias'
import { useCreateMovimiento, useUpdateMovimiento } from '@/hooks/useMovimientos'
import { useCreateCuota } from '@/hooks/useCuotas'
import { todayISO } from '@/utils/dates'
import { formatCLP } from '@/utils/currency'
import type { Movimiento, TipoMovimiento } from '@/types/app.types'

const schema = z.object({
  tipo:              z.enum(['ingreso', 'gasto', 'ahorro', 'pago_deuda', 'transferencia']),
  fecha:             z.string().min(1, 'Requerido'),
  monto:             z.coerce.number().positive('Debe ser mayor a 0'),
  categoria_id:      z.string().optional(),
  subcategoria_id:   z.string().optional(),
  cuenta_id:         z.string().min(1, 'Selecciona una cuenta'),
  cuenta_destino_id: z.string().optional(),
  nota:              z.string().optional()
}).superRefine((data, ctx) => {
  if (data.tipo !== 'transferencia' && !data.categoria_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona una categoría', path: ['categoria_id'] })
  }
  if (data.tipo === 'transferencia' && !data.cuenta_destino_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona la cuenta destino', path: ['cuenta_destino_id'] })
  }
  if (
    data.tipo === 'transferencia' &&
    data.cuenta_id && data.cuenta_destino_id &&
    data.cuenta_id === data.cuenta_destino_id
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Las cuentas deben ser distintas', path: ['cuenta_destino_id'] })
  }
})

type FormValues = z.infer<typeof schema>

const TIPOS_PRINCIPALES: { value: TipoMovimiento; label: string; emoji: string }[] = [
  { value: 'ingreso',       label: 'Ingreso',       emoji: '💰' },
  { value: 'gasto',         label: 'Gasto',         emoji: '💸' },
  { value: 'transferencia', label: 'Transferencia', emoji: '🔄' }
]

const TIPOS_AVANZADOS: { value: TipoMovimiento; label: string; emoji: string; descripcion: string }[] = [
  { value: 'ahorro', label: 'Ahorro externo', emoji: '🏦',
    descripcion: 'Dinero enviado a un destino sin cuenta registrada en la app' }
]

function tipoToCategoriaTipo(tipo: TipoMovimiento): string {
  if (tipo === 'ingreso') return 'ingreso'
  if (tipo === 'ahorro')  return 'ahorro'
  return 'gasto'
}

interface MovimientoFormProps {
  isOpen:              boolean
  onClose:             () => void
  onSuccess?:          () => void
  defaultTipo?:        TipoMovimiento
  editingMovimiento?:  Movimiento | null
  duplicateFrom?:      Movimiento | null
}

export function MovimientoForm({
  isOpen,
  onClose,
  onSuccess,
  defaultTipo = 'gasto',
  editingMovimiento,
  duplicateFrom
}: MovimientoFormProps) {
  const [tipo, setTipo]                       = useState<TipoMovimiento>(defaultTipo)
  const [comprobanteUrl, setComprobante]       = useState<string | null>(null)
  const [mostrarAvanzado, setMostrarAvanzado]  = useState(
    () => TIPOS_AVANZADOS.some(t => t.value === defaultTipo)
  )

  // ── Estado tarjeta crédito — cuotas ──────────────────────────
  const [cuotasTotal,   setCuotasTotal]   = useState(1)
  const [cuotasPagadas, setCuotasPagadas] = useState(0)
  const [comisionCuota, setComisionCuota] = useState(0)

  // ── Estado para tercero ───────────────────────────────────────
  const [paraTercero,   setParaTercero]   = useState(false)
  const [terceroNombre, setTerceroNombre] = useState('')

  const { data: cuentas }    = useCuentas()
  const { data: categorias } = useCategoriasByTipo(tipoToCategoriaTipo(tipo))
  const createMutation       = useCreateMovimiento()
  const updateMutation       = useUpdateMovimiento()
  const createCuotaMutation  = useCreateCuota()

  const {
    register, handleSubmit, watch, reset, setValue,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: defaultTipo, fecha: todayISO(), monto: 0 }
  })

  const selectedCategoriaId = watch('categoria_id')
  const selectedCuentaId    = watch('cuenta_id')
  const monto               = Number(watch('monto') ?? 0)  // watch devuelve string del input — forzar número

  // Detectar tipo de cuenta seleccionada
  const cuentaSeleccionada  = (cuentas ?? []).find(c => c.id === selectedCuentaId)
  const esTarjetaCredito    = cuentaSeleccionada?.tipo === 'credito'

  // Secciones visibles
  const mostrarSeccionCredito = tipo === 'gasto' && esTarjetaCredito && !editingMovimiento
  const mostrarSeccionTercero = tipo === 'gasto' && !editingMovimiento

  // Cuota calculada automáticamente (aplica desde 1 cuota)
  const montoCuotaCalculado = monto > 0 && cuotasTotal >= 1
    ? Math.ceil(monto / cuotasTotal)
    : 0

  // ¿Se creará registro en cuotas_credito? Toda compra con crédito >= 1 cuota
  const registrarCuota = mostrarSeccionCredito && cuotasTotal >= 1

  // Limpiar estado al cambiar de contexto
  useEffect(() => {
    if (!mostrarSeccionCredito) {
      setCuotasTotal(1)
      setCuotasPagadas(0)
      setComisionCuota(0)
    }
    if (!mostrarSeccionTercero) {
      setParaTercero(false)
      setTerceroNombre('')
    }
  }, [mostrarSeccionCredito, mostrarSeccionTercero])

  // ── Pre-llenar formulario (editar o duplicar) ─────────────────
  useEffect(() => {
    if (!isOpen) return
    setCuotasTotal(1)
    setCuotasPagadas(0)
    setComisionCuota(0)
    setParaTercero(false)
    setTerceroNombre('')

    const source = editingMovimiento ?? duplicateFrom

    if (source) {
      const t = source.tipo as TipoMovimiento
      setTipo(t)
      if (TIPOS_AVANZADOS.some(a => a.value === t)) setMostrarAvanzado(true)
      setComprobante(editingMovimiento?.comprobante_url ?? null)
      reset({
        tipo:              t,
        fecha:             editingMovimiento ? source.fecha : todayISO(),
        monto:             source.monto,
        categoria_id:      source.categoria_id ?? '',
        subcategoria_id:   source.subcategoria_id ?? '',
        cuenta_id:         source.cuenta_id ?? '',
        cuenta_destino_id: source.cuenta_destino_id ?? '',
        nota:              source.nota ?? ''
      })
    } else {
      setTipo(defaultTipo)
      setComprobante(null)
      reset({ tipo: defaultTipo, fecha: todayISO(), monto: 0 })
    }
  }, [isOpen, editingMovimiento, duplicateFrom])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Limpiar categoría al cambiar tipo ────────────────────────
  useEffect(() => {
    if (!editingMovimiento && !duplicateFrom) {
      setValue('categoria_id', '')
      setValue('subcategoria_id', '')
    }
  }, [tipo, setValue, editingMovimiento, duplicateFrom])

  // ── Opciones ─────────────────────────────────────────────────
  const cuentaOptions = (cuentas ?? []).map(c => ({
    value: c.id,
    label: `${c.nombre}${c.tipo === 'credito' ? ' 💳' : ''}`
  }))

  const categoriaOptions = (categorias ?? []).map(c => ({
    value: c.id,
    label: `${c.emoji ?? ''} ${c.nombre}`.trim()
  }))

  const selectedCategoria   = categorias?.find(c => c.id === selectedCategoriaId)
  const subcategoriaOptions = (selectedCategoria?.subcategorias ?? [])
    .filter(s => s.activa)
    .map(s => ({ value: s.id, label: s.nombre }))

  // ── Submit ───────────────────────────────────────────────────
  async function onSubmit(data: FormValues) {
    const formData = {
      tipo,
      fecha:             data.fecha,
      monto:             data.monto,
      categoria_id:      tipo !== 'transferencia' ? (data.categoria_id ?? '') : '',
      subcategoria_id:   data.subcategoria_id,
      cuenta_id:         data.cuenta_id,
      cuenta_destino_id: tipo === 'transferencia' ? data.cuenta_destino_id : undefined,
      nota:              data.nota,
      comprobante_url:   comprobanteUrl,
      comision:          tipo === 'gasto' && esTarjetaCredito ? comisionCuota : 0,
      para_tercero:      tipo === 'gasto' ? paraTercero : false,
      tercero_nombre:    tipo === 'gasto' && paraTercero && terceroNombre.trim()
        ? terceroNombre.trim()
        : undefined
    }

    try {
      if (editingMovimiento) {
        await updateMutation.mutateAsync({
          id:       editingMovimiento.id,
          original: editingMovimiento,
          form:     formData
        })
      } else {
        await createMutation.mutateAsync(formData)

        // Crear cuota si es tarjeta crédito + gasto (desde 1 cuota)
        if (registrarCuota) {
          const nombreCuota = data.nota?.trim()
            || selectedCategoria?.nombre
            || 'Compra'

          await createCuotaMutation.mutateAsync({
            cuenta_id:              data.cuenta_id,
            nombre:                 nombreCuota,
            emoji:                  selectedCategoria?.emoji ?? undefined,
            monto_total:            data.monto,
            cuotas_total:           cuotasTotal,
            cuotas_pagadas_inicial: cuotasPagadas,
            monto_cuota:            montoCuotaCalculado,
            comision:               comisionCuota,
            para_tercero:           paraTercero,
            tercero_nombre:         paraTercero && terceroNombre.trim() ? terceroNombre.trim() : undefined,
            interes:                0,
            fecha_inicio:           data.fecha
          })
        }
      }

      handleClose()
      onSuccess?.()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  function handleClose() {
    reset()
    setTipo(defaultTipo)
    setComprobante(null)
    setCuotasTotal(1)
    setCuotasPagadas(0)
    setComisionCuota(0)
    setParaTercero(false)
    setTerceroNombre('')
    onClose()
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || createCuotaMutation.isPending
  const title     = editingMovimiento ? 'Editar movimiento'
    : duplicateFrom ? 'Duplicar movimiento'
    : 'Nuevo movimiento'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>

      {/* ── Selector de tipo — principales ──────────────────── */}
      <div className="grid grid-cols-3 gap-1.5 mb-1 p-1 bg-slate-100 rounded-2xl">
        {TIPOS_PRINCIPALES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setTipo(t.value); setValue('tipo', t.value) }}
            className={[
              'flex flex-col items-center py-2 px-1 rounded-xl transition-all text-xs font-medium',
              tipo === t.value
                ? 'bg-white text-slate-900 shadow-card'
                : 'text-slate-500 hover:text-slate-700'
            ].join(' ')}
          >
            <span className="text-lg mb-0.5">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tipos avanzados — colapsables ────────────────────── */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setMostrarAvanzado(v => !v)}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors px-1 py-1"
        >
          <span className={`transition-transform duration-200 ${mostrarAvanzado ? 'rotate-90' : ''}`}>▶</span>
          Avanzado
        </button>

        {mostrarAvanzado && (
          <div className="mt-1 p-1 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            {TIPOS_AVANZADOS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTipo(t.value); setValue('tipo', t.value) }}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
                  tipo === t.value
                    ? 'bg-white shadow-card text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                ].join(' ')}
              >
                <span className="text-lg">{t.emoji}</span>
                <div>
                  <p className="text-xs font-semibold leading-tight">{t.label}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{t.descripcion}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Monto ───────────────────────────────────────────── */}
        <div className="text-center">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monto</label>
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
        </div>

        <Input label="Fecha" type="date" {...register('fecha')} error={errors.fecha?.message} />

        {/* ── Cuenta ──────────────────────────────────────────── */}
        <Select
          label="Cuenta origen"
          options={cuentaOptions}
          placeholder="Selecciona una cuenta"
          {...register('cuenta_id')}
          error={errors.cuenta_id?.message}
        />

        {tipo === 'transferencia' && (
          <Select
            label="Cuenta destino"
            options={cuentaOptions}
            placeholder="Selecciona cuenta destino"
            {...register('cuenta_destino_id')}
            error={errors.cuenta_destino_id?.message}
          />
        )}

        {/* ── Categoría ───────────────────────────────────────── */}
        {tipo !== 'transferencia' && (
          <>
            <Select
              label="Categoría"
              options={categoriaOptions}
              placeholder="Selecciona una categoría"
              {...register('categoria_id')}
              error={errors.categoria_id?.message}
            />
            {subcategoriaOptions.length > 0 && (
              <Select
                label="Subcategoría (opcional)"
                options={subcategoriaOptions}
                placeholder="Sin subcategoría"
                {...register('subcategoria_id')}
              />
            )}
          </>
        )}

        <Input
          label="Nota (opcional)"
          placeholder="Ej: New Balance, Smart TV…"
          {...register('nota')}
        />

        {/* ── Sección tarjeta crédito — siempre visible para tipo crédito + gasto ── */}
        {mostrarSeccionCredito && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50/60 overflow-hidden">

            {/* Cabecera */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <span className="text-base">💳</span>
              <p className="text-xs font-semibold text-primary-800">Compra en tarjeta de crédito</p>
            </div>

            <div className="px-4 pb-4 space-y-3">
              {/* Fila: N° cuotas + ya pagadas + $ cuota */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500 font-medium">N° cuotas</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={cuotasTotal}
                    onChange={e => {
                      const v = Math.max(1, parseInt(e.target.value) || 1)
                      setCuotasTotal(v)
                      setCuotasPagadas(prev => Math.min(prev, v))
                    }}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-primary-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-400 text-center font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium leading-tight">Ya pagadas</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={cuotasTotal}
                    value={cuotasPagadas}
                    onChange={e => setCuotasPagadas(Math.min(cuotasTotal, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-primary-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-400 text-center font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">$ Cuota</label>
                  <div className="mt-1 h-10 px-2 rounded-xl border border-primary-200 bg-white flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">
                      {montoCuotaCalculado > 0 ? formatCLP(montoCuotaCalculado) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comisión — siempre visible para cuentas crédito */}
              <div>
                <label className="text-xs text-slate-500 font-medium">
                  Comisión / Impuesto{' '}
                  <span className="font-normal text-slate-400">— opcional</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={comisionCuota || ''}
                    placeholder="0"
                    onChange={e => setComisionCuota(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-7 pr-4 rounded-xl border border-primary-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ej: "IMPUESTO COMPRA CUOTAS". No altera el monto ni el valor de cuota.
                </p>
              </div>

              {/* Resumen dinámico */}
              <div className="p-2.5 bg-white rounded-xl border border-primary-100 text-xs text-primary-700">
                {cuotasPagadas > 0 ? (
                  <>
                    📋 <strong>Historial:</strong> {cuotasPagadas}/{cuotasTotal} pagadas ·{' '}
                    quedan <strong>{cuotasTotal - cuotasPagadas}</strong> de{' '}
                    <strong>{formatCLP(montoCuotaCalculado)}</strong> c/u
                    {comisionCuota > 0 && <> · costo real <strong>{formatCLP(monto + comisionCuota)}</strong></>}
                  </>
                ) : cuotasTotal === 1 ? (
                  <>
                    💳 <strong>Pago único</strong>
                    {comisionCuota > 0
                      ? <> · costo real <strong>{formatCLP(monto + comisionCuota)}</strong></>
                      : null
                    }
                    {' '}· se registrará en Compras en cuotas
                  </>
                ) : (
                  <>
                    💳 <strong>{cuotasTotal} cuotas</strong> de{' '}
                    <strong>{formatCLP(montoCuotaCalculado)}</strong> c/u
                    {comisionCuota > 0 && <> · costo real <strong>{formatCLP(monto + comisionCuota)}</strong></>}
                    {' '}· se registrará en Compras en cuotas
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Compra para otra persona — todas las cuentas en gastos ── */}
        {mostrarSeccionTercero && (
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
                    Se excluirá de tus gastos personales y presupuestos
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
        )}

        {/* ── Comprobante ─────────────────────────────────────── */}
        <FileUploader value={comprobanteUrl} onChange={setComprobante} />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editingMovimiento ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
