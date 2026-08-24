import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ArrowLeftRight, CalendarDays, MoreHorizontal, Plus, BarChart2 } from 'lucide-react'
import { useState } from 'react'
import { MovimientoForm } from '@/components/modules/movimientos/MovimientoForm'

const navItems = [
  { to: '/',            icon: Home,            label: 'Inicio'       },
  { to: '/movimientos', icon: ArrowLeftRight,   label: 'Movimientos'  },
  { to: '/calendario',  icon: CalendarDays,     label: 'Calendario'   },
  { to: '/mas',         icon: MoreHorizontal,   label: 'Más'          },
]

export function AppNav() {
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {/* ── Mobile: barra inferior ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-night-1/95 backdrop-blur-md border-t border-night-border">
        <div className="flex items-center justify-around px-2 pb-safe">
          {navItems.slice(0, 2).map(item => (
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

          {/* FAB central */}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-brand-500 text-white shadow-glow-brand hover:bg-brand-600 active:bg-brand-700 transition-colors"
          >
            <Plus className="h-6 w-6" />
          </button>

          {navItems.slice(2).map(item => (
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
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:z-40 bg-night-1 border-r border-night-border">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-night-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-brand">
              <span className="text-sm">⚡</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Quemen los</p>
              <p className="text-sm font-bold text-brand-400 -mt-0.5">Barcos</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              ].join(' ')}
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* FAB desktop */}
        <div className="px-3 pb-6 border-t border-night-border/60 pt-4">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 active:bg-brand-700 transition-colors shadow-glow-brand"
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </button>
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
