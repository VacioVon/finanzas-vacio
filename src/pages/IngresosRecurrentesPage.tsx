import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import { AppLayout }    from '@/components/layout/AppLayout'
import { Header }       from '@/components/layout/Header'
import { Card }         from '@/components/ui/Card'
import {
  useIngresosRecurrentes,
  useIngresosMes,
  useToggleIngresoRecurrente,
  useDeleteIngresoRecurrente,
} from '@/hooks/useIngresosRecurrentes'
import { IngresoRecurrenteForm }  from '@/components/modules/ingresos-recurrentes/IngresoRecurrenteForm'
import { ConfirmarIngresoModal }  from '@/components/modules/ingresos-recurrentes/ConfirmarIngresoModal'
import type { IngresoMes, IngresoPendienteHoy } from '@/types/ingresos-recurrentes.types'

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  pendiente:    { label: 'Pendiente',    color: 'text-xp-400     bg-xp-500/10'     },
  confirmado:   { label: 'Confirmado',   color: 'text-ingreso-400 bg-ingreso-500/10' },
  pospuesto:    { label: 'Pospuesto',    color: 'text-brand-400   bg-brand-500/10'  },
  no_recibido:  { label: 'No recibido',  color: 'text-slate-400   bg-night-3'       },
}

export function IngresosRecurrentesPage() {
  const now      = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [showForm,    setShowForm]    = useState(false)
  const [confirmar,   setConfirmar]   = useState<IngresoPendienteHoy | null>(null)

  const { data: recurrentes = [], isLoading: loadingR } = useIngresosRecurrentes()
  const { data: ingresosMes = [], isLoading: loadingM } = useIngresosMes(mes, anio)
  const toggle = useToggleIngresoRecurrente()
  const del    = useDeleteIngresoRecurrente()

  // Agrupar instancias del mes por fuente para ver total combinado
  const grupos: Record<string, { fuente_nombre: string; items: IngresoMes[]; total: number; recibido: number }> = {}
  for (const i of ingresosMes) {
    const key = i.fuente_id ?? i.ingreso_recurrente_id
    if (!grupos[key]) {
      grupos[key] = {
        fuente_nombre: i.fuente_nombre ?? i.nombre,
        items:         [],
        total:         0,
        recibido:      0,
      }
    }
    grupos[key].items.push(i)
    grupos[key].total    += i.monto_esperado
    grupos[key].recibido += i.monto_confirmado ?? 0
  }

  function navMes(delta: number) {
    const d = new Date(anio, mes - 1 + delta, 1)
    setMes(d.getMonth() + 1)
    setAnio(d.getFullYear())
  }

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  function ingresoToConfirmar(inst: IngresoMes): IngresoPendienteHoy {
    return {
      instancia_id:          inst.instancia_id,
      ingreso_recurrente_id: inst.ingreso_recurrente_id,
      nombre:                inst.nombre,
      fuente_nombre:         inst.fuente_nombre,
      monto_esperado:        inst.monto_esperado,
      cuenta_id:             inst.cuenta_id,
      cuenta_nombre:         inst.cuenta_nombre,
      fecha_esperada:        inst.fecha_esperada,
      fecha_min:             inst.fecha_min,
      fecha_max:             inst.fecha_max,
      tolerancia_dias:       inst.tolerancia_dias,
      tipo_fecha:            inst.tipo_fecha,
      periodo_ref:           inst.periodo_ref,
      estado:                inst.estado,
    }
  }

  return (
    <AppLayout nebula="#10D97F">
      <Header title="Ingresos recurrentes" showBack />

      <div className="space-y-5 pt-4 px-4 lg:px-0 pb-10">

        {/* ── Selector de mes ── */}
        <div className="flex items-center justify-between">
          <button onClick={() => navMes(-1)} className="size-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-night-3/50 transition-colors">‹</button>
          <span className="text-sm font-semibold text-slate-200 tabular-nums">
            {MESES[mes - 1]} {anio}
          </span>
          <button onClick={() => navMes(1)} className="size-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-night-3/50 transition-colors">›</button>
        </div>

        {/* ── Resumen del mes ── */}
        {loadingM ? (
          <div className="h-32 rounded-2xl bg-night-3/40 animate-pulse" />
        ) : Object.keys(grupos).length === 0 ? (
          <Card>
            <div className="py-6 text-center">
              <p className="text-slate-500 text-sm">No hay ingresos esperados para este mes</p>
              <p className="text-xs text-slate-600 mt-1">Crea un ingreso recurrente para empezar</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-[.22em] text-slate-500 px-1">
              Proyectado vs recibido
            </p>
            {Object.entries(grupos).map(([key, g]) => {
              const pct = g.total > 0 ? Math.min(100, Math.round((g.recibido / g.total) * 100)) : 0
              return (
                <Card key={key} padding="none">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-200">{g.fuente_nombre}</p>
                      <span className="text-xs font-semibold text-ingreso-400 tabular-nums">
                        {formatCLP(g.recibido)} / {formatCLP(g.total)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-night-3 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-ingreso-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="divide-y divide-night-border/40">
                      {g.items.map(inst => {
                        const badge = ESTADO_BADGE[inst.estado] ?? ESTADO_BADGE.pendiente
                        return (
                          <button
                            key={inst.instancia_id}
                            onClick={() => inst.estado !== 'confirmado' && setConfirmar(ingresoToConfirmar(inst))}
                            disabled={inst.estado === 'confirmado'}
                            className="w-full flex items-center gap-3 py-2.5 hover:bg-night-3/30 disabled:cursor-default transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-300 truncate">{inst.nombre}</p>
                              <p className="text-[10px] text-slate-500 tabular-nums flex items-center gap-1">
                                <Calendar className="size-2.5" />
                                {inst.tipo_fecha === 'aproximado'
                                  ? `${formatFecha(inst.fecha_min)} – ${formatFecha(inst.fecha_max)}`
                                  : formatFecha(inst.fecha_esperada)
                                }
                              </p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs font-semibold text-slate-300 tabular-nums">
                              {formatCLP(inst.monto_esperado)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* ── Lista de recurrentes configurados ── */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] font-medium uppercase tracking-[.22em] text-slate-500">
              Configurados
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs text-ingreso-400 hover:text-ingreso-300 transition-colors font-medium"
            >
              <Plus className="size-3.5" />
              Agregar
            </button>
          </div>

          {loadingR ? (
            <div className="h-24 rounded-2xl bg-night-3/40 animate-pulse" />
          ) : recurrentes.length === 0 ? (
            <Card>
              <div className="py-8 text-center space-y-3">
                <p className="text-slate-500 text-sm">Sin ingresos recurrentes</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-ingreso-500/15 text-ingreso-400 text-xs font-medium rounded-xl hover:bg-ingreso-500/25 transition-colors"
                >
                  Crear el primero
                </button>
              </div>
            </Card>
          ) : (
            <Card padding="none" className="divide-y divide-night-border/40">
              {recurrentes.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{r.nombre}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      {formatCLP(r.monto_esperado)} · día {r.dia_esperado}
                      {r.tipo_fecha === 'aproximado' && ` ±${r.tolerancia_dias}d`}
                      {r.fuente_nombre && ` · ${r.fuente_nombre}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggle.mutate({ id: r.id, activo: !r.activo })}
                      className={`transition-colors ${r.activo ? 'text-ingreso-400 hover:text-ingreso-300' : 'text-slate-600 hover:text-slate-400'}`}
                      aria-label={r.activo ? 'Desactivar' : 'Activar'}
                    >
                      {r.activo ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Eliminar "${r.nombre}"? Se perderán las instancias futuras.`)) {
                          await del.mutateAsync(r.id)
                        }
                      }}
                      className="size-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-gasto-400 hover:bg-gasto-500/10 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {showForm  && <IngresoRecurrenteForm onClose={() => setShowForm(false)} />}
      {confirmar && <ConfirmarIngresoModal instancia={confirmar} onClose={() => setConfirmar(null)} />}
    </AppLayout>
  )
}
