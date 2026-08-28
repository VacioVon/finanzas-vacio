import { useNavigate } from 'react-router-dom'
import {
  Wallet, Tag, Target, PiggyBank, CreditCard, ShoppingBag,
  RefreshCw, CalendarDays, Settings, ChevronRight, HandCoins
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
      className="w-full flex items-center gap-3 py-3.5 px-4 hover:bg-night-3/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
    >
      <div className="size-9 rounded-xl bg-night-3 flex items-center justify-center text-slate-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {badge ? (
        <span className="text-[10px] bg-night-3 text-slate-500 px-2 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-600" />
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

      <div className="space-y-4 pt-4 px-4 lg:px-0 pb-8">

        {/* Perfil — acceso rápido */}
        <Card padding="none">
          <button
            onClick={() => navigate('/ajustes')}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-night-3/50 rounded-2xl transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="size-11 rounded-full object-cover border border-night-border flex-shrink-0"
              />
            ) : (
              <div className="size-11 rounded-full bg-brand-500/20 flex items-center justify-center text-xl font-bold text-brand-300 flex-shrink-0">
                {profile?.nombre?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="flex-1 text-left">
              <p className="font-semibold text-white">{profile?.nombre ?? 'Usuario'}</p>
              <p className="text-xs text-slate-400">
                {profile?.moneda ?? 'CLP'}
                {profile?.fecha_sueldo ? ` · Cobro día ${profile.fecha_sueldo}` : ''}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </Card>

        {/* Módulos — en desktop grid 2×N */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Herramientas */}
          <Card padding="none" className="divide-y divide-night-border/40">
            <MenuItem
              icon={<HandCoins className="h-4 w-4" />}
              label="Por cobrar"
              description="Gastos que hiciste para otros"
              onClick={() => navigate('/cobros')}
            />
            <MenuItem
              icon={<RefreshCw className="h-4 w-4" />}
              label="Compromisos"
              description="Servicios y gastos fijos recurrentes"
              onClick={() => navigate('/compromisos')}
            />
            <MenuItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="Calendario"
              description="Próximos compromisos"
              onClick={() => navigate('/calendario')}
            />
          </Card>

          {/* Obligaciones */}
          <Card padding="none" className="divide-y divide-night-border/40">
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
            <MenuItem
              icon={<Target className="h-4 w-4" />}
              label="Presupuestos"
              description="Controla tus gastos por categoría"
              onClick={() => navigate('/presupuestos')}
            />
          </Card>

          {/* Ahorro */}
          <Card padding="none" className="divide-y divide-night-border/40">
            <MenuItem
              icon={<PiggyBank className="h-4 w-4" />}
              label="Objetivos de Ahorro"
              description="Metas y progreso de ahorro"
              onClick={() => navigate('/objetivos')}
            />
          </Card>

          {/* Config */}
          <Card padding="none" className="divide-y divide-night-border/40">
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
          </Card>
        </div>

        <p className="text-center lg:text-left text-xs text-slate-600">Quemen los Barcos</p>
      </div>
    </AppLayout>
  )
}
