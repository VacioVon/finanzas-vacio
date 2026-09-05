import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AccountPicker } from '@/components/ui/AccountPicker'
import { useCuentas } from '@/hooks/useCuentas'
import { useRegistrarPagoCompromiso } from '@/hooks/useSuscripciones'
import { todayISO } from '@/utils/dates'
import { formatCLP } from '@/utils/currency'
import type { Suscripcion, Cuenta } from '@/types/app.types'

type Paso = 'formulario' | 'confirmar' | 'exito'

const schema = z.object({
  cuenta_id: z.string().min(1, 'Selecciona una cuenta'),
  monto:     z.coerce.number().positive('Debe ser mayor a 0'),
  fecha:     z.string().min(1, 'Requerido'),
  nota:      z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  isOpen:     boolean
  onClose:    () => void
  compromiso: Suscripcion | null
}

export function PagarCompromisoModal({ isOpen, onClose, compromiso }: Props) {
  const { data: cuentas }   = useCuentas()
  const pagarMutation        = useRegistrarPagoCompromiso()
  const [paso, setPaso]      = useState<Paso>('formulario')
  const [error, setError]    = useState<string | null>(null)
  const [cuentaFinal, setCuentaFinal] = useState<Cuenta | null>(null)
  const [saldoAntes, setSaldoAntes]   = useState<number>(0)
  const [montoFinal, setMontoFinal]   = useState<number>(0)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha:     todayISO(),
      monto:     compromiso?.monto ?? 0,
      cuenta_id: compromiso?.cuenta_id ?? '',
    },
  })

  const cuentaIdSeleccionada = watch('cuenta_id')
  const montoActual          = watch('monto')
  const esEstimado           = compromiso?.monto_tipo === 'estimado'

  // Re-inicializar cuando cambia el compromiso o se abre
  useEffect(() => {
    if (!isOpen) return
    setPaso('formulario')
    setError(null)
    reset({
      fecha:     todayISO(),
      monto:     compromiso?.monto ?? 0,
      cuenta_id: compromiso?.cuenta_id ?? '',
    })
  }, [isOpen, compromiso, reset])

  function handleClose() {
    setPaso('formulario')
    setError(null)
    reset()
    onClose()
  }

  // Paso 1 → 2: validar y mostrar confirmación
  function irAConfirmar(data: FormValues) {
    const cuenta = (cuentas ?? []).find(c => c.id === data.cuenta_id) ?? null
    setCuentaFinal(cuenta)
    setSaldoAntes(cuenta?.saldo_actual ?? 0)
    setMontoFinal(data.monto)
    setPaso('confirmar')
  }

  // Paso 2 → ejecutar pago → paso 3
  async function ejecutarPago() {
    if (!compromiso || !cuentaFinal) return
    setError(null)
    try {
      const data = {
        cuenta_id: cuentaFinal.id,
        monto:     montoFinal,
        fecha:     watch('fecha'),
        nota:      watch('nota') || undefined,
      }
      await pagarMutation.mutateAsync({ compromiso, pago: data })
      setPaso('exito')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago')
      setPaso('formulario')
    }
  }

  if (!compromiso) return null

  const cuentasDisponibles = (cuentas ?? []).filter(c => c.activa && c.tipo !== 'credito')
  const saldoDespues       = saldoAntes - montoFinal
  const saldoInsuficiente  = saldoDespues < 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={paso === 'exito' ? 'Pago registrado' : 'Pagar compromiso'}
      theme="dark"
      accent="#00C2CB"
    >

      {/* ── PASO 1: Formulario ───────────────────────────────────── */}
      {paso === 'formulario' && (
        <form onSubmit={handleSubmit(irAConfirmar)} className="space-y-4">

          {/* Info del compromiso */}
          <div
            className="flex items-center gap-3 p-3 rounded-2xl border"
            style={{
              background:   'linear-gradient(135deg, #00C2CB0D 0%, #2C2A38 100%)',
              borderColor:  '#00C2CB25',
            }}
          >
            <div
              className="size-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: '#00C2CB18', boxShadow: '0 0 12px #00C2CB30' }}
            >
              {compromiso.emoji ?? '🔄'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{compromiso.nombre}</p>
              {esEstimado && (
                <p className="text-[11px] text-slate-500 mt-0.5">Monto estimado — edita si el valor real difiere</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-white tabular-nums">
                {esEstimado ? '~' : ''}{formatCLP(compromiso.monto)}
              </p>
              <p className="text-[10px] text-slate-500">referencia</p>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1.5">
              {esEstimado ? 'Monto real' : 'Monto del pago'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 pointer-events-none">$</span>
              <input
                {...register('monto')}
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={[
                  'w-full h-14 pl-10 pr-4 text-center text-2xl font-bold tabular-nums rounded-2xl border bg-night-3 text-white',
                  'outline-none focus:ring-2 focus:ring-mover-500/50 focus:border-mover-500 placeholder:text-slate-600',
                  errors.monto ? 'border-gasto-500' : 'border-night-border',
                ].join(' ')}
              />
            </div>
            {errors.monto && <p className="text-xs text-gasto-400 mt-1">{errors.monto.message}</p>}
          </div>

          {/* Cuenta */}
          <AccountPicker
            label="Pagar desde"
            cuentas={cuentasDisponibles}
            selectedId={cuentaIdSeleccionada}
            onChange={id => setValue('cuenta_id', id, { shouldValidate: true })}
            error={errors.cuenta_id?.message}
          />

          {/* Fecha */}
          <Input
            label="Fecha del pago"
            type="date"
            {...register('fecha')}
            error={errors.fecha?.message}
          />

          {/* Nota */}
          <Input
            label="Nota (opcional)"
            placeholder="Referencia, número de boleta…"
            {...register('nota')}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-gasto-500/10 border border-gasto-500/25">
              <AlertCircle className="h-4 w-4 text-gasto-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gasto-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="primary" fullWidth>Continuar</Button>
          </div>
        </form>
      )}

      {/* ── PASO 2: Confirmación ─────────────────────────────────── */}
      {paso === 'confirmar' && cuentaFinal && (
        <div className="space-y-5">

          {/* Resumen de la operación */}
          <div className="rounded-2xl border border-night-border/60 overflow-hidden">
            <div className="px-4 py-3 bg-night-2/60">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Resumen del pago</p>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Compromiso */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Compromiso</span>
                <span className="text-sm font-semibold text-white">
                  {compromiso.emoji ?? '🔄'} {compromiso.nombre}
                </span>
              </div>

              {/* Monto */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Monto a pagar</span>
                <span className="text-lg font-bold tabular-nums text-gasto-400">
                  −{formatCLP(montoFinal)}
                </span>
              </div>

              {/* Cuenta */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Desde</span>
                <span className="text-sm font-semibold text-white">{cuentaFinal.nombre}</span>
              </div>

              <div className="border-t border-night-border/40 pt-3 mt-1">
                {/* Balance antes → después */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Saldo resultante</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-slate-400">{formatCLP(saldoAntes)}</span>
                    <ArrowRight className="h-3 w-3 text-slate-600 flex-shrink-0" />
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: saldoInsuficiente ? '#F4645F' : '#10D97F' }}
                    >
                      {formatCLP(saldoDespues)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencia saldo insuficiente */}
          {saldoInsuficiente && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-xp-500/10 border border-xp-500/25">
              <AlertCircle className="h-4 w-4 text-xp-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-xp-300">
                El saldo de <strong>{cuentaFinal.nombre}</strong> quedaría negativo. El pago se registrará igual.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-gasto-500/10 border border-gasto-500/25">
              <AlertCircle className="h-4 w-4 text-gasto-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gasto-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setPaso('formulario')}>
              Volver
            </Button>
            <Button
              type="button"
              variant="primary"
              fullWidth
              loading={pagarMutation.isPending}
              onClick={ejecutarPago}
            >
              Confirmar pago
            </Button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Éxito ───────────────────────────────────────── */}
      {paso === 'exito' && cuentaFinal && (
        <div className="space-y-5 text-center">

          {/* Ícono de éxito */}
          <div className="flex justify-center pt-2">
            <div
              className="size-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#10D97F18', boxShadow: '0 0 24px #10D97F30' }}
            >
              <CheckCircle2 className="h-8 w-8 text-ingreso-400" />
            </div>
          </div>

          <div>
            <p className="text-base font-bold text-white">Pago registrado</p>
            <p className="text-sm text-slate-400 mt-1">
              {compromiso.emoji ?? '🔄'} {compromiso.nombre} — {formatCLP(montoFinal)}
            </p>
          </div>

          {/* Cambio de saldo */}
          <div
            className="flex items-center justify-center gap-3 p-4 rounded-2xl border"
            style={{ backgroundColor: '#10D97F08', borderColor: '#10D97F20' }}
          >
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">{cuentaFinal.nombre}</p>
              <p className="text-sm font-bold tabular-nums text-slate-400">{formatCLP(saldoAntes)}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-ingreso-500 flex-shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Nuevo saldo</p>
              <p className="text-sm font-bold tabular-nums text-ingreso-400">{formatCLP(saldoAntes - montoFinal)}</p>
            </div>
          </div>

          <Button type="button" variant="primary" fullWidth onClick={handleClose}>
            Listo
          </Button>
        </div>
      )}

    </Modal>
  )
}
