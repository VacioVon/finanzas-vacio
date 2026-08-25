import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PlanificacionForm } from './PlanificacionForm'
import { usePlanificaciones } from '@/hooks/usePlanificaciones'
import { formatCLP } from '@/utils/currency'
import type { Planificacion } from '@/types/app.types'

// ── Tipos para eventos comprometidos (suscripciones/cuotas/deudas/sueldo) ──
export interface EventoDia {
  id:        string
  tipo:      'suscripcion' | 'cuota' | 'deuda' | 'sueldo' | 'cobro_esperado'
  titulo:    string
  subtitulo?: string
  emoji?:    string
  monto:     number | null  // null = sueldo (monto desconocido)
}

const TIPO_COLOR = {
  sueldo:      { dot: 'bg-ingreso-500',  text: 'text-ingreso-400',  badge: 'bg-ingreso-500/15 border-ingreso-500/30'  },
  suscripcion: { dot: 'bg-mover-500',    text: 'text-mover-400',    badge: 'bg-mover-500/15 border-mover-500/30'      },
  cuota:       { dot: 'bg-brand-500',    text: 'text-brand-400',    badge: 'bg-brand-500/15 border-brand-500/30'      },
  deuda:          { dot: 'bg-gasto-500',          text: 'text-gasto-400',    badge: 'bg-gasto-500/15 border-gasto-500/30'      },
  cobro_esperado: { dot: 'border border-ingreso-500', text: 'text-ingreso-400', badge: 'bg-ingreso-500/10 border-ingreso-500/30'  },
}

const PLAN_COLOR: Record<Planificacion['tipo'], { dot: string; text: string; label: string }> = {
  gasto:   { dot: 'border-2 border-gasto-500',   text: 'text-gasto-400',   label: 'Gasto planificado'  },
  ingreso: { dot: 'border-2 border-ingreso-500', text: 'text-ingreso-400', label: 'Ingreso planificado' },
  ahorro:  { dot: 'border-2 border-ahorro-500',  text: 'text-ahorro-400',  label: 'Ahorro planificado' },
  mover:   { dot: 'border-2 border-mover-500',   text: 'text-mover-400',   label: 'Mover planificado'  },
}

interface Props {
  isOpen:    boolean
  onClose:   () => void
  fecha:     string   // 'YYYY-MM-DD'
  eventos:   EventoDia[]
}

export function DiaSheet({ isOpen, onClose, fecha, eventos }: Props) {
  const [mostrarFormPlan, setMostrarFormPlan] = useState(false)
  const [confirmando, setConfirmando]         = useState<string | null>(null)  // id de planificacion
  const { planificaciones, convertir, cancelar } = usePlanificaciones()

  const plansDia = planificaciones.filter(p => p.fecha === fecha)
  const tituloFecha = format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })

  async function handleConvertir(id: string) {
    await convertir.mutateAsync(id)
    setConfirmando(null)
  }

  async function handleCancelar(id: string) {
    await cancelar.mutateAsync(id)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={tituloFecha} theme="dark" size="md">
        <div className="space-y-4">

          {/* ── Eventos comprometidos ── */}
          {eventos.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Comprometido
              </p>
              <div className="space-y-2">
                {eventos.map(ev => {
                  const colors = TIPO_COLOR[ev.tipo]
                  return (
                    <div key={ev.id} className="flex items-center justify-between bg-night-2 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Dot sólido = comprometido */}
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <div>
                          <p className="text-sm text-white leading-tight">
                            {ev.emoji ? `${ev.emoji} ` : ''}{ev.titulo}
                          </p>
                          {ev.subtitulo && (
                            <p className="text-[10px] text-slate-500">{ev.subtitulo}</p>
                          )}
                        </div>
                      </div>
                      {ev.monto !== null
                        ? <span className={`text-sm font-semibold ${colors.text}`}>
                            −{formatCLP(ev.monto)}
                          </span>
                        : <span className="text-[10px] text-slate-500">Monto no configurado</span>
                      }
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Planificaciones ── */}
          <section>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Planificado
            </p>

            {plansDia.length === 0 && (
              <p className="text-xs text-slate-600 italic py-1">Sin planificaciones para este día</p>
            )}

            <div className="space-y-2">
              {plansDia.map(plan => {
                const colors = PLAN_COLOR[plan.tipo]
                const isConvirtiendo = convertir.isPending && confirmando === plan.id
                const isCancelando  = cancelar.isPending

                return (
                  <div key={plan.id} className="bg-night-2 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Dot outline = planificado */}
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 bg-transparent ${colors.dot}`} />
                        <div>
                          <p className="text-sm text-white leading-tight">
                            {plan.comercio || plan.descripcion || colors.label}
                          </p>
                          {plan.categoria && (
                            <p className="text-[10px] text-slate-500">
                              {plan.categoria.emoji} {plan.categoria.nombre}
                            </p>
                          )}
                          {plan.recurrencia && (
                            <p className="text-[10px] text-brand-500/70">↻ {plan.recurrencia.frecuencia}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${colors.text}`}>
                        {plan.tipo === 'ingreso' ? '+' : plan.tipo === 'mover' ? '⇄' : '−'}
                        {formatCLP(plan.monto)}
                      </span>
                    </div>

                    {/* Confirmación inline */}
                    {confirmando === plan.id ? (
                      <div className="border-t border-night-border/60 px-3 py-3 space-y-2">
                        <p className="text-xs text-slate-300">
                          ¿Confirmar {colors.label.toLowerCase()} de{' '}
                          <span className={`font-semibold ${colors.text}`}>{formatCLP(plan.monto)}</span>?
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Esto creará un movimiento real y actualizará tus saldos.
                        </p>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 py-1.5 text-xs rounded-lg bg-night-3 text-slate-400 hover:text-white transition-colors"
                            onClick={() => setConfirmando(null)}
                          >
                            Cancelar
                          </button>
                          <button
                            className="flex-1 py-1.5 text-xs rounded-lg bg-ingreso-500/20 text-ingreso-400 border border-ingreso-500/30 hover:bg-ingreso-500/30 transition-colors flex items-center justify-center gap-1.5"
                            onClick={() => handleConvertir(plan.id)}
                            disabled={isConvirtiendo}
                          >
                            {isConvirtiendo
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <CheckCircle2 className="h-3 w-3" />
                            }
                            Confirmar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-night-border/40 px-3 py-2 flex gap-2">
                        <button
                          className="flex items-center gap-1 text-[11px] text-ingreso-500 hover:text-ingreso-400 transition-colors"
                          onClick={() => setConfirmando(plan.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Marcar como realizado
                        </button>
                        <span className="text-night-border">·</span>
                        <button
                          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-gasto-400 transition-colors"
                          onClick={() => handleCancelar(plan.id)}
                          disabled={isCancelando}
                        >
                          <XCircle className="h-3 w-3" />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Botón planificar */}
            <button
              className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-night-border text-slate-500 hover:border-brand-500/50 hover:text-brand-400 transition-colors flex items-center justify-center gap-1.5 text-xs"
              onClick={() => setMostrarFormPlan(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Planificar para este día
            </button>
          </section>

          {/* Vacío total */}
          {eventos.length === 0 && plansDia.length === 0 && (
            <div className="text-center py-2">
              <p className="text-sm text-slate-600">Día sin compromisos ni planificaciones</p>
            </div>
          )}
        </div>
      </Modal>

      <PlanificacionForm
        isOpen={mostrarFormPlan}
        onClose={() => setMostrarFormPlan(false)}
        fechaInicial={fecha}
      />
    </>
  )
}
