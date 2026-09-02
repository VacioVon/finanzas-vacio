import { useState } from 'react'
import { X, CheckCircle2, Clock, Ban } from 'lucide-react'
import { useConfirmarIngreso, usePosponerIngreso, useMarcarNoRecibido } from '@/hooks/useIngresosRecurrentes'
import type { IngresoPendienteHoy } from '@/types/ingresos-recurrentes.types'

interface Props {
  instancia: IngresoPendienteHoy
  onClose:   () => void
}

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function ConfirmarIngresoModal({ instancia, onClose }: Props) {
  const [vista,       setVista]       = useState<'principal' | 'posponer' | 'exito'>('principal')
  const [montoReal,   setMontoReal]   = useState(String(instancia.monto_esperado))
  const [fechaReal,   setFechaReal]   = useState(new Date().toISOString().slice(0, 10))
  const [nuevaFecha,  setNuevaFecha]  = useState(instancia.fecha_esperada)
  const [nota,        setNota]        = useState('')

  const confirmar = useConfirmarIngreso()
  const posponer  = usePosponerIngreso()
  const noRecibido = useMarcarNoRecibido()

  const montoNum = parseFloat(montoReal.replace(/[^\d.]/g, '')) || 0

  async function handleConfirmar() {
    if (montoNum <= 0) return
    await confirmar.mutateAsync({
      instanciaId: instancia.instancia_id,
      montoReal:   montoNum,
      fechaReal,
      nota:        nota || undefined,
    })
    setVista('exito')
  }

  async function handlePosponer() {
    await posponer.mutateAsync({
      instanciaId: instancia.instancia_id,
      nuevaFecha,
    })
    onClose()
  }

  async function handleNoRecibido() {
    await noRecibido.mutateAsync(instancia.instancia_id)
    onClose()
  }

  const loading = confirmar.isPending || posponer.isPending || noRecibido.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-night-1 border border-night-border rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-night-border/50">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-ingreso-400 mb-0.5">
              Ingreso esperado
            </p>
            <p className="text-base font-semibold text-white text-pretty">
              {instancia.nombre}
            </p>
            {instancia.fuente_nombre && (
              <p className="text-xs text-slate-500">{instancia.fuente_nombre}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-night-3/50 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Vista: éxito ── */}
        {vista === 'exito' && (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-12 text-ingreso-400" />
            <p className="text-lg font-semibold text-white">¡Ingreso registrado!</p>
            <p className="text-sm text-slate-400">
              {formatCLP(montoNum)} añadido el {formatFecha(fechaReal)}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-ingreso-500/20 text-ingreso-400 text-sm font-medium rounded-xl hover:bg-ingreso-500/30 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* ── Vista: posponer ── */}
        {vista === 'posponer' && (
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm text-slate-300">¿Cuándo lo esperas recibir?</p>
            <div>
              <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">
                Nueva fecha esperada
              </label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
                className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setVista('principal')}
                className="flex-1 py-2.5 rounded-xl border border-night-border text-slate-400 text-sm hover:bg-night-3/50 transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handlePosponer}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/30 disabled:opacity-50 transition-colors"
              >
                {loading ? '…' : 'Confirmar nueva fecha'}
              </button>
            </div>
          </div>
        )}

        {/* ── Vista: principal ── */}
        {vista === 'principal' && (
          <div className="px-5 py-5 space-y-4">
            {/* Monto esperado */}
            <div className="bg-night-3/40 rounded-xl p-4 text-center">
              <p className="text-[11px] text-slate-500 mb-1">Monto esperado</p>
              <p className="text-2xl font-bold text-ingreso-400 tabular-nums">
                {formatCLP(instancia.monto_esperado)}
              </p>
              {instancia.tipo_fecha === 'aproximado' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Ventana: {formatFecha(instancia.fecha_min)} – {formatFecha(instancia.fecha_max)}
                </p>
              )}
            </div>

            {/* Campos de confirmación */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">
                  Monto recibido
                </label>
                <input
                  type="number"
                  value={montoReal}
                  onChange={e => setMontoReal(e.target.value)}
                  placeholder={String(instancia.monto_esperado)}
                  className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ingreso-500 tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">
                  Fecha de recepción
                </label>
                <input
                  type="date"
                  value={fechaReal}
                  onChange={e => setFechaReal(e.target.value)}
                  className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ingreso-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Ej. depósito con demora"
                  className="w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ingreso-500 placeholder-slate-600"
                />
              </div>
            </div>

            {/* Acciones principales */}
            <button
              onClick={handleConfirmar}
              disabled={loading || montoNum <= 0}
              className="w-full py-3 rounded-xl bg-ingreso-500 text-night-0 text-sm font-bold hover:bg-ingreso-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-4" />
              {confirmar.isPending ? 'Registrando…' : 'Sí, lo recibí'}
            </button>

            {/* Acciones secundarias */}
            <div className="flex gap-2">
              <button
                onClick={() => setVista('posponer')}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-night-border text-slate-400 text-xs hover:bg-night-3/50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="size-3.5" />
                Cambiar fecha
              </button>
              <button
                onClick={handleNoRecibido}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-night-border text-slate-400 text-xs hover:bg-night-3/50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Ban className="size-3.5" />
                Aún no
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
