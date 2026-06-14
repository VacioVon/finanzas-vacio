import { useNavigate } from 'react-router-dom'
import {
  Wallet, Tag, Target, PiggyBank, CreditCard, ShoppingBag,
  RefreshCw, CalendarDays, Settings, ChevronRight
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'

interface MenuItemProps {
  icon:         React.ReactNode
  label:        string
  description?: string
  onClick:      () => void
  badge?:       string
}

function MenuItem({ icon, label, description, onClick, badge }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 px-4 hover:bg-slate-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      {badge ? (
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-300" />
      )}
    </button>
  )
}

export function MasPage() {
  const navigate    = useNavigate()
  const { profile } = useAuthStore()

  return (
    <AppLayout>
      <Header title="Más" />

      <div className="space-y-4 pt-4 px-4 pb-6">

        {/* Perfil — acceso rápido */}
        <Card padding="none">
          <button
            onClick={() => navigate('/ajustes')}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 rounded-2xl transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover border border-slate-200 flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700 flex-shrink-0">
                {profile?.nombre?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-900">{profile?.nombre ?? 'Usuario'}</p>
              <p className="text-xs text-slate-400">
                {profile?.moneda ?? 'CLP'}
                {profile?.fecha_sueldo ? ` · Cobro día ${profile.fecha_sueldo}` : ''}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
        </Card>

        {/* Módulos Sprint 3 — nuevos */}
        <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100">
          <MenuItem
            icon={<RefreshCw className="h-4 w-4" />}
            label="Suscripciones"
            description="Servicios y cobros recurrentes"
            onClick={() => navigate('/suscripciones')}
          />
          <MenuItem
            icon={<CalendarDays className="h-4 w-4" />}
            label="Calendario"
            description="Próximos compromisos (30 días)"
            onClick={() => navigate('/calendario')}
          />
        </div>

        {/* Módulos Sprint 3 — existentes */}
        <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100">
          <MenuItem
            icon={<ShoppingBag className="h-4 w-4" />}
            label="Compras en cuotas"
            description="Seguimiento de cuotas en tarjeta"
            onClick={() => navigate('/cuotas')}
          />
          <MenuItem
            icon={<CreditCard className="h-4 w-4" />}
            label="Deudas"
            description="Créditos y préstamos externos"
            onClick={() => navigate('/deudas')}
          />
        </div>

        {/* Módulos Sprint 2 */}
        <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100">
          <MenuItem
            icon={<Target className="h-4 w-4" />}
            label="Presupuestos"
            description="Controla tus gastos por categoría"
            onClick={() => navigate('/presupuestos')}
          />
          <MenuItem
            icon={<PiggyBank className="h-4 w-4" />}
            label="Objetivos de Ahorro"
            description="Metas y progreso de ahorro"
            onClick={() => navigate('/objetivos')}
          />
        </div>

        {/* Configuración */}
        <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100">
          <MenuItem
            icon={<Wallet className="h-4 w-4" />}
            label="Cuentas"
            description="Administra tus cuentas"
            onClick={() => navigate('/cuentas')}
          />
          <MenuItem
            icon={<Tag className="h-4 w-4" />}
            label="Categorías"
            description="Categorías y subcategorías"
            onClick={() => navigate('/categorias')}
          />
          <MenuItem
            icon={<Settings className="h-4 w-4" />}
            label="Ajustes"
            description="Perfil, tema, moneda, sueldo"
            onClick={() => navigate('/ajustes')}
          />
        </div>

        <p className="text-center text-xs text-slate-300 pb-2">Finanzas Vacío v3.0 · Sprint 3</p>
      </div>
    </AppLayout>
  )
}
