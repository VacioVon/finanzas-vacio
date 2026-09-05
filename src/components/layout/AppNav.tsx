import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, ArrowLeftRight, BarChart2, MoreHorizontal, Plus,
  Wallet, CalendarDays, HandCoins, Settings, ClipboardList
} from 'lucide-react'
import { useState } from 'react'
import { MovimientoForm } from '@/components/modules/movimientos/MovimientoForm'
import { useAuthStore } from '@/store/authStore'

// Items visibles en bottom nav móvil (4 + FAB)
const mobileNav = [
  { to: '/',            icon: Home,          label: 'Inicio'      },
  { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/analisis',    icon: BarChart2,      label: 'Análisis'    },
  { to: '/mas',         icon: MoreHorizontal, label: 'Más'         },
]

// Items del sidebar desktop — agrupados
const desktopNavPrimary = [
  { to: '/',            icon: Home,          label: 'Inicio'      },
  { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/analisis',    icon: BarChart2,      label: 'Análisis'    },
  { to: '/calendario',  icon: CalendarDays,   label: 'Calendario'  },
]

const desktopNavSecondary = [
  { to: '/cuentas',      icon: Wallet,         label: 'Cuentas'      },
  { to: '/compromisos',  icon: ClipboardList,  label: 'Compromisos'  },
  { to: '/cobros',       icon: HandCoins,      label: 'Por cobrar'   },
  { to: '/mas',          icon: MoreHorizontal, label: 'Más'          },
  { to: '/ajustes',      icon: Settings,       label: 'Ajustes'      },
]

function SidebarNavLink({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => [
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group',
        isActive
          ? 'bg-brand-500/12 text-brand-300 border-l-2 border-brand-500 pl-[10px]'
          : 'text-slate-400 hover:text-white hover:bg-night-2/60 border-l-2 border-transparent pl-[10px]'
      ].join(' ')}
    >
      <Icon className="size-[18px] flex-shrink-0" />
      {label}
    </NavLink>
  )
}

export function AppNav() {
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  return (
    <>
      {/* ── Móvil: barra inferior ──────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-night-0/95 backdrop-blur-md border-t border-night-border">
        <div className="flex items-center justify-around px-2 pb-safe">
          {mobileNav.slice(0, 2).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'flex flex-col items-center gap-0.5 py-3 px-4 rounded-2xl transition-colors',
                isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              ].join(' ')}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* FAB central — protagonista móvil */}
          <button
            onClick={() => setShowForm(true)}
            aria-label="Nuevo movimiento"
            className="flex items-center justify-center size-14 -mt-5 rounded-full bg-brand-500 text-white shadow-glow-brand hover:bg-brand-400 active:bg-brand-600 transition-colors"
          >
            <Plus className="h-6 w-6" />
          </button>

          {mobileNav.slice(2).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => [
                'flex flex-col items-center gap-0.5 py-3 px-4 rounded-2xl transition-colors',
                isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              ].join(' ')}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Desktop: sidebar izquierdo ─────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:z-40 bg-night-0 border-r border-night-border">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-night-border/60">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-brand flex-shrink-0">
              <span className="text-base">⚡</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">Quemen los Barcos</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Control financiero personal</p>
            </div>
          </div>
        </div>

        {/* Botón "Nuevo movimiento" — protagonista desktop */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 active:bg-brand-600 transition-colors shadow-glow-brand"
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </button>
        </div>

        {/* Nav primaria */}
        <nav className="px-3 py-2 space-y-0.5">
          {desktopNavPrimary.map(item => (
            <SidebarNavLink key={item.to} {...item} end={item.to === '/'} />
          ))}
        </nav>

        {/* Separador */}
        <div className="mx-4 my-2 border-t border-night-border/50" />

        {/* Nav secundaria */}
        <nav className="px-3 pb-2 space-y-0.5">
          {desktopNavSecondary.map(item => (
            <SidebarNavLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Perfil usuario — abajo */}
        <div className="mt-auto border-t border-night-border/60 px-4 py-4">
          <NavLink
            to="/ajustes"
            className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="size-8 rounded-full object-cover border border-night-border" />
            ) : (
              <div className="size-8 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-300 flex-shrink-0">
                {profile?.nombre?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-300 truncate">{profile?.nombre ?? 'Usuario'}</p>
              <p className="text-[10px] text-slate-500">{profile?.moneda ?? 'CLP'}</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Formulario compartido */}
      <MovimientoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false)
          navigate('/movimientos')
        }}
      />
    </>
  )
}
