import { useState } from 'react'
import { PlusCircle, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
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

  const esInversion  = !!cuentaVinculada
  const montoActual  = esInversion ? cuentaVinculada.saldo_actual : obj.monto_actual
  const completado   = montoActual >= obj.monto_objetivo
  const porcentaje   = obj.monto_objetivo > 0
    ? Math.min(100, (montoActual / obj.monto_objetivo) * 100)
    : 0

  // Rentabilidad inversión
  const rentabilidad    = esInversion ? cuentaVinculada.saldo_actual - cuentaVinculada.saldo_inicial : 0
  const rentabilidadPct = esInversion && cuentaVinculada.saldo_inicial > 0
    ? (rentabilidad / cuentaVinculada.saldo_inicial) * 100
    : 0

  // Días restantes
  let diasRestantes: number | null = null
  if (obj.fecha_objetivo) {
    const hoy  = new Date()
    const meta = new Date(obj.fecha_objetivo)
    diasRestantes = Math.ceil((meta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Color semántico del card
  const color = completado
    ? '#FFB703'                          // dorado — meta alcanzada
    : esInversion
      ? '#9B5DE5'                        // violeta — inversión
      : (obj.color ?? '#FFB703')         // color del objetivo (ahorro)

  function handleDelete() {
    if (!confirm(`¿Eliminar objetivo "${obj.nombre}"?\nSe perderá el historial de seguimiento.`)) return
    deleteMutation.mutate(obj.id)
  }

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden border"
        style={{
          background:  `linear-gradient(145deg, ${color}0D 0%, #23212C 60%)`,
          borderColor: `${color}28`,
        }}
      >
        {/* Barra de acento superior */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${color}CC 0%, transparent 70%)` }}
        />

        <div className="p-4 pt-5">
          {/* Cabecera */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="size-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                backgroundColor: `${color}18`,
                boxShadow:       `0 0 14px ${color}38`,
              }}
            >
              {completado ? '🏆' : esInversion ? '📈' : (obj.emoji ?? '🎯')}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-slate-100 truncate">{obj.nombre}</p>
                {esInversion && !completado && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    📈 Inversión
                  </span>
                )}
                {completado && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    ⭐ Meta alcanzada
                  </span>
                )}
              </div>
              {esInversion ? (
                <p className="text-[11px] mt-0.5" style={{ color: `${color}80` }}>
                  {cuentaVinculada.nombre}
                </p>
              ) : obj.descripcion ? (
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{obj.descripcion}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setEditOpen(true)}
                aria-label="Editar objetivo"
                className="size-7 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors"
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

          {/* Barra de progreso */}
          <ProgressBar
            value={porcentaje}
            color={completado ? 'gold' : esInversion ? 'blue' : 'gold'}
            size="md"
          />

          {/* Montos y acciones */}
          <div className="flex items-end justify-between mt-2.5">
            <div>
              <p
                className="text-sm font-bold tabular-nums"
                style={{ color: completado ? '#FFB703' : esInversion ? '#9B5DE5' : '#F1F5F9' }}
              >
                {formatCLP(montoActual)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">de {formatCLP(obj.monto_objetivo)}</p>
            </div>

            {/* Rentabilidad — inversiones */}
            {esInversion && cuentaVinculada.saldo_inicial > 0 && (
              <div className="flex items-center gap-1.5">
                {rentabilidad >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-ingreso-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-gasto-400" />
                }
                <div className="text-right">
                  <p className={`text-xs font-bold tabular-nums ${rentabilidad >= 0 ? 'text-ingreso-400' : 'text-gasto-400'}`}>
                    {rentabilidad >= 0 ? '+' : ''}{formatCLP(rentabilidad)}
                  </p>
                  <p className={`text-[10px] tabular-nums ${rentabilidad >= 0 ? 'text-ingreso-500' : 'text-gasto-500'}`}>
                    {rentabilidad >= 0 ? '+' : ''}{rentabilidadPct.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* Badge días + botón agregar — ahorro */}
            {!esInversion && (
              <div className="flex items-center gap-2">
                {diasRestantes !== null && !completado && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: diasRestantes < 0 ? '#F4645F18' : diasRestantes <= 30 ? '#FFB70318' : '#35334430',
                      color:           diasRestantes < 0 ? '#F4645F'   : diasRestantes <= 30 ? '#FFB703'   : '#64748B',
                    }}
                  >
                    {diasRestantes < 0 ? 'Vencido' : diasRestantes === 0 ? 'Hoy' : `${diasRestantes}d`}
                  </span>
                )}
                {!completado && (
                  <button
                    onClick={() => setFondosOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
                    style={{
                      backgroundColor: `${color}12`,
                      borderColor:     `${color}30`,
                      color,
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                )}
              </div>
            )}

            {/* Badge días para inversiones */}
            {esInversion && !completado && diasRestantes !== null && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: diasRestantes < 0 ? '#F4645F18' : '#35334430',
                  color:           diasRestantes < 0 ? '#F4645F'   : '#64748B',
                }}
              >
                {diasRestantes < 0 ? 'Vencido' : `${diasRestantes}d`}
              </span>
            )}
          </div>

          {/* Capital inicial — inversiones */}
          {esInversion && cuentaVinculada.saldo_inicial > 0 && (
            <p className="text-[10px] text-slate-600 mt-2 tabular-nums">
              Capital inicial: {formatCLP(cuentaVinculada.saldo_inicial)}
            </p>
          )}
        </div>
      </div>

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
