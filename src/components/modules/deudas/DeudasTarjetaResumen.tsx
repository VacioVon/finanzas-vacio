import { CreditCard, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCLP } from '@/utils/currency'
import type { ResumenTarjetas } from '@/utils/deudasTarjeta'
import type { Movimiento } from '@/types/app.types'

interface Props {
  resumen:      ResumenTarjetas
  periodo:      string          // "28 sep – 27 oct"
  onPagarMonto: () => void
  sinAsignar:   Movimiento[]
  onRegistrarSinAsignar: () => void
  onAsignar:    (pago: Movimiento) => void
}

/** Todas las deudas de tarjeta juntas: cuánto debes, cuánto pagaste este período y qué pagar primero. */
export function DeudasTarjetaResumen({ resumen, periodo, onPagarMonto, sinAsignar, onRegistrarSinAsignar, onAsignar }: Props) {
  const totalSin = sinAsignar.reduce((s, p) => s + p.monto, 0)
  if (resumen.cantidad === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-400 text-center py-4" data-testid="tarjeta-vacia">
          No hay deudas pendientes ligadas a una tarjeta de crédito.
        </p>
      </Card>
    )
  }

  const pendienteTrasCuotas = Math.max(0, resumen.totalPendiente - resumen.cuotasDelMes)

  return (
    <div className="space-y-3" data-testid="resumen-tarjeta">
      {/* Cuadro de lo que debo */}
      <Card padding="none">
        <div className="p-4 text-center border-b border-night-border/40">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Debes en tarjeta</p>
          <p className="text-3xl font-bold text-gasto-400 tabular-nums mt-1">{formatCLP(resumen.totalPendiente)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{resumen.cantidad} {resumen.cantidad === 1 ? 'deuda' : 'deudas'}</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-night-border/40">
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-500">Cuotas del mes</p>
            <p className="text-sm font-bold text-white tabular-nums">{formatCLP(resumen.cuotasDelMes)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-500">Pagado ({periodo})</p>
            <p className="text-sm font-bold text-ingreso-400 tabular-nums" data-testid="pagado-periodo">{formatCLP(resumen.pagadoPeriodo)}</p>
          </div>
        </div>
      </Card>

      {/* Qué conviene */}
      <Card>
        <p className="text-xs font-semibold text-slate-200 mb-1">Qué conviene pagar</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pagando {formatCLP(resumen.cuotasDelMes)} cubres la cuota de todas tus deudas este mes y quedarías debiendo {formatCLP(pendienteTrasCuotas)}.
          Si te sobra, conviene abonar a la deuda de menor saldo para terminarla antes.
        </p>
        <Button type="button" variant="primary" fullWidth className="mt-3" onClick={onPagarMonto} data-testid="pagar-monto-tarjeta">
          <Wallet className="h-4 w-4" />
          Pagar un monto y repartirlo
        </Button>
      </Card>

      {/* Pagos a la tarjeta que aún no se asignan a una deuda */}
      <Card>
        <p className="text-xs font-semibold text-slate-200 mb-1">Pagos sin asignar</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          ¿Pagaste a la tarjeta y aún no sabes qué deuda se pagó? Regístralo aquí y asígnalo cuando llegue el estado de cuenta.
        </p>
        {sinAsignar.length > 0 && (
          <div className="mt-3 space-y-2" data-testid="lista-sin-asignar">
            <p className="text-sm font-bold text-ingreso-400 tabular-nums">Acumulado: {formatCLP(totalSin)}</p>
            {sinAsignar.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-night-border bg-night-3/40">
                <span className="text-xs text-slate-300 tabular-nums">{formatCLP(p.monto)} · {p.fecha}</span>
                <Button type="button" size="sm" variant="secondary" onClick={() => onAsignar(p)} data-testid="asignar-pago">Asignar</Button>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="secondary" fullWidth className="mt-3" onClick={onRegistrarSinAsignar} data-testid="registrar-sin-asignar">
          <CreditCard className="h-4 w-4" />
          Pagué a la tarjeta (sin asignar)
        </Button>
      </Card>

      {/* Por tarjeta */}
      {resumen.tarjetas.map(t => (
        <Card key={t.tarjetaId} padding="none">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-night-border/40">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-100 min-w-0">
              <CreditCard className="h-4 w-4 text-gasto-300 flex-shrink-0" />
              <span className="truncate">{t.nombre.trim()}</span>
            </span>
            <span className="text-sm font-bold text-gasto-300 tabular-nums flex-shrink-0">{formatCLP(t.totalPendiente)}</span>
          </div>
          <ul className="divide-y divide-night-border/30">
            {t.deudas.map(d => (
              <li key={d.deuda.id} className="px-4 py-3 space-y-1.5" data-testid="deuda-tarjeta">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-slate-200 truncate">{d.deuda.nombre.trim()}</span>
                  <span className="text-sm font-semibold text-slate-100 tabular-nums flex-shrink-0">{formatCLP(d.pendiente)}</span>
                </div>
                <ProgressBar value={d.deuda.monto_total - d.pendiente} max={d.deuda.monto_total} color="green" size="sm" />
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 tabular-nums">
                  <span>
                    {d.cuota ? `cuota ${formatCLP(d.cuota)}` : 'sin cuota fija'}
                    {d.cuotasRestantes != null ? ` · ${d.cuotasRestantes} ${d.cuotasRestantes === 1 ? 'restante' : 'restantes'}` : ''}
                  </span>
                  <span className={d.pagadoPeriodo > 0 ? 'text-ingreso-400' : ''}>
                    {d.pagadoPeriodo > 0 ? `pagaste ${formatCLP(d.pagadoPeriodo)} este período` : 'sin pagos este período'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
