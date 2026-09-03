import { useState } from 'react'
import { PlusCircle, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ObjetivoForm } from './ObjetivoForm'
import { AgregarFondosForm } from './AgregarFondosForm'
import { useDeleteObjetivo } from '@/hooks/useObjetivos'
import { useCuentas } from '@/hooks/useCuentas'
import { formatCLP } from '@/utils/currency'
import type { ObjetivoAhorro } from '@/types/app.types'

interface ObjetivoCardProps {
  objetivo: ObjetivoAhorro
}

export function ObjetivoCard({ objetivo: obj }: ObjetivoCardProps) {
  const [editOpen,   setEditOpen]   = useState(false)
  const [fondosOpen, setFondosOpen] = useState(false)
  const deleteMutation = useDeleteObjetivo()
  const { data: cuentas } = useCuentas()

  const cuentaVinculada = obj.cuenta_vinculada_id
    ? (cuentas ?? []).find(c => c.id === obj.cuenta_vinculada_id)
    : undefined

  const esInversion = !!cuentaVinculada

  // Progress value: from linked account balance if investment, else from monto_actual
  const montoActual    = esInversion ? cuentaVinculada.saldo_actual : obj.monto_actual
  const porcentaje     = obj.monto_objetivo > 0
    ? Math.min(100, (montoActual / obj.monto_objetivo) * 100)
    : 0
  const completado     = montoActual >= obj.monto_objetivo

  // Rentabilidad (investment gain)
  const rentabilidad     = esInversion ? cuentaVinculada.saldo_actual - cuentaVinculada.saldo_inicial : 0
  const rentabilidadPct  = esInversion && cuentaVinculada.saldo_inicial > 0
    ? (rentabilidad / cuentaVinculada.saldo_inicial) * 100
    : 0
  const gano             = rentabilidad >= 0

  let diasRestantes: number | null = null
  if (obj.fecha_objetivo) {
    const hoy  = new Date()
    const meta = new Date(obj.fecha_objetivo)
    diasRestantes = Math.ceil((meta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar objetivo "${obj.nombre}"?\nSe perderá el historial de seguimiento.`)) return
    deleteMutation.mutate(obj.id)
  }

  // Investment card colors
  const invColor  = '#9B5DE5'
  const invBorder = 'border-ahorro-500/30'

  return (
    <>
      <Card
        variant={completado ? 'default' : esInversion ? 'default' : 'gold'}
        padding="md"
        className={esInversion && !completado ? `border ${invBorder} bg-ahorro-500/5` : ''}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="size-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              backgroundColor: completado
                ? `${obj.color}18`
                : esInversion
                ? `${invColor}18`
                : 'rgba(201,162,39,0.12)'
            }}
          >
            {completado ? '🏆' : esInversion ? '📈' : (obj.emoji ?? '🎯')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-200 truncate">{obj.nombre}</p>
              {esInversion && !completado && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${invColor}18`, color: invColor }}
                >
                  📈 Inversión
                </span>
              )}
            </div>
            {esInversion ? (
              <p className="text-[11px] text-ahorro-400/70 truncate">{cuentaVinculada.nombre}</p>
            ) : obj.descripcion ? (
              <p className="text-xs text-slate-400 truncate">{obj.descripcion}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {completado && (
              <Badge variant="gold" className="mr-1">⭐ Meta alcanzada</Badge>
            )}
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Editar objetivo"
              className="size-7 flex items-center justify-center rounded-full hover:bg-night-3 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Eliminar objetivo"
              className="size-7 flex items-center justify-center rounded-full hover:bg-gasto-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-gasto-400" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar
          value={porcentaje}
          color={completado ? 'gold' : esInversion ? 'blue' : 'gold'}
          size="md"
        />

        {/* Amounts */}
        <div className="flex items-end justify-between mt-2">
          <div>
            <p className={[
              'text-sm font-bold tabular-nums',
              completado ? 'text-gold-500' : esInversion ? 'text-ahorro-400' : 'text-white'
            ].join(' ')}>
              {formatCLP(montoActual)}
            </p>
            <p className="text-xs text-slate-400 tabular-nums">de {formatCLP(obj.monto_objetivo)}</p>
          </div>

          {/* Rentabilidad — solo inversiones */}
          {esInversion && cuentaVinculada.saldo_inicial > 0 && (
            <div className="flex items-center gap-1">
              {gano
                ? <TrendingUp className="h-3.5 w-3.5 text-ingreso-400" />
                : <TrendingDown className="h-3.5 w-3.5 text-gasto-400" />
              }
              <div className="text-right">
                <p className={`text-xs font-bold tabular-nums ${gano ? 'text-ingreso-400' : 'text-gasto-400'}`}>
                  {gano ? '+' : ''}{formatCLP(rentabilidad)}
                </p>
                <p className={`text-[10px] tabular-nums ${gano ? 'text-ingreso-500' : 'text-gasto-500'}`}>
                  {gano ? '+' : ''}{rentabilidadPct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Badges + add button — ahorro traditional */}
          {!esInversion && (
            <div className="flex items-center gap-2">
              {diasRestantes !== null && !completado && (
                <Badge variant={diasRestantes < 0 ? 'gasto' : diasRestantes <= 30 ? 'xp' : 'muted'}>
                  {diasRestantes < 0 ? 'Vencido' : diasRestantes === 0 ? 'Hoy' : `${diasRestantes}d`}
                </Badge>
              )}
              {!completado && (
                <button
                  onClick={() => setFondosOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/12 text-gold-500 text-xs font-medium hover:bg-gold-500/20 transition-colors border border-gold-500/20"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Agregar
                </button>
              )}
            </div>
          )}

          {/* For investments: show date badge if set */}
          {esInversion && !completado && diasRestantes !== null && (
            <Badge variant={diasRestantes < 0 ? 'gasto' : diasRestantes <= 30 ? 'xp' : 'muted'}>
              {diasRestantes < 0 ? 'Vencido' : diasRestantes === 0 ? 'Hoy' : `${diasRestantes}d`}
            </Badge>
          )}
        </div>

        {/* Investment saldo inicial note */}
        {esInversion && cuentaVinculada.saldo_inicial > 0 && (
          <p className="text-[10px] text-slate-600 mt-2 tabular-nums">
            Capital inicial: {formatCLP(cuentaVinculada.saldo_inicial)}
          </p>
        )}
      </Card>

      <ObjetivoForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editing={obj}
      />
      <AgregarFondosForm
        isOpen={fondosOpen}
        onClose={() => setFondosOpen(false)}
        objetivo={obj}
      />
    </>
  )
}
