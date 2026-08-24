import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Tag, LogOut, ChevronRight, Moon, Sun, Monitor, DollarSign, CalendarDays, Trash2
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PerfilForm } from '@/components/modules/perfil/PerfilForm'
import { useAuthStore } from '@/store/authStore'
import { useUpdatePerfil } from '@/hooks/usePerfil'
import { signOut } from '@/services/auth.service'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

type Tema = 'light' | 'dark' | 'auto'

const TEMA_OPTIONS: { value: Tema; icon: React.ReactNode; label: string }[] = [
  { value: 'light', icon: <Sun    className="h-4 w-4" />, label: 'Claro'    },
  { value: 'auto',  icon: <Monitor className="h-4 w-4" />, label: 'Sistema' },
  { value: 'dark',  icon: <Moon   className="h-4 w-4" />, label: 'Oscuro'   }
]

const MONEDAS = [
  { value: 'CLP', label: '🇨🇱 Peso Chileno' },
  { value: 'USD', label: '🇺🇸 Dólar'         },
  { value: 'EUR', label: '🇪🇺 Euro'           }
]

const DIAS_SUELDO = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `Día ${i + 1}`
}))

export function AjustesPage() {
  const navigate    = useNavigate()
  const { profile } = useAuthStore()
  const updatePerfil = useUpdatePerfil()
  const qc          = useQueryClient()
  const [perfilOpen,  setPerfilOpen]  = useState(false)
  const [reiniciando, setReiniciando] = useState(false)

  const temaActual   = (profile?.tema ?? 'auto') as Tema
  const monedaActual = profile?.moneda ?? 'CLP'
  const diaSueldo    = profile?.fecha_sueldo

  async function setTema(tema: Tema) {
    await updatePerfil.mutateAsync({ tema })
  }

  async function setMoneda(moneda: string) {
    await updatePerfil.mutateAsync({ moneda })
  }

  async function setDiaSueldo(dia: number | null) {
    await updatePerfil.mutateAsync({ fecha_sueldo: dia })
  }

  async function handleLogout() {
    if (confirm('¿Cerrar sesión?')) await signOut()
  }

  async function handleReiniciar() {
    const paso1 = confirm(
      '⚠️ ¿Reiniciar todos los datos?\n\nSe eliminarán permanentemente:\n• Todas las cuentas y saldos\n• Todos los movimientos\n• Cuotas, deudas y suscripciones\n• Presupuestos y objetivos\n\nTu usuario y categorías se conservan.'
    )
    if (!paso1) return

    const paso2 = confirm('¿Estás seguro? Esta acción no se puede deshacer.')
    if (!paso2) return

    setReiniciando(true)
    try {
      const { error } = await supabase.rpc('reiniciar_datos_usuario')
      if (error) throw new Error(error.message)
      await qc.resetQueries()
      alert('Datos eliminados correctamente. La aplicación está lista para empezar de cero.')
      navigate('/')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert(`Error al reiniciar datos:\n\n${msg}`)
    } finally {
      setReiniciando(false)
    }
  }

  return (
    <AppLayout>
      <Header title="Ajustes" />

      <div className="px-4 pt-4 space-y-5 pb-6">

        {/* Perfil */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Perfil</p>
          <Card padding="none">
            <button
              onClick={() => setPerfilOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-night-3/50 rounded-2xl transition-colors"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="size-10 rounded-full object-cover border border-night-border flex-shrink-0"
                />
              ) : (
                <div className="size-10 rounded-full bg-brand-500/20 flex items-center justify-center text-lg font-bold text-brand-300 flex-shrink-0">
                  {profile?.nombre?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">{profile?.nombre ?? 'Usuario'}</p>
                <p className="text-xs text-slate-400">Nombre y foto de perfil</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </Card>
        </section>

        {/* Apariencia */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Apariencia</p>
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">Tema</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TEMA_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTema(opt.value)}
                  className={[
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs font-medium',
                    temaActual === opt.value
                      ? 'border-brand-500/60 bg-brand-500/15 text-brand-300'
                      : 'border-night-border bg-night-3 text-slate-400 hover:border-brand-500/30 hover:text-slate-300'
                  ].join(' ')}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">La opción Sistema sigue la configuración de tu dispositivo.</p>
          </Card>
        </section>

        {/* Preferencias financieras */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Finanzas</p>
          <Card padding="none" className="divide-y divide-night-border/40">

            {/* Moneda */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium text-slate-300">Moneda</p>
              </div>
              <div className="flex gap-2">
                {MONEDAS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMoneda(m.value)}
                    className={[
                      'flex-1 py-2 px-2 rounded-xl border text-xs font-medium transition-all',
                      monedaActual === m.value
                        ? 'border-brand-500/60 bg-brand-500/15 text-brand-300'
                        : 'border-night-border bg-night-3 text-slate-400 hover:border-brand-500/30 hover:text-slate-300'
                    ].join(' ')}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Día de sueldo */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-300">Día de cobro del sueldo</p>
                  <p className="text-[10px] text-slate-500">Define el inicio de tu mes presupuestario</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={diaSueldo ?? ''}
                  onChange={e => setDiaSueldo(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 h-10 px-3 rounded-xl border border-night-border bg-night-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                >
                  <option value="">Sin configurar</option>
                  {DIAS_SUELDO.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                {diaSueldo && (
                  <p className="text-xs text-slate-500">= día {diaSueldo} de c/mes</p>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Datos */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Datos</p>
          <Card padding="none">
            <button
              onClick={() => navigate('/categorias')}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-night-3/50 rounded-2xl transition-colors"
            >
              <div className="size-9 rounded-xl bg-night-3 flex items-center justify-center flex-shrink-0">
                <Tag className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-200">Categorías</p>
                <p className="text-xs text-slate-500">Administra categorías y subcategorías</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </Card>
        </section>

        {/* Zona de peligro */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Zona de peligro</p>
          <Card padding="none" className="divide-y divide-night-border/40">
            <button
              onClick={handleReiniciar}
              disabled={reiniciando}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gasto-500/10 rounded-t-2xl transition-colors disabled:opacity-50"
            >
              <div className="size-9 rounded-xl bg-gasto-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-4 w-4 text-gasto-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gasto-400">
                  {reiniciando ? 'Eliminando datos…' : 'Reiniciar todos los datos'}
                </p>
                <p className="text-xs text-slate-500">Elimina cuentas, movimientos, cuotas y más</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-night-3/50 rounded-b-2xl transition-colors"
            >
              <div className="size-9 rounded-xl bg-night-3 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-300">Cerrar sesión</p>
            </button>
          </Card>
        </section>

        <p className="text-center text-xs text-slate-600">QloB · Sprint 4</p>
      </div>

      <PerfilForm isOpen={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </AppLayout>
  )
}
