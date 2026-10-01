import { useState } from 'react'
import { Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { exportarExcel } from '@/services/export.service'
import { todayISO } from '@/utils/dates'

type Rango = 'mes' | 'anterior' | '3m' | '6m' | 'todo' | 'custom'

const OPCIONES: { value: Rango; label: string }[] = [
  { value: 'mes',      label: 'Este mes (calendario)' },
  { value: 'anterior', label: 'Mes anterior' },
  { value: '3m',       label: 'Últimos 3 meses' },
  { value: '6m',       label: 'Últimos 6 meses' },
  { value: 'todo',     label: 'Todo el historial' },
  { value: 'custom',   label: 'Rango personalizado' },
]

function pad(n: number) { return String(n).padStart(2, '0') }
function iso(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function calcularRango(r: Rango, desdeCustom: string, hastaCustom: string): { desde: string | null; hasta: string | null } {
  const hoy = new Date()
  switch (r) {
    case 'mes':      return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) }
    case 'anterior': return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0)) }
    case '3m':       return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)), hasta: iso(hoy) }
    case '6m':       return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)), hasta: iso(hoy) }
    case 'custom':   return { desde: desdeCustom || null, hasta: hastaCustom || null }
    default:         return { desde: null, hasta: null }
  }
}

interface Props { isOpen: boolean; onClose: () => void }

export function ExportarExcelModal({ isOpen, onClose }: Props) {
  const { user, profile } = useAuthStore()
  const [rango, setRango] = useState<Rango>('3m')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState(todayISO())
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function descargar() {
    if (!user) return
    setCargando(true); setError(null)
    try {
      const r = calcularRango(rango, desde, hasta)
      const { blob } = await exportarExcel(user.id, { fechaSueldo: profile?.fecha_sueldo ?? 1, ...r })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QloB_movimientos_${todayISO()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : ((e as { message?: string })?.message ?? 'No se pudo generar el archivo'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar a Excel" theme="dark" accent="#10D97F">
      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          Descarga un archivo .xlsx con tus movimientos (fecha, categoría, subcategoría, comercio, comentario,
          monto, cuenta/tarjeta), resúmenes por período y categoría, presupuesto vs real, cuentas, deudas y
          cobros. Incluye una hoja "Léeme" que explica cada columna, pensada para analizarlo después con una IA.
        </p>

        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Período</label>
          <select
            value={rango}
            onChange={e => setRango(e.target.value as Rango)}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none"
          >
            {OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {rango === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-night-border bg-night-3 text-white text-sm outline-none" />
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-500">Solo lectura: no modifica ningún dato.</p>
        {error && <p className="text-xs text-gasto-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" fullWidth loading={cargando} onClick={descargar}>
            <Download className="h-4 w-4" />
            Descargar Excel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
