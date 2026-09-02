import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useCuentas } from '@/hooks/useCuentas'
import { useFuentesIngreso, useCreateIngresoRecurrente, useCreateFuenteIngreso } from '@/hooks/useIngresosRecurrentes'
import type { CreateIngresoRecurrenteForm, FrecuenciaIngreso } from '@/types/ingresos-recurrentes.types'

interface Props {
  onClose: () => void
}

const FRECUENCIAS: { value: FrecuenciaIngreso; label: string }[] = [
  { value: 'mensual',   label: 'Mensual'   },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal',   label: 'Semanal'   },
  { value: 'bimestral', label: 'Bimestral' },
]

const FIELD_CLASS = 'w-full bg-night-3 border border-night-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none placeholder-slate-600'

export function IngresoRecurrenteForm({ onClose }: Props) {
  const { data: cuentas = [] } = useCuentas()
  const { data: fuentes = [] } = useFuentesIngreso()
  const crear       = useCreateIngresoRecurrente()
  const crearFuente = useCreateFuenteIngreso()

  const [form, setForm] = useState<CreateIngresoRecurrenteForm>({
    nombre:          '',
    monto_esperado:  0,
    cuenta_id:       null,
    fuente_id:       null,
    frecuencia:      'mensual',
    dia_esperado:    1,
    tolerancia_dias: 0,
    tipo_fecha:      'fijo',
    nota:            '',
  })
  const [nuevaFuente,   setNuevaFuente]   = useState('')
  const [mostrarFuente, setMostrarFuente] = useState(false)
  const [error,         setError]         = useState('')

  function set<K extends keyof CreateIngresoRecurrenteForm>(k: K, v: CreateIngresoRecurrenteForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCrearFuente() {
    if (!nuevaFuente.trim()) return
    const f = await crearFuente.mutateAsync({ nombre: nuevaFuente.trim() })
    set('fuente_id', f.id)
    setNuevaFuente('')
    setMostrarFuente(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim())                           return setError('El nombre es requerido')
    if (form.monto_esperado <= 0)                      return setError('El monto debe ser mayor a 0')
    if (form.dia_esperado < 1 || form.dia_esperado > 31) return setError('Día inválido (1-31)')
    try {
      await crear.mutateAsync(form)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const ventanaMin = Math.max(1, form.dia_esperado - form.tolerancia_dias)
  const ventanaMax = form.dia_esperado + form.tolerancia_dias

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/*
        El form usa flex-col con max-h-[90dvh].
        - header: flex-shrink-0 (nunca se comprime)
        - scroll-body: flex-1 overflow-y-auto (único lugar que hace scroll)
        - footer: flex-shrink-0 + padding safe-area (siempre visible)
      */}
      <form
        onSubmit={handleSubmit}
        className={[
          'relative flex flex-col w-full max-w-sm',
          'bg-night-1 border border-night-border shadow-2xl',
          // Móvil: full-width bottom sheet redondeado arriba
          // Desktop (sm+): centrado con bordes completos
          'rounded-t-2xl sm:rounded-2xl',
          'max-h-[90dvh]',
        ].join(' ')}
      >

        {/* ── HEADER fijo ─────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-night-border/50">
          <div>
            <p className="text-base font-semibold text-white">Nuevo ingreso recurrente</p>
            <p className="text-[11px] text-slate-500">Sueldo, honorarios u otro pago esperado</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-night-3/50 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── SCROLL BODY ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* 1. Nombre */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Nombre</label>
            <input
              type="text"
              autoFocus
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej. Sueldo primera parte"
              className={`${FIELD_CLASS} focus:border-ingreso-500`}
            />
          </div>

          {/* 2. Monto */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Monto esperado</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.monto_esperado || ''}
              onChange={e => set('monto_esperado', parseFloat(e.target.value) || 0)}
              placeholder="650000"
              className={`${FIELD_CLASS} tabular-nums focus:border-ingreso-500`}
            />
          </div>

          {/* 3. Frecuencia */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Frecuencia</label>
            <div className="grid grid-cols-4 gap-1 bg-night-3/40 rounded-xl p-1">
              {FRECUENCIAS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => set('frecuencia', f.value)}
                  className={[
                    'py-2 rounded-lg text-[11px] font-semibold transition-all',
                    form.frecuencia === f.value
                      ? 'bg-night-2 text-slate-100 shadow'
                      : 'text-slate-500 hover:text-slate-400',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Fecha: tipo + día + tolerancia */}
          <div className="space-y-3">
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block">Fecha esperada</label>
            {/* Toggle fija / aproximada */}
            <div className="flex gap-1 bg-night-3/40 rounded-xl p-1">
              {(['fijo', 'aproximado'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { set('tipo_fecha', v); if (v === 'fijo') set('tolerancia_dias', 0) }}
                  className={[
                    'flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all',
                    form.tipo_fecha === v
                      ? 'bg-night-2 text-slate-100 shadow'
                      : 'text-slate-500 hover:text-slate-400',
                  ].join(' ')}
                >
                  {v === 'fijo' ? 'Fecha fija' : 'Aproximada'}
                </button>
              ))}
            </div>

            <div className={`grid gap-3 ${form.tipo_fecha === 'aproximado' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Día del mes</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1} max={31}
                  value={form.dia_esperado}
                  onChange={e => set('dia_esperado', parseInt(e.target.value) || 1)}
                  className={`${FIELD_CLASS} tabular-nums focus:border-ingreso-500`}
                />
              </div>
              {form.tipo_fecha === 'aproximado' && (
                <div>
                  <label className="text-[10px] text-slate-600 block mb-1">
                    Tolerancia (±días)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1} max={15}
                    value={form.tolerancia_dias}
                    onChange={e => set('tolerancia_dias', parseInt(e.target.value) || 1)}
                    className={`${FIELD_CLASS} tabular-nums focus:border-ingreso-500`}
                  />
                </div>
              )}
            </div>

            {form.tipo_fecha === 'aproximado' && form.tolerancia_dias > 0 && (
              <p className="text-[11px] text-ingreso-400/70 tabular-nums">
                Ventana de recepción: día {ventanaMin} – {ventanaMax}
              </p>
            )}
          </div>

          {/* 5. Cuenta destino */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Cuenta destino</label>
            <select
              value={form.cuenta_id ?? ''}
              onChange={e => set('cuenta_id', e.target.value || null)}
              className={`${FIELD_CLASS} focus:border-ingreso-500`}
            >
              <option value="">Sin cuenta específica</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* 6. Fuente de ingreso */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">
              Fuente <span className="normal-case font-normal text-slate-600">(opcional — agrupa pagos del mismo empleador)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={form.fuente_id ?? ''}
                onChange={e => set('fuente_id', e.target.value || null)}
                className={`flex-1 ${FIELD_CLASS} focus:border-brand-500`}
              >
                <option value="">Sin agrupar</option>
                {fuentes.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMostrarFuente(v => !v)}
                className="size-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-night-3 border border-night-border text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Nueva fuente"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {mostrarFuente && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={nuevaFuente}
                  onChange={e => setNuevaFuente(e.target.value)}
                  placeholder="Ej. Sueldo mensual"
                  className={`flex-1 ${FIELD_CLASS} focus:border-brand-500`}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCrearFuente() } }}
                />
                <button
                  type="button"
                  onClick={handleCrearFuente}
                  disabled={crearFuente.isPending}
                  className="px-3 py-2 rounded-xl bg-brand-500/20 text-brand-400 text-xs font-medium hover:bg-brand-500/30 disabled:opacity-50 transition-colors"
                >
                  Crear
                </button>
              </div>
            )}
          </div>

          {/* 7. Nota */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wide block mb-1.5">Nota <span className="normal-case font-normal text-slate-600">(opcional)</span></label>
            <input
              type="text"
              value={form.nota}
              onChange={e => set('nota', e.target.value)}
              placeholder="Ej. depósito con demora habitual"
              className={`${FIELD_CLASS} focus:border-brand-500`}
            />
          </div>
        </div>

        {/* ── FOOTER fijo ──────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 pt-3 pb-5 border-t border-night-border/50 bg-night-1 space-y-2.5"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {error && (
            <p className="text-xs text-gasto-400 bg-gasto-500/10 px-3 py-2 rounded-xl text-pretty">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-night-border text-slate-400 text-sm hover:bg-night-3/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crear.isPending}
              className="flex-1 py-2.5 rounded-xl bg-ingreso-500 text-night-0 text-sm font-semibold hover:bg-ingreso-400 disabled:opacity-50 transition-colors"
            >
              {crear.isPending ? 'Guardando…' : 'Guardar ingreso'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
