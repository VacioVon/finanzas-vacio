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
import { useCrearGastoTercero } from '@/hooks/useCobros'
import { useDeudas } from '@/hooks/useDeudas'
import { useSuscripciones } from '@/hooks/useSuscripciones'
import { ContextoPagoSelector } from '@/components/modules/deudas/ContextoPagoSelector'
import { CategoryPicker } from './CategoryPicker'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { todayISO } from '@/utils/dates'
import { formatCLP } from '@/utils/currency'
import type { Movimiento, TipoMovimiento, ContextoPago } from '@/types/app.types'

// ── Tokens visuales por tipo ─────────────────────────────────────
const TIPO_ACCENT_HEX: Record<string, string> = {
  gasto:        '#F4645F',
  ingreso:      '#10D97F',
  ahorro:       '#9B5DE5',
  transferencia:'#00C2CB',
  pago_deuda:   '#FFB703',
  pago_tarjeta: '#2979FF',
}

const TIPO_THEME = {
  gasto: {
    accent:       'text-gasto-400',
    border:       'border-gasto-500/30',
    bg:           'bg-gasto-500/8',
    bgActive:     'bg-gasto-500/20',
    ring:         'ring-gasto-500/50',
    btnVariant:   'gasto' as const,
    glow:         'shadow-glow-gasto',
    monto:        'text-gasto-400',
    selectorBg:   'bg-gasto-500/15 border-gasto-500/40 text-gasto-300',
    emoji:        '💸',
  },
  ingreso: {
    accent:       'text-ingreso-400',
    border:       'border-ingreso-500/30',
    bg:           'bg-ingreso-500/8',
    bgActive:     'bg-ingreso-500/20',
    ring:         'ring-ingreso-500/50',
    btnVariant:   'ingreso' as const,
    glow:         'shadow-glow-ingreso',
    monto:        'text-ingreso-400',
    selectorBg:   'bg-ingreso-500/15 border-ingreso-500/40 text-ingreso-300',
    emoji:        '💰',
  },
  ahorro: {
    accent:       'text-ahorro-400',
    border:       'border-ahorro-500/30',
    bg:           'bg-ahorro-500/8',
    bgActive:     'bg-ahorro-500/20',
    ring:         'ring-ahorro-500/50',
    btnVariant:   'ahorro' as const,
    glow:         'shadow-glow-ahorro',
    monto:        'text-ahorro-400',
    selectorBg:   'bg-ahorro-500/15 border-ahorro-500/40 text-ahorro-300',
    emoji:        '🏦',
  },
  transferencia: {
    accent:       'text-mover-400',
    border:       'border-mover-500/30',
    bg:           'bg-mover-500/8',
    bgActive:     'bg-mover-500/20',
    ring:         'ring-mover-500/50',
    btnVariant:   'mover' as const,
    glow:         'shadow-glow-mover',
    monto:        'text-mover-400',
    selectorBg:   'bg-mover-500/15 border-mover-500/40 text-mover-300',
    emoji:        '🔄',
  },
  pago_deuda: {
    accent:       'text-xp-400',
    border:       'border-xp-500/30',
    bg:           'bg-xp-500/8',
    bgActive:     'bg-xp-500/20',
    ring:         'ring-xp-500/50',
    btnVariant:   'gasto' as const,
    glow:         'shadow-glow-gasto',
    monto:        'text-xp-400',
    selectorBg:   'bg-xp-500/15 border-xp-500/40 text-xp-300',
    emoji:        '🏦',
  },
  pago_tarjeta: {
    accent:       'text-brand-400',
    border:       'border-brand-500/30',
    bg:           'bg-brand-500/8',
    bgActive:     'bg-brand-500/20',
    ring:         'ring-brand-500/50',
    btnVariant:   'mover' as const,
    glow:         'shadow-glow-mover',
    monto:        'text-brand-400',
    selectorBg:   'bg-brand-500/15 border-brand-500/40 text-brand-300',
    emoji:        '💳',
  },
}

// ── Schema ───────────────────────────────────────────────────────
const schema = z.object({
  tipo:              z.enum(['ingreso', 'gasto', 'ahorro', 'pago_deuda', 'transferencia', 'pago_tarjeta']),
  fecha:             z.string().min(1, 'Requerido'),
  monto:             z.coerce.number().positive('Debe ser mayor a 0'),
  categoria_id:      z.string().optional(),
  subcategoria_id:   z.string().optional(),
  cuenta_id:         z.string().min(1, 'Selecciona una cuenta'),
  cuenta_destino_id: z.string().optional(),
  nota:              z.string().optional(),
  comercio:          z.string().optional()
}).superRefine((data, ctx) => {
  if (data.tipo !== 'transferencia' && data.tipo !== 'pago_deuda' && data.tipo !== 'pago_tarjeta' && !data.categoria_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona una categoría', path: ['categoria_id'] })
  }
  if ((data.tipo === 'transferencia' || data.tipo === 'pago_tarjeta') && !data.cuenta_destino_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona la tarjeta de crédito', path: ['cuenta_destino_id'] })
  }
  if (
    (data.tipo === 'transferencia' || data.tipo === 'pago_tarjeta') &&
    data.cuenta_id && data.cuenta_destino_id &&
    data.cuenta_id === data.cuenta_destino_id
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Las cuentas deben ser distintas', path: ['cuenta_destino_id'] })
  }
})

type FormValues = z.infer<typeof schema>
type Paso = 'principal' | 'detalles'

const TIPOS: { value: TipoMovimiento; label: string; emoji: string }[] = [
  { value: 'ingreso',       label: 'Ingreso',   emoji: '💰' },
  { value: 'gasto',         label: 'Gasto',     emoji: '💸' },
  { value: 'transferencia', label: 'Mover',     emoji: '🔄' },
  { value: 'pago_tarjeta',  label: 'Pag. tarjeta', emoji: '💳' },
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
  const [tipo,            setTipo]            = useState<TipoMovimiento>(defaultTipo)
  const [paso,            setPaso]            = useState<Paso>('principal')
  const [pagoDeuda,       setPagoDeuda]       = useState(false)
  const [cuotasTotal,     setCuotasTotal]     = useState(1)
  const [primeraYaPagada, setPrimeraYaPagada] = useState(false)
  const [comisionCuota,   setComisionCuota]   = useState(0)
  const [paraTercero,           setParaTercero]           = useState(false)
  const [terceroNombre,         setTerceroNombre]         = useState('')
  const [fechaVencimientoCobro, setFechaVencimientoCobro] = useState('')
  const [fondosTercero,         setFondosTercero]         = useState(false)
  const [comprobanteUrl,  setComprobante]     = useState<string | null>(null)
  const [contextoPago,       setContextoPago]       = useState<ContextoPago | null>(null)
  const [deudaVinculada,     setDeudaVinculada]     = useState<string | null>(null)
  const [compromisoVinculado, setCompromisoVinculado] = useState<string | null>(null)

  const { data: cuentas }       = useCuentas()
  const { data: categorias }    = useCategoriasByTipo(tipoToCategoriaTipo(tipo))
  const { data: deudas }        = useDeudas()
  const { data: suscripciones } = useSuscripciones()
  const createMutation            = useCreateMovimiento()
  const updateMutation            = useUpdateMovimiento()
  const createCuotaMutation       = useCreateCuota()
  const crearGastoTerceroMutation = useCrearGastoTercero()

  const {
    register, handleSubmit, watch, reset, setValue,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: defaultTipo, fecha: todayISO(), monto: 0 }
  })

  const selectedCategoriaId = watch('categoria_id')
  const selectedCuentaId    = watch('cuenta_id')
  const selectedDestId      = watch('cuenta_destino_id')
  const monto               = Number(watch('monto') ?? 0)

  const cuentaOrigen  = (cuentas ?? []).find(c => c.id === selectedCuentaId)
  const cuentaDest    = (cuentas ?? []).find(c => c.id === selectedDestId)
  const esTarjeta     = cuentaOrigen?.tipo === 'credito'

  const tipoReal: TipoMovimiento = tipo === 'gasto' && pagoDeuda ? 'pago_deuda' : tipo
  const theme = TIPO_THEME[tipoReal] ?? TIPO_THEME.gasto

  const mostrarCuotas    = tipo === 'gasto' && esTarjeta && !editingMovimiento
  const mostrarTercero   = tipo === 'gasto' && !editingMovimiento
  const mostrarFondos    = tipo === 'ingreso' && !editingMovimiento
  const mostrarTransf    = tipo === 'transferencia' || tipo === 'pago_tarjeta'
  const mostrarCategoria = tipo !== 'transferencia' && tipo !== 'pago_tarjeta' && !pagoDeuda

  const montoCuota     = monto > 0 && cuotasTotal >= 1 ? Math.ceil(monto / cuotasTotal) : 0
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
    setFondosTercero(false)
    setPagoDeuda(false)
    setContextoPago(null)
    setDeudaVinculada(null)
    setCompromisoVinculado(null)

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

  useEffect(() => {
    if (!editingMovimiento && !duplicateFrom) {
      setValue('categoria_id', '')
      setValue('subcategoria_id', '')
    }
  }, [tipo, pagoDeuda, setValue, editingMovimiento, duplicateFrom])

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
  async function submitForm(data: FormValues, skipDetalles = false) {
    const mostrarContexto = tipoReal === 'pago_tarjeta' || tipoReal === 'pago_deuda'

    const formData = {
      tipo:              tipoReal,
      fecha:             data.fecha,
      monto:             data.monto,
      comercio:          skipDetalles ? undefined : (data.comercio?.trim() || undefined),
      categoria_id:      mostrarCategoria ? (data.categoria_id ?? '') : '',
      subcategoria_id:   mostrarCategoria ? data.subcategoria_id : undefined,
      cuenta_id:         data.cuenta_id,
      cuenta_destino_id: mostrarTransf ? data.cuenta_destino_id : undefined,
      nota:              skipDetalles ? undefined : data.nota,
      comprobante_url:   skipDetalles ? null : comprobanteUrl,
      comision:          mostrarCuotas ? comisionCuota : 0,
      para_tercero:      skipDetalles ? false : (mostrarTercero ? paraTercero : false),
      tercero_nombre:    skipDetalles ? undefined : (mostrarTercero && paraTercero && terceroNombre.trim()
        ? terceroNombre.trim()
        : undefined),
      fondos_tercero:    skipDetalles ? false : (mostrarFondos ? fondosTercero : false),
      contexto_pago:     (!skipDetalles && mostrarContexto) ? contextoPago ?? undefined : undefined,
      deuda_id:          (!skipDetalles && mostrarContexto) ? deudaVinculada ?? undefined : undefined,
      compromiso_id:     (!skipDetalles && tipo === 'gasto' && !pagoDeuda) ? compromisoVinculado ?? undefined : undefined,
    }

    const cuotaPayload = {
      cuenta_id:              data.cuenta_id,
      nombre:                 data.comercio?.trim() || data.nota?.trim() || selectedCategoria?.nombre || 'Compra',
      emoji:                  selectedCategoria?.emoji ?? undefined,
      monto_total:            data.monto,
      cuotas_total:           cuotasTotal,
      cuotas_pagadas_inicial: primeraYaPagada ? 1 : 0,
      monto_cuota:            montoCuota,
      comision:               comisionCuota,
      para_tercero:           skipDetalles ? false : paraTercero,
      tercero_nombre:         !skipDetalles && paraTercero && terceroNombre.trim() ? terceroNombre.trim() : undefined,
      interes:                0,
      fecha_inicio:           data.fecha
    }

    try {
      if (editingMovimiento) {
        await updateMutation.mutateAsync({ id: editingMovimiento.id, original: editingMovimiento, form: formData })
      } else if (tipoReal === 'gasto' && !skipDetalles && paraTercero) {
        // Ruta atómica: crea movimiento + saldo + cuenta_por_cobrar en una transacción
        await crearGastoTerceroMutation.mutateAsync({
          fecha:            data.fecha,
          categoria_id:     formData.categoria_id || null,
          subcategoria_id:  formData.subcategoria_id || null,
          cuenta_id:        data.cuenta_id,
          monto:            data.monto,
          comercio:         formData.comercio || null,
          nota:             formData.nota || null,
          comprobante_url:  comprobanteUrl,
          comision:         mostrarCuotas ? comisionCuota : 0,
          persona:          terceroNombre.trim() || 'Sin nombre',
          descripcion:      formData.comercio?.trim() || formData.nota?.trim() || null,
          fecha_vencimiento: fechaVencimientoCobro || null
        })
        if (registrarCuota) await createCuotaMutation.mutateAsync(cuotaPayload)
      } else {
        await createMutation.mutateAsync(formData)
        if (registrarCuota) await createCuotaMutation.mutateAsync(cuotaPayload)
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
    setFechaVencimientoCobro('')
    setFondosTercero(false)
    setPagoDeuda(false)
    setContextoPago(null)
    setDeudaVinculada(null)
    setCompromisoVinculado(null)
    setPaso('principal')
    onClose()
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || createCuotaMutation.isPending || crearGastoTerceroMutation.isPending

  const title = editingMovimiento ? 'Editar movimiento'
    : duplicateFrom ? 'Duplicar movimiento'
    : paso === 'detalles' ? 'Más detalles'
    : 'Nuevo movimiento'

  // ── Clases reutilizables ─────────────────────────────────────
  const inputDark = 'bg-night-3 border-night-border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500'
  const labelDark = 'text-xs font-medium text-slate-400'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} theme="dark" accent={TIPO_ACCENT_HEX[tipoReal]}>

      {/* Volver — paso detalles */}
      {paso === 'detalles' && (
        <button
          type="button"
          onClick={() => setPaso('principal')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-3 -mt-1 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </button>
      )}

      {/* ════════════════════════════════════════════════════
          PASO 1 — PRINCIPAL
      ════════════════════════════════════════════════════ */}
      {paso === 'principal' && (
        <form onSubmit={handleSubmit(() => setPaso('detalles'))} className="space-y-4">

          {/* Selector de tipo */}
          {!editingMovimiento && (
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-night-0 rounded-2xl border border-night-border">
              {TIPOS.map(t => {
                const th = TIPO_THEME[t.value as keyof typeof TIPO_THEME]
                const isActive = tipo === t.value && (t.value !== 'gasto' || !pagoDeuda)
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setTipo(t.value)
                      setValue('tipo', t.value)
                      setPagoDeuda(false)
                    }}
                    className={[
                      'flex flex-col items-center py-2.5 px-1 rounded-xl transition-all text-[10px] font-semibold border leading-tight',
                      isActive
                        ? `${th.selectorBg} ${th.glow}`
                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
                    ].join(' ')}
                  >
                    <span className="text-base mb-0.5">{t.emoji}</span>
                    {t.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Toggle Pago de deuda */}
          {tipo === 'gasto' && !editingMovimiento && (
            <button
              type="button"
              onClick={() => setPagoDeuda(v => !v)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all',
                pagoDeuda
                  ? 'border-xp-500/40 bg-xp-500/10 text-xp-300'
                  : 'border-night-border bg-night-3 text-slate-500 hover:border-brand-500/30 hover:text-slate-300'
              ].join(' ')}
            >
              <span className="text-base">🏦</span>
              <span className="flex-1 text-left">
                {pagoDeuda ? 'Modo: Pago de deuda activo' : 'Registrar como pago de deuda'}
              </span>
              <div className={[
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                pagoDeuda ? 'bg-xp-500 border-xp-500' : 'border-slate-600'
              ].join(' ')}>
                {pagoDeuda && <span className="text-night-0 text-[10px] font-bold">✓</span>}
              </div>
            </button>
          )}

          {/* Monto — protagonista visual */}
          <div className="text-center py-2">
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${theme.accent}`}>
              {theme.emoji} {pagoDeuda ? 'Pago de deuda' : tipo === 'transferencia' ? 'Mover dinero' : tipo === 'pago_tarjeta' ? 'Pago a tarjeta' : tipo}
            </p>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${theme.monto} opacity-60`}>$</span>
              <input
                {...register('monto')}
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={[
                  'w-full h-16 pl-9 pr-4 text-center text-4xl font-bold rounded-2xl border-2 bg-night-0 outline-none transition-all',
                  theme.monto,
                  errors.monto
                    ? 'border-danger-500/60 focus:border-danger-500'
                    : `border-night-border focus:${theme.border} focus:shadow-${theme.glow.replace('shadow-', '')}`
                ].join(' ')}
              />
            </div>
            {errors.monto && (
              <p className="text-xs text-danger-400 mt-1.5">{errors.monto.message}</p>
            )}
          </div>

          {/* Categoría — selector visual RPG */}
          {mostrarCategoria && (
            <CategoryPicker
              categories={categorias ?? []}
              selectedId={selectedCategoriaId ?? ''}
              selectedSubId={watch('subcategoria_id') ?? ''}
              onSelect={id => setValue('categoria_id', id, { shouldValidate: true })}
              onSelectSub={id => setValue('subcategoria_id', id)}
              error={errors.categoria_id?.message}
              tipoColor={TIPO_ACCENT_HEX[tipoReal]}
            />
          )}

          {/* Cuenta */}
          <AccountPicker
            cuentas={cuentas ?? []}
            selectedId={selectedCuentaId ?? ''}
            onChange={id => setValue('cuenta_id', id, { shouldValidate: true })}
            label={mostrarTransf ? 'Cuenta origen' : 'Cuenta'}
            error={errors.cuenta_id?.message}
            exclude={['inversion']}
          />

          {/* Transferencia / Pago tarjeta — cuenta destino + preview */}
          {mostrarTransf && (
            <>
              <AccountPicker
                cuentas={(tipo === 'pago_tarjeta'
                  ? (cuentas ?? []).filter(c => c.tipo === 'credito' && c.activa)
                  : (cuentas ?? []).filter(c => c.activa && c.id !== selectedCuentaId && c.tipo !== 'inversion')
                )}
                selectedId={selectedDestId ?? ''}
                onChange={id => setValue('cuenta_destino_id', id, { shouldValidate: true })}
                label={tipo === 'pago_tarjeta' ? 'Tarjeta de crédito a pagar' : 'Cuenta destino'}
                error={errors.cuenta_destino_id?.message}
              />
              {cuentaOrigen && cuentaDest && monto > 0 && (
                <div className={`rounded-xl border p-3 space-y-2 ${tipo === 'pago_tarjeta' ? 'border-brand-500/20 bg-brand-500/5' : 'border-mover-500/20 bg-mover-500/5'}`}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{cuentaOrigen.nombre}</span>
                    <span>
                      <span className="text-slate-600 line-through mr-2">{formatCLP(cuentaOrigen.saldo_actual)}</span>
                      <span className="font-semibold text-gasto-400">{formatCLP(cuentaOrigen.saldo_actual - monto)}</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{cuentaDest.nombre}</span>
                    <span>
                      <span className="text-slate-600 line-through mr-2">{formatCLP(cuentaDest.saldo_actual)}</span>
                      <span className="font-semibold text-ingreso-400">{formatCLP(cuentaDest.saldo_actual + monto)}</span>
                    </span>
                  </div>
                  {tipo === 'pago_tarjeta' && cuentaDest.limite && (
                    <p className="text-[10px] text-brand-400/70">
                      Cupo disponible después: {formatCLP(cuentaDest.limite + (cuentaDest.saldo_actual + monto))}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Cuotas — tarjeta crédito */}
          {mostrarCuotas && (
            <div className={`rounded-2xl border ${theme.border} bg-night-2 overflow-hidden`}>
              <div className={`flex items-center gap-2 px-4 pt-3 pb-2 border-b ${theme.border}`}>
                <span className="text-base">💳</span>
                <p className={`text-xs font-semibold ${theme.accent}`}>Compra en tarjeta de crédito</p>
              </div>
              <div className="px-4 pb-4 pt-3 space-y-3">

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelDark}>N° cuotas</label>
                    <input
                      type="number" inputMode="numeric" min={1}
                      value={cuotasTotal}
                      onChange={e => setCuotasTotal(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full mt-1 h-10 px-3 rounded-xl border text-sm outline-none text-center font-bold ${inputDark}`}
                    />
                  </div>
                  <div>
                    <label className={labelDark}>$ Cuota</label>
                    <div className={`mt-1 h-10 px-2 rounded-xl border ${theme.border} bg-night-3 flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${theme.accent}`}>
                        {montoCuota > 0 ? formatCLP(montoCuota) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Radio primera cuota */}
                <div>
                  <label className={`${labelDark} block mb-1.5`}>Primera cuota</label>
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
                          'py-2 rounded-xl border text-xs font-semibold transition-all',
                          primeraYaPagada === opt.value
                            ? `${theme.border} ${theme.bgActive} ${theme.accent} ${theme.glow}`
                            : 'border-night-border bg-night-3 text-slate-500 hover:border-brand-500/30'
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comisión */}
                <div>
                  <label className={labelDark}>Comisión / Impuesto <span className="text-slate-600">— opcional</span></label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <input
                      type="number" inputMode="numeric" min={0}
                      value={comisionCuota || ''}
                      placeholder="0"
                      onChange={e => setComisionCuota(parseFloat(e.target.value) || 0)}
                      className={`w-full h-10 pl-7 pr-4 rounded-xl border text-sm outline-none ${inputDark}`}
                    />
                  </div>
                </div>

                {/* Resumen cuotas */}
                <div className={`p-2.5 rounded-xl border ${theme.border} bg-night-0 text-xs ${theme.accent}`}>
                  {cuotasTotal === 1 ? (
                    <>💳 <strong>Pago único</strong>
                      {comisionCuota > 0 && <> · costo real <strong>{formatCLP(monto + comisionCuota)}</strong></>}
                      {primeraYaPagada && <> · ya pagada</>}
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

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-11 rounded-2xl border border-night-border bg-night-3 text-slate-400 text-sm font-semibold hover:bg-night-2 hover:text-slate-300 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={[
                'flex-1 h-11 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-all',
                tipo === 'ingreso'       ? 'bg-ingreso-500 hover:bg-ingreso-600 shadow-glow-ingreso' :
                tipo === 'transferencia' ? 'bg-mover-500 hover:bg-mover-600 shadow-glow-mover' :
                pagoDeuda               ? 'bg-xp-500 hover:bg-xp-600 text-night-0' :
                                          'bg-gasto-500 hover:bg-gasto-600 shadow-glow-gasto'
              ].join(' ')}
            >
              Más detalles
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Guardar rápido */}
          <button
            type="button"
            onClick={handleSubmit(data => submitForm(data, true))}
            disabled={isLoading}
            className="w-full text-center text-xs text-slate-600 hover:text-slate-400 py-1 transition-colors disabled:opacity-40"
          >
            {isLoading ? 'Guardando…' : 'Guardar sin detalles adicionales'}
          </button>
        </form>
      )}

      {/* ════════════════════════════════════════════════════
          PASO 2 — MÁS DETALLES
      ════════════════════════════════════════════════════ */}
      {paso === 'detalles' && (
        <form onSubmit={handleSubmit(data => submitForm(data, false))} className="space-y-4">

          {/* Banner de contexto */}
          <div className={`rounded-xl border ${theme.border} bg-night-0 px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{theme.emoji}</span>
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme.accent}`}>
                  {pagoDeuda ? 'Pago de deuda' : tipo}
                </p>
                <p className={`text-lg font-bold ${theme.monto}`}>
                  {monto > 0 ? formatCLP(monto) : '—'}
                </p>
              </div>
            </div>
            {cuentaOrigen && (
              <p className="text-xs text-slate-500">{cuentaOrigen.nombre}</p>
            )}
          </div>

          {/* Contexto de pago — solo para pago_tarjeta y pago_deuda */}
          {(tipoReal === 'pago_tarjeta' || tipoReal === 'pago_deuda') && (
            <ContextoPagoSelector
              contexto={contextoPago}
              deudaId={deudaVinculada}
              deudas={deudas ?? []}
              onContexto={setContextoPago}
              onDeudaId={setDeudaVinculada}
            />
          )}

          {/* Fecha */}
          <div>
            <label className={labelDark}>Fecha</label>
            <input
              {...register('fecha')}
              type="date"
              className={`w-full mt-1 h-11 px-3 rounded-xl border text-sm outline-none ${inputDark} ${errors.fecha ? 'border-danger-500/60' : ''}`}
            />
            {errors.fecha && <p className="text-xs text-danger-400 mt-1">{errors.fecha.message}</p>}
          </div>

          {/* Comercio */}
          <div>
            <label className={labelDark}>Comercio / Tienda <span className="text-slate-600">(opcional)</span></label>
            <input
              {...register('comercio')}
              type="text"
              placeholder="Ej: Falabella, Uber, Netflix…"
              className={`w-full mt-1 h-11 px-3 rounded-xl border text-sm outline-none ${inputDark}`}
            />
          </div>

          {/* Nota */}
          <div>
            <label className={labelDark}>Nota <span className="text-slate-600">(opcional)</span></label>
            <input
              {...register('nota')}
              type="text"
              placeholder="Ej: Compra de cumpleaños, factura febrero…"
              className={`w-full mt-1 h-11 px-3 rounded-xl border text-sm outline-none ${inputDark}`}
            />
          </div>

          {/* Para tercero */}
          {mostrarTercero && (
            <div className={[
              'rounded-2xl border transition-all',
              paraTercero
                ? 'border-xp-500/40 bg-xp-500/8'
                : 'border-night-border bg-night-3'
            ].join(' ')}>
              <button
                type="button"
                onClick={() => setParaTercero(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3"
              >
                <div className={[
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  paraTercero ? 'bg-xp-500 border-xp-500' : 'border-slate-600'
                ].join(' ')}>
                  {paraTercero && <span className="text-night-0 text-[10px] font-bold">✓</span>}
                </div>
                <div className="flex items-center gap-2 flex-1 text-left">
                  <Users className={`h-4 w-4 ${paraTercero ? 'text-warning-400' : 'text-slate-600'}`} />
                  <div>
                    <p className={`text-xs font-semibold ${paraTercero ? 'text-warning-300' : 'text-slate-400'}`}>
                      Compra para otra persona
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Se excluirá de tus gastos y presupuestos
                    </p>
                  </div>
                </div>
              </button>
              {paraTercero && (
                <div className="px-4 pb-4 border-t border-warning-500/20 pt-3 space-y-3">
                  <div>
                    <label className={labelDark}>¿Para quién?</label>
                    <input
                      type="text"
                      value={terceroNombre}
                      onChange={e => setTerceroNombre(e.target.value)}
                      placeholder="Ej: Mamá, Pareja, Juan…"
                      maxLength={60}
                      className={`w-full mt-1 h-10 px-3 rounded-xl border border-warning-500/30 text-sm outline-none ${inputDark}`}
                    />
                  </div>
                  <div>
                    <label className={labelDark}>
                      ¿Cuándo te devuelve?{' '}
                      <span className="text-slate-600 font-normal normal-case">(opcional)</span>
                    </label>
                    <input
                      type="date"
                      value={fechaVencimientoCobro}
                      onChange={e => setFechaVencimientoCobro(e.target.value)}
                      className={`w-full mt-1 h-10 px-3 rounded-xl border border-warning-500/30 text-sm outline-none ${inputDark}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fondos de tercero — ingreso */}
          {mostrarFondos && (
            <div className={[
              'rounded-2xl border transition-all',
              fondosTercero
                ? 'border-ingreso-500/40 bg-ingreso-500/8'
                : 'border-night-border bg-night-3'
            ].join(' ')}>
              <button
                type="button"
                onClick={() => setFondosTercero(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3"
              >
                <div className={[
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  fondosTercero ? 'bg-ingreso-500 border-ingreso-500' : 'border-slate-600'
                ].join(' ')}>
                  {fondosTercero && <span className="text-night-0 text-[10px] font-bold">✓</span>}
                </div>
                <div className="flex items-center gap-2 flex-1 text-left">
                  <Users className={`h-4 w-4 ${fondosTercero ? 'text-ingreso-400' : 'text-slate-600'}`} />
                  <div>
                    <p className={`text-xs font-semibold ${fondosTercero ? 'text-ingreso-300' : 'text-slate-400'}`}>
                      Fondos de tercero
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Ingreso recibido en nombre de otra persona
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Vincular a compromiso — solo gastos manuales */}
          {tipo === 'gasto' && !pagoDeuda && !editingMovimiento && (
            (() => {
              const activasSusc = (suscripciones ?? []).filter(s => s.activa)
              if (activasSusc.length === 0) return null
              return (
                <div>
                  <label className={labelDark}>
                    ¿Corresponde a un compromiso?{' '}
                    <span className="text-slate-600 font-normal normal-case">(opcional)</span>
                  </label>
                  <div className="relative mt-1">
                    <select
                      value={compromisoVinculado ?? ''}
                      onChange={e => setCompromisoVinculado(e.target.value || null)}
                      className={`w-full h-11 rounded-xl border pl-3 pr-9 text-sm appearance-none outline-none transition-all ${inputDark}`}
                    >
                      <option value="">Sin vincular a compromiso</option>
                      {activasSusc.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.emoji ?? '🔄'} {s.nombre} — {s.frecuencia}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">▾</span>
                  </div>
                  {compromisoVinculado && (
                    <p className="text-[10px] text-mover-400 mt-1">
                      ↳ Este gasto se vinculará al historial del compromiso seleccionado
                    </p>
                  )}
                </div>
              )
            })()
          )}

          {/* Comprobante */}
          <FileUploader value={comprobanteUrl} onChange={setComprobante} />

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPaso('principal')}
              className="flex-1 h-11 rounded-2xl border border-night-border bg-night-3 text-slate-400 text-sm font-semibold hover:bg-night-2 hover:text-slate-300 transition-all"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={[
                'flex-1 h-11 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40',
                tipo === 'ingreso'       ? 'bg-ingreso-500 hover:bg-ingreso-600 shadow-glow-ingreso' :
                tipo === 'transferencia' ? 'bg-mover-500 hover:bg-mover-600 shadow-glow-mover' :
                pagoDeuda               ? 'bg-xp-500 hover:bg-xp-600 text-night-0' :
                                          'bg-gasto-500 hover:bg-gasto-600 shadow-glow-gasto'
              ].join(' ')}
            >
              {isLoading
                ? <><span className="animate-spin">◌</span> Guardando…</>
                : editingMovimiento ? 'Guardar cambios' : 'Guardar'
              }
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
