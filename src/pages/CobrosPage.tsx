import { useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { CobrarForm } from '@/components/modules/cobros/CobrarForm'
import { useCuentasPorCobrar, useCancelarCobro } from '@/hooks/useCobros'
import { formatCLP } from '@/utils/currency'
import type { CuentaPorCobrar } from '@/types/app.types'

function pct(cobro: CuentaPorCobrar) {
  if (cobro.monto_original === 0) return 0
  return Math.min(100, Math.round((cobro.monto_pagado / cobro.monto_original) * 100))
}

function pendiente(cobro: CuentaPorCobrar) {
  return cobro.monto_original - cobro.monto_pagado
}

function labelVencimiento(fecha: string) {
  const dias = differenceInDays(parseISO(fecha), new Date())
  if (dias < 0)  return { label: `Venció hace ${Math.abs(dias)} días`, warn: true }
  if (dias === 0) return { label: 'Vence hoy', warn: true }
  if (dias <= 7)  return { label: `Vence en ${dias} días`, warn: true }
  return { label: `Vence ${format(parseISO(fecha), "d 'de' MMMM", { locale: es })}`, warn: false }
}

interface CobroCardProps {
  cobro: CuentaPorCobrar
  onCobrar: (cobro: CuentaPorCobrar) => void
  onCancelar: (id: string) => void
}

function CobroCard({ cobro, onCobrar, onCancelar }: CobroCardProps) {
  const p = pct(cobro)
  const pend = pendiente(cobro)

  return (
    <div className="rounded-2xl border border-night-border bg-night-1 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        {/* Descripcion */}
        {cobro.descripcion && (
          <p className="text-sm font-semibold text-white mb-1">{cobro.descripcion}</p>
        )}

        {/* Montos */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pendiente</p>
            <p className="text-xl font-bold text-white tabular-nums">{formatCLP(pend)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Original</p>
            <p className="text-sm text-slate-400 tabular-nums">{formatCLP(cobro.monto_original)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 bg-night-3 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-ingreso-500 transition-all"
            style={{ width: `${p}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
          <span>{p}% cobrado</span>
          {cobro.monto_pagado > 0 && <span>{formatCLP(cobro.monto_pagado)} recibidos</span>}
        </div>

        {/* Vencimiento */}
        {cobro.fecha_vencimiento && (() => {
          const v = labelVencimiento(cobro.fecha_vencimiento)
          return (
            <div className={`flex items-center gap-1 mt-2 text-[11px] ${v.warn ? 'text-xp-400' : 'text-slate-500'}`}>
              {v.warn && <AlertTriangle className="h-3 w-3 flex-shrink-0" />}
              {v.label}
            </div>
          )
        })()}

        {/* Aviso origen eliminado */}
        {!cobro.movimiento_origen_id && cobro.pagos_cobrar?.length === 0 && (
          <p className="text-[10px] text-slate-600 mt-1">⚠️ Movimiento original eliminado</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex border-t border-night-border/40">
        <button
          onClick={() => onCobrar(cobro)}
          className="flex-1 py-2.5 text-xs font-semibold text-ingreso-400 hover:bg-ingreso-500/10 transition-colors"
        >
          + Registrar cobro
        </button>
        <div className="w-px bg-night-border/40" />
        <button
          onClick={() => {
            if (confirm('¿Cancelar este cobro? No se elimina el gasto original.')) {
              onCancelar(cobro.id)
            }
          }}
          className="px-4 py-2.5 text-xs text-slate-600 hover:text-gasto-400 hover:bg-gasto-500/10 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export function CobrosPage() {
  const { data: cobros, isLoading } = useCuentasPorCobrar()
  const cancelarMutation = useCancelarCobro()
  const [cobrando, setCobrando] = useState<CuentaPorCobrar | null>(null)
  const [mostrarCerrados, setMostrarCerrados] = useState(false)

  const pendientes  = (cobros ?? []).filter(c => c.estado === 'pendiente')
  const cerrados    = (cobros ?? []).filter(c => c.estado !== 'pendiente')
  const totalPendiente = pendientes.reduce((s, c) => s + pendiente(c), 0)

  // Agrupar pendientes por persona
  const grupos = pendientes.reduce<Record<string, CuentaPorCobrar[]>>((acc, c) => {
    const key = c.persona
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <AppLayout>
      <Header title="Por cobrar" />

      <div className="px-4 pt-4 space-y-4 pb-8">

        {/* Resumen */}
        {totalPendiente > 0 && (
          <Card padding="md">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total pendiente</p>
            <p className="text-3xl font-bold text-white tabular-nums mt-1">{formatCLP(totalPendiente)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendientes.length} cobro{pendientes.length !== 1 ? 's' : ''} activo{pendientes.length !== 1 ? 's' : ''}
            </p>
          </Card>
        )}

        {isLoading ? (
          <SkeletonList count={3} />
        ) : pendientes.length === 0 ? (
          <EmptyState
            icon="💸"
            title="Sin cobros pendientes"
            description="Los gastos que hagas para otra persona aparecerán aquí"
          />
        ) : (
          <div className="space-y-5">
            {Object.entries(grupos).map(([persona, items]) => {
              const totalPersona = items.reduce((s, c) => s + pendiente(c), 0)
              return (
                <div key={persona}>
                  {/* Cabecera de persona */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-sm font-bold text-white">{persona}</p>
                    <p className="text-sm font-semibold text-ingreso-400 tabular-nums">
                      {formatCLP(totalPersona)}
                    </p>
                  </div>
                  {/* Cobros individuales */}
                  <div className="space-y-2">
                    {items.map(cobro => (
                      <CobroCard
                        key={cobro.id}
                        cobro={cobro}
                        onCobrar={setCobrando}
                        onCancelar={id => cancelarMutation.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Cobros cerrados */}
        {cerrados.length > 0 && (
          <div>
            <button
              onClick={() => setMostrarCerrados(v => !v)}
              className="w-full flex items-center justify-between px-1 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span>Cobros cerrados ({cerrados.length})</span>
              {mostrarCerrados ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {mostrarCerrados && (
              <div className="space-y-2 mt-1">
                {cerrados.map(cobro => (
                  <div key={cobro.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-night-border/40 bg-night-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-400">{cobro.persona}</p>
                      {cobro.descripcion && (
                        <p className="text-xs text-slate-600 truncate">{cobro.descripcion}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-slate-500">
                        {formatCLP(cobro.monto_original)}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {cobro.estado === 'pagado' ? '✓ Cobrado' : '✕ Cancelado'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {cobrando && (
        <CobrarForm
          isOpen={!!cobrando}
          onClose={() => setCobrando(null)}
          cobro={cobrando}
        />
      )}
    </AppLayout>
  )
}
