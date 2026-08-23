import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
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

// ── Schema ──────────────────────────────────────────────────────
const schema = z.object({
  tipo:              z.enum(['ingreso', 'gasto', 'ahorro', 'pago_deuda', 'transferencia']),
  fecha:             z.string().min(1, 'Requerido'),
  monto:             z.coerce.number().positive('Debe ser mayor a 0'),
  categoria_id:      z.string().optional(),
  subcategoria_id:   z.string().optional(),
  cuenta_id:         z.string().min(1, 'Selecciona una cuenta'),
  cuenta_destino_id: z.string().optional(),
  nota:              z.string().optional(),
  comercio:          z.string().optional()
}).superRefine((data, ctx) => {
  if (data.tipo !== 'transferencia' && data.tipo !== 'pago_deuda' && !data.categoria_id) {
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
type Paso = 'principal' | 'detalles' | 'confirmacion'

const TIPOS: { value: TipoMovimiento; label: string; emoji: string }[] = [
  { value: 'ingreso',       label: 'Ingreso',       emoji: '💰' },
  { value: 'gasto',         label: 'Gasto',         emoji: '💸' },
  { value: 'transferencia', label: 'Mover',          emoji: '🔄' }
]

function tipoToCategoriaTipo(tipo: TipoMovimiento): string {
  if (tipo === 'ingreso') return 'ingreso'
  if (tipo === 'ahorro')  return 'ahorro'
  return 'gasto'
}

interface Props {
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
}: Props) {
  const [tipo,        setTipo]        = useState<TipoMovimiento>(defaultTipo)
  const [paso,        setPaso]        = useState<Paso>('principal')
  const [pagoDeuda,   setPagoDeuda]   = useState(false)

  // Crédito / cuotas
  const [cuotasTotal,       setCuotasTotal]       = useState(1)
  const [primeraYaPagada,   setPrimeraYaPagada]   = useState(false)
  const [comisionCuota,     setComisionCuota]     = useState(0)

  // Para tercero
  const [paraTercero,   setParaTercero]   = useState(false)
  const [terceroNombre, setTerceroNombre] = useState('')

  // Comprobante
  const [comprobanteUrl, setComprobante] = useState<string | null>(null)

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

  const selectedCategoriaId  = watch('categoria_id')
  const selectedCuentaId     = watch('cuenta_id')
  const selectedDestId       = watch('cuenta_destino_id')
  const monto                = Number(watch('monto') ?? 0)

  const cuentaOrigen  = (cuentas ?? []).find(c => c.id === selectedCuentaId)
  const cuentaDest    = (cuentas ?? []).find(c => c.id === selectedDestId)
  const esTarjeta     = cuentaOrigen?.tipo === 'credito'

  const tipoReal: TipoMovimiento = tipo === 'gasto' && pagoDeuda ? 'pago_deuda' : tipo

  const mostrarCuotas    = tipo === 'gasto' && esTarjeta && !editingMovimiento
  const mostrarTercero   = tipo === 'gasto' && !editingMovimiento
  const mostrarTransf    = tipo === 'transferencia'
  const mostrarCategoria = tipo !== 'transferencia' && !pagoDeuda

  const montoCuota = monto > 0 && cuotasTotal >= 1
    ? Math.ceil(monto / cuotasTotal)
    : 0
  const registrarCuota = mostrarCuotas && cuotasTotal >= 1

  // ── Reset al abrir ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setPaso('principal')
    setCuotasTotal(1)
    setPrimeraYaPagada(false)
    setComisionCuota(0)
    setParaTercero(false)
    setTerceroNombre('')
    setPagoDeuda(false)

    const source = editingMovimiento ?? duplicateFrom
    if (source) {
      const t = source.tipo as TipoMovimiento
      const baseTipo = t === 'pago_deuda' ? 'gasto' : t
      setTipo(baseTipo)
      if (t === 'pago_deuda') setPagoDeuda(true)
      setComprobante(editingMovimiento?.comprobante_url ?? null)
      reset({
        tipo:              baseTipo,
        fecha:             editingMovimiento ? source.fecha : todayISO(),
        monto:             source.monto,
        categoria_id:      source.categoria_id ?? '',
        subcategoria_id:   source.subcategoria_id ?? '',
        cuenta_id:         source.cuenta_id ?? '',
        cuenta_destino_id: source.cuenta_destino_id ?? '',
        nota:              source.nota ?? '',
        comercio:          source.comercio ?? ''
      })
    } else {
      setTipo(defaultTipo)
      setComprobante(null)
      reset({ tipo: defaultTipo, fecha: todayISO(), monto: 0 })
    }
  }, [isOpen, editingMovimiento, duplicateFrom]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Limpiar categoría al cambiar tipo ───────────────────────
  useEffect(() => {
    if (!editingMovimiento && !duplicateFrom) {
      setValue('categoria_id', '')
      setValue('subcategoria_id', '')
    }
  }, [tipo, pagoDeuda, setValue, editingMovimiento, duplicateFrom])

  // ── Limpiar estado cuotas cuando deja de aplicar ────────────
  useEffect(() => {
    if (!mostrarCuotas) {
      setCuotasTotal(1)
      setPrimeraYaPagada(false)
      setComisionCuota(0)
    }
  }, [mostrarCuotas])

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
      tipo:              tipoReal,
      fecha:             data.fecha,
      monto:             data.monto,
      comercio:          data.comercio?.trim() || undefined,
      categoria_id:      mostrarCategoria ? (data.categoria_id ?? '') : '',
      subcategoria_id:   mostrarCategoria ? data.subcategoria_id : undefined,
      cuenta_id:         data.cuenta_id,
      cuenta_destino_id: mostrarTransf ? data.cuenta_destino_id : undefined,
      nota:              data.nota,
      comprobante_url:   comprobanteUrl,
      comision:          mostrarCuotas ? comisionCuota : 0,
      para_tercero:      mostrarTercero ? paraTercero : false,
      tercero_nombre:    mostrarTercero && paraTercero && terceroNombre.trim()
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

        if (registrarCuota) {
          const nombreCuota = data.comercio?.trim()
            || data.nota?.trim()
            || selectedCategoria?.nombre
            || 'Compra'

          await createCuotaMutation.mutateAsync({
            cuenta_id:              data.cuenta_id,
            nombre:                 nombreCuota,
            emoji:                  selectedCategoria?.emoji ?? undefined,
            monto_total:            data.monto,
            cuotas_total:           cuotasTotal,
            cuotas_pagadas_inicial: primeraYaPagada ? 1 : 0,
            monto_cuota:            montoCuota,
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
      const msg = e instanceof Error ? e.message : String(e)
      alert(`Error al guardar:\n\n${msg}`)
    }
  }

  function handleClose() {
    reset()
    setTipo(defaultTipo)
    setComprobante(null)
    setCuotasTotal(1)
    setPrimeraYaPagada(false)
    setComisionCuota(0)
    setParaTercero(false)
    setTerceroNombre('')
    setPagoDeuda(false)
    setPaso('principal')
    onClose()
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || createCuotaMutation.isPending
  const title = editingMovimiento ? 'Editar movimiento'
    : duplicateFrom ? 'Duplicar movimiento'
    : 'Nuevo movimiento'

  // ── Resumen para confirmación ────────────────────────────────
  const saldoOrigenActual = cuentaOrigen?.saldo_actual ?? 0
  const saldoOrigenDespues = tipo === 'ingreso'
    ? saldoOrigenActual + monto
    : saldoOrigenActual - monto

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={
      paso === 'detalles'     ? 'Más detalles'
      : paso === 'confirmacion' ? 'Confirmar'
      : title
    }>
      {/* ── Header de navegación para paso detalles/confirmacion ── */}
      {paso !== 'principal' && (
        <button
          type="button"
          onClick={() => setPaso(paso === 'confirmacion' ? 'detalles' : 'principal')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3 -mt-1 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </button>
      )}

      {/* ════════════════════════════════════════════════════════
          PASO 1 — PRINCIPAL
      ════════════════════════════════════════════════════════ */}
      {paso === 'principal' && (
        <form onSubmit={handleSubmit(() => setPaso('detalles'))} className="space-y-4">

          {/* Selector de tipo */}
          {!editingMovimiento && (
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTipo(t.value)
                    setValue('tipo', t.value)
                    setPagoDeuda(false)
                  }}
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
          )}

          {/* Toggle Pago de deuda (solo en Gasto) */}
          {tipo === 'gasto' && !editingMovimiento && (
            <button
              type="button"
              onClick={() => setPagoDeuda(v => !v)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all',
                pagoDeuda
                  ? 'border-orange-300 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              ].join(' ')}
            >
              <span className="text-base">🏦</span>
              <span className="flex-1 text-left">
                {pagoDeuda ? 'Modo: Pago de deuda activo' : 'Registrar como pago de deuda'}
              </span>
              <div className={[
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                pagoDeuda ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
              ].join(' ')}>
                {pagoDeuda && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
            </button>
          )}

          {/* Monto */}
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

          {/* Categoría (no en transferencia ni pago_deuda) */}
          {mostrarCategoria && (
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

          {/* Cuenta origen */}
          <Select
            label={mostrarTransf ? 'Cuenta origen' : 'Cuenta'}
            options={cuentaOptions}
            placeholder="Selecciona una cuenta"
            {...register('cuenta_id')}
            error={errors.cuenta_id?.message}
          />

          {/* Transferencia: cuenta destino + preview */}
          {mostrarTransf && (
            <>
              <Select
                label="Cuenta destino"
                options={cuentaOptions}
                placeholder="Selecciona cuenta destino"
                {...register('cuenta_destino_id')}
                error={errors.cuenta_destino_id?.message}
              />
              {cuentaOrigen && cuentaDest && monto > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>{cuentaOrigen.nombre}</span>
                    <span>
                      <span className="text-slate-400 line-through mr-1">{formatCLP(cuentaOrigen.saldo_actual)}</span>
                      <span className="font-semibold text-danger-600">{formatCLP(cuentaOrigen.saldo_actual - monto)}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{cuentaDest.nombre}</span>
                    <span>
                      <span className="text-slate-400 line-through mr-1">{formatCLP(cuentaDest.saldo_actual)}</span>
                      <span className="font-semibold text-emerald-600">{formatCLP(cuentaDest.saldo_actual + monto)}</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sección tarjeta crédito — cuotas */}
          {mostrarCuotas && (
            <div className="rounded-2xl border border-primary-200 bg-primary-50/60 overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <span className="text-base">💳</span>
                <p className="text-xs font-semibold text-primary-800">Compra en tarjeta de crédito</p>
              </div>

              <div className="px-4 pb-4 space-y-3">
                {/* N° cuotas + $ cuota */}
                <div className="grid grid-cols-2 gap-2">
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
                      }}
                      className="w-full mt-1 h-10 px-3 rounded-xl border border-primary-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-400 text-center font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">$ Cuota</label>
                    <div className="mt-1 h-10 px-2 rounded-xl border border-primary-200 bg-white flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-700">
                        {montoCuota > 0 ? formatCLP(montoCuota) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primera cuota — radio Pendiente / Ya pagada */}
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1.5 block">Primera cuota</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: false, label: '⏳ Pendiente' },
                      { value: true,  label: '✅ Ya pagada' }
                    ].map(opt => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setPrimeraYaPagada(opt.value)}
                        className={[
                          'py-2 rounded-xl border text-xs font-medium transition-all',
                          primeraYaPagada === opt.value
                            ? 'border-primary-400 bg-primary-100 text-primary-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comisión */}
                <div>
                  <label className="text-xs text-slate-500 font-medium">
                    Comisión / Impuesto <span className="font-normal text-slate-400">— opcional</span>
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
                </div>

                {/* Resumen cuotas */}
                <div className="p-2.5 bg-white rounded-xl border border-primary-100 text-xs text-primary-700">
                  {cuotasTotal === 1 ? (
                    <>💳 <strong>Pago único</strong>
                      {comisionCuota > 0 && <> · costo real <strong>{formatCLP(monto + comisionCuota)}</strong></>}
                      {primeraYaPagada && <> · marcada como pagada</>}
                    </>
                  ) : (
                    <>💳 <strong>{cuotasTotal} cuotas</strong> de <strong>{formatCLP(montoCuota)}</strong> c/u
                      {comisionCuota > 0 && <> · costo real <strong>{formatCLP(monto + comisionCuota)}</strong></>}
                      {primeraYaPagada && <> · 1 pagada, quedan {cuotasTotal - 1}</>}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botones principales */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-2xl bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-1 hover:bg-primary-700 transition-colors"
            >
              Más detalles
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Guardar directo (skip detalles) */}
          <button
            type="button"
            onClick={handleSubmit(async (data) => {
              const formData = {
                tipo:              tipoReal,
                fecha:             data.fecha,
                monto:             data.monto,
                categoria_id:      mostrarCategoria ? (data.categoria_id ?? '') : '',
                subcategoria_id:   mostrarCategoria ? data.subcategoria_id : undefined,
                cuenta_id:         data.cuenta_id,
                cuenta_destino_id: mostrarTransf ? data.cuenta_destino_id : undefined,
                nota:              data.nota,
                comprobante_url:   null,
                comision:          mostrarCuotas ? comisionCuota : 0,
                para_tercero:      false,
                tercero_nombre:    undefined
              }
              try {
                if (editingMovimiento) {
                  await updateMutation.mutateAsync({ id: editingMovimiento.id, original: editingMovimiento, form: formData })
                } else {
                  await createMutation.mutateAsync(formData)
                  if (registrarCuota) {
                    await createCuotaMutation.mutateAsync({
                      cuenta_id:              data.cuenta_id,
                      nombre:                 selectedCategoria?.nombre || 'Compra',
                      emoji:                  selectedCategoria?.emoji ?? undefined,
                      monto_total:            data.monto,
                      cuotas_total:           cuotasTotal,
                      cuotas_pagadas_inicial: primeraYaPagada ? 1 : 0,
                      monto_cuota:            montoCuota,
                      comision:               comisionCuota,
                      para_tercero:           false,
                      interes:                0,
                      fecha_inicio:           data.fecha
                    })
                  }
                }
                handleClose()
                onSuccess?.()
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                alert(`Error al guardar:\n\n${msg}`)
              }
            })}
            disabled={isLoading}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors disabled:opacity-40"
          >
            {isLoading ? 'Guardando…' : 'Guardar sin detalles adicionales'}
          </button>
        </form>
      )}

      {/* ════════════════════════════════════════════════════════
          PASO 2 — MÁS DETALLES
      ════════════════════════════════════════════════════════ */}
      {paso === 'detalles' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Banner de contexto */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {tipo === 'ingreso' ? '💰' : tipo === 'transferencia' ? '🔄' : pagoDeuda ? '🏦' : '💸'}
              </span>
              <div>
                <p className="text-xs text-slate-400 capitalize">{pagoDeuda ? 'Pago de deuda' : tipo}</p>
                <p className="text-sm font-bold text-slate-900">{monto > 0 ? formatCLP(monto) : '—'}</p>
              </div>
            </div>
            {cuentaOrigen && (
              <p className="text-xs text-slate-500">{cuentaOrigen.nombre}</p>
            )}
          </div>

          <Input label="Fecha" type="date" {...register('fecha')} error={errors.fecha?.message} />

          <Input
            label="Comercio / Tienda (opcional)"
            placeholder="Ej: Falabella, Uber, Netflix…"
            {...register('comercio')}
          />

          <Input
            label="Nota (opcional)"
            placeholder="Ej: Compra de cumpleaños, factura febrero…"
            {...register('nota')}
          />

          {/* Compra para otra persona */}
          {mostrarTercero && (
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
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
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
                      Se excluirá de tus gastos y presupuestos
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

          {/* Comprobante */}
          <FileUploader value={comprobanteUrl} onChange={setComprobante} />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setPaso('principal')}>
              Atrás
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              {editingMovimiento ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
