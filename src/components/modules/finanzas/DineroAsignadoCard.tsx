import { Trash2, Calendar } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCLP } from '@/utils/currency'
import { useDeleteDineroAsignado } from '@/hooks/useDineroAsignado'
import type { DineroAsignado } from '@/types/app.types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  sobre: DineroAsignado
}

const PROPOSITO_LABEL: Record<string, string> = {
  deuda:      'Deuda',
  compra:     'Compra',
  objetivo:   'Objetivo',
  ahorro:     'Ahorro',
  emergencia: 'Emergencia',
  otro:       'Otro',
}

export function DineroAsignadoCard({ sobre }: Props) {
  const deleteMutation = useDeleteDineroAsignado()

  const color           = sobre.color ?? '#2979FF'
  const pct             = sobre.monto_reservado > 0
    ? Math.min(100, (sobre.monto_usado / sobre.monto_reservado) * 100)
    : 0
  const restante        = Math.max(0, sobre.monto_reservado - sobre.monto_usado)

  function handleDelete() {
    if (!confirm(`¿Archivar sobre "${sobre.nombre}"?`)) return
    deleteMutation.mutate(sobre.id)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden border"
      style={{
        background:  `linear-gradient(145deg, ${color}0C 0%, #23212C 65%)`,
        borderColor: `${color}28`,
      }}
    >
      {/* Barra de acento superior */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}CC 0%, transparent 70%)` }}
      />

      <div className="p-3.5 pt-4.5">
        {/* Cabecera */}
        <div className="flex items-start gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${color}18`, boxShadow: `0 0 10px ${color}28` }}
          >
            {sobre.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{sobre.nombre}</p>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {PROPOSITO_LABEL[sobre.proposito_tipo] ?? sobre.proposito_tipo}
            </span>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="size-7 flex items-center justify-center rounded-full hover:bg-gasto-500/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-gasto-400" />
          </button>
        </div>

        {/* Progreso */}
        <div className="mt-3">
          <ProgressBar value={pct} size="sm" />
        </div>

        {/* Montos */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-[10px] text-slate-500">Usado</p>
            <p className="text-xs font-bold tabular-nums" style={{ color }}>
              {formatCLP(sobre.monto_usado)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Disponible</p>
            <p className="text-xs font-bold tabular-nums text-slate-200">
              {formatCLP(restante)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Total</p>
            <p className="text-xs tabular-nums text-slate-400">
              {formatCLP(sobre.monto_reservado)}
            </p>
          </div>
        </div>

        {/* Descripción + fecha límite */}
        {(sobre.descripcion || sobre.fecha_limite) && (
          <div
            className="mt-2.5 pt-2.5 border-t flex items-center gap-3 flex-wrap"
            style={{ borderColor: `${color}15` }}
          >
            {sobre.descripcion && (
              <p className="text-[11px] text-slate-500 flex-1 truncate">{sobre.descripcion}</p>
            )}
            {sobre.fecha_limite && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Calendar className="h-3 w-3" />
                {format(parseISO(sobre.fecha_limite), 'd MMM', { locale: es })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
