import { useState } from 'react'
import { ArrowDownLeft, Wallet, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { TransferenciaExternaForm } from '@/components/modules/finanzas/TransferenciaExternaForm'
import { DineroAsignadoForm } from '@/components/modules/finanzas/DineroAsignadoForm'
import { DineroAsignadoCard } from '@/components/modules/finanzas/DineroAsignadoCard'
import { useDineroAsignado } from '@/hooks/useDineroAsignado'
import { useTransferenciasExternas } from '@/hooks/useTransferenciasExternas'
import { useDeleteTransferenciaExterna } from '@/hooks/useTransferenciasExternas'
import { formatCLP } from '@/utils/currency'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'

const PERSONA_TIPO_LABEL: Record<string, string> = {
  persona:  '👤',
  empresa:  '🏢',
  banco:    '🏦',
  otro:     '📦',
}

export function FinanzasPage() {
  const [txFormOpen,    setTxFormOpen]    = useState(false)
  const [sobreFormOpen, setSobreFormOpen] = useState(false)

  const { data: sobres }           = useDineroAsignado()
  const { data: transferencias }   = useTransferenciasExternas()
  const deleteTxMutation           = useDeleteTransferenciaExterna()

  const sobreActivos     = (sobres ?? []).filter(s => s.activo)
  const totalReservado   = sobreActivos.reduce((s, o) => s + o.monto_reservado, 0)
  const totalDisponible  = sobreActivos.reduce((s, o) => s + Math.max(0, o.monto_reservado - o.monto_usado), 0)

  return (
    <AppLayout nebula="#10D97F">
      <Header title="Motor financiero" />

      <div className="px-4 lg:px-0 pb-8 space-y-6 pt-4">

        {/* ── Transferencias externas ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-200">Dinero recibido</p>
              <p className="text-[11px] text-slate-500">Transferencias de personas o empresas</p>
            </div>
            <button
              onClick={() => setTxFormOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-ingreso-400 bg-ingreso-500/10 border border-ingreso-500/25 px-3 py-2 rounded-xl hover:bg-ingreso-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar
            </button>
          </div>

          {(transferencias ?? []).length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-night-border p-6 text-center"
              style={{ background: 'linear-gradient(145deg, #10D97F06 0%, #23212C 65%)' }}
            >
              <ArrowDownLeft className="h-8 w-8 text-ingreso-500/40 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Sin transferencias externas registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(transferencias ?? []).map(tx => (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-ingreso-500/15 bg-gradient-to-r from-ingreso-500/5 to-transparent p-3.5 flex items-center gap-3"
                >
                  <div className="size-9 rounded-xl bg-ingreso-500/15 flex items-center justify-center text-base flex-shrink-0">
                    {PERSONA_TIPO_LABEL[tx.persona_tipo ?? 'otro']}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{tx.persona_nombre}</p>
                    {tx.proposito && (
                      <p className="text-[10px] text-slate-500 truncate">{tx.proposito}</p>
                    )}
                    <p className="text-[10px] text-slate-600">
                      {tx.fecha ? format(parseISO(tx.fecha), 'd MMM yyyy', { locale: es }) : '—'}
                      {tx.es_devolucion && ' · Devolución'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold tabular-nums text-ingreso-400">
                      +{formatCLP(tx.monto)}
                    </p>
                    <button
                      onClick={() => {
                        if (!confirm('¿Eliminar esta transferencia?')) return
                        deleteTxMutation.mutate({
                          txId:         tx.id,
                          movimientoId: tx.movimiento_id!,
                          cuentaId:     tx.cuenta_id!,
                          monto:        tx.monto,
                        })
                      }}
                      disabled={deleteTxMutation.isPending}
                      className="mt-0.5 text-[10px] text-slate-600 hover:text-gasto-400 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="border-t border-night-border/50" />

        {/* ── Dinero asignado (sobres) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-200">Sobres de dinero</p>
              <p className="text-[11px] text-slate-500">Reserva para propósitos específicos</p>
            </div>
            <button
              onClick={() => setSobreFormOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/25 px-3 py-2 rounded-xl hover:bg-brand-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo sobre
            </button>
          </div>

          {sobreActivos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3 text-center">
              <div className="rounded-xl bg-night-2 border border-night-border p-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-wide">Reservado</p>
                <p className="text-sm font-bold tabular-nums text-brand-300 mt-0.5">{formatCLP(totalReservado)}</p>
              </div>
              <div className="rounded-xl bg-night-2 border border-night-border p-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-wide">Disponible</p>
                <p className="text-sm font-bold tabular-nums text-ingreso-300 mt-0.5">{formatCLP(totalDisponible)}</p>
              </div>
            </div>
          )}

          {sobreActivos.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-night-border p-6 text-center"
              style={{ background: 'linear-gradient(145deg, #2979FF06 0%, #23212C 65%)' }}
            >
              <Wallet className="h-8 w-8 text-brand-500/40 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Sin sobres activos. Crea uno para reservar dinero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sobreActivos.map(sobre => (
                <DineroAsignadoCard key={sobre.id} sobre={sobre} />
              ))}
            </div>
          )}
        </section>
      </div>

      <TransferenciaExternaForm isOpen={txFormOpen} onClose={() => setTxFormOpen(false)} />
      <DineroAsignadoForm isOpen={sobreFormOpen} onClose={() => setSobreFormOpen(false)} />
    </AppLayout>
  )
}
