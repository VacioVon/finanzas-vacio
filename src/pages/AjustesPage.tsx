import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Tag, LogOut, ChevronRight, Moon, Sun, Monitor, DollarSign, CalendarDays
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PerfilForm } from '@/components/modules/perfil/PerfilForm'
import { useAuthStore } from '@/store/authStore'
import { useUpdatePerfil } from '@/hooks/usePerfil'
import { signOut } from '@/services/auth.service'

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
  const [perfilOpen, setPerfilOpen] = useState(false)

  const temaActual    = (profile?.tema ?? 'auto') as Tema
  const monedaActual  = profile?.moneda ?? 'CLP'
  const diaSueldo     = profile?.fecha_sueldo

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

  return (
    <AppLayout>
      <Header title="Ajustes" />

      <div className="px-4 pt-4 space-y-5 pb-6">

        {/* Perfil */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">Perfil</p>
          <Card padding="none">
            <button
              onClick={() => setPerfilOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700 flex-shrink-0">
                  {profile?.nombre?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900">{profile?.nombre ?? 'Usuario'}</p>
                <p className="text-xs text-slate-400">Nombre y foto de perfil</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </Card>
        </section>

        {/* Apariencia */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">Apariencia</p>
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Tema</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TEMA_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTema(opt.value)}
                  className={[
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs font-medium',
                    temaActual === opt.value
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  ].join(' ')}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">La opción Sistema sigue la configuración de tu dispositivo.</p>
          </Card>
        </section>

        {/* Preferencias financieras */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">Finanzas</p>
          <Card padding="none" className="divide-y divide-slate-100">

            {/* Moneda */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">Moneda</p>
              </div>
              <div className="flex gap-2">
                {MONEDAS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMoneda(m.value)}
                    className={[
                      'flex-1 py-2 px-2 rounded-xl border text-xs font-medium transition-all',
                      monedaActual === m.value
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
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
                  <p className="text-sm font-medium text-slate-700">Día de cobro del sueldo</p>
                  <p className="text-[10px] text-slate-400">Define el inicio de tu mes presupuestario</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={diaSueldo ?? ''}
                  onChange={e => setDiaSueldo(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-400"
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">Datos</p>
          <Card padding="none">
            <button
              onClick={() => navigate('/categorias')}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Tag className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">Categorías</p>
                <p className="text-xs text-slate-400">Administra categorías y subcategorías</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </Card>
        </section>

        {/* Sesión */}
        <section>
          <Card padding="none">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-danger-50 rounded-2xl transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-danger-50 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-danger-600" />
              </div>
              <p className="text-sm font-medium text-danger-600">Cerrar sesión</p>
            </button>
          </Card>
        </section>

        <p className="text-center text-xs text-slate-300">Finanzas Vacío v3.0 · Sprint 3</p>
      </div>

      <PerfilForm isOpen={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </AppLayout>
  )
}
