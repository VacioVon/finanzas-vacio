import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ArrowLeftRight, BarChart2, MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { MovimientoForm } from '@/components/modules/movimientos/MovimientoForm'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
}

const navItems: NavItem[] = [
  { to: '/', icon: <Home className="h-5 w-5" />, label: 'Home' },
  { to: '/movimientos', icon: <ArrowLeftRight className="h-5 w-5" />, label: 'Movimientos' },
]

const navItemsRight: NavItem[] = [
  { to: '/analisis', icon: <BarChart2 className="h-5 w-5" />, label: 'Análisis', disabled: true },
  { to: '/mas', icon: <MoreHorizontal className="h-5 w-5" />, label: 'Más' },
]

export function BottomNav() {
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-nav border-t border-slate-100">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 pb-safe">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'flex flex-col items-center gap-0.5 py-3 px-4 rounded-2xl transition-colors',
                isActive
                  ? 'text-primary-600'
                  : 'text-slate-400 hover:text-slate-600'
              ].join(' ')}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* FAB central */}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-primary-600 text-white shadow-card-lg hover:bg-primary-700 active:bg-primary-800 transition-colors"
          >
            <Plus className="h-6 w-6" />
          </button>

          {navItemsRight.map(item => (
            item.disabled ? (
              <button
                key={item.to}
                className="flex flex-col items-center gap-0.5 py-3 px-4 rounded-2xl text-slate-300 cursor-not-allowed"
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => [
                  'flex flex-col items-center gap-0.5 py-3 px-4 rounded-2xl transition-colors',
                  isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
                ].join(' ')}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            )
          ))}
        </div>
      </nav>

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
