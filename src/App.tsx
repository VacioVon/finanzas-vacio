import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAuthListener } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { MovimientosPage } from '@/pages/MovimientosPage'
import { CuentasPage } from '@/pages/CuentasPage'
import { CategoriasPage } from '@/pages/CategoriasPage'
import { PresupuestosPage } from '@/pages/PresupuestosPage'
import { ObjetivosPage } from '@/pages/ObjetivosPage'
import { DeudasPage } from '@/pages/DeudasPage'
import { CuotasPage } from '@/pages/CuotasPage'
import { MasPage } from '@/pages/MasPage'
import { SuscripcionesPage } from '@/pages/SuscripcionesPage'
import { CalendarioPage } from '@/pages/CalendarioPage'
import { AjustesPage }   from '@/pages/AjustesPage'
import { AnalisisPage }  from '@/pages/AnalisisPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">💰</span>
          <p className="text-sm text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) return null

  return user ? <Navigate to="/" replace /> : <>{children}</>
}

function useApplyTheme() {
  const { profile } = useAuthStore()
  const tema = profile?.tema ?? 'dark'

  useEffect(() => {
    const root = document.documentElement
    const mq   = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      if (tema === 'dark')  { root.classList.add('dark') }
      else if (tema === 'light') { root.classList.remove('dark') }
      else { mq.matches ? root.classList.add('dark') : root.classList.remove('dark') }
    }

    apply()

    if (tema === 'auto') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [tema])
}

export function App() {
  useAuthListener()
  useApplyTheme()

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Rutas privadas — Sprint 1 */}
      <Route path="/"            element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/movimientos" element={<PrivateRoute><MovimientosPage /></PrivateRoute>} />
      <Route path="/cuentas"     element={<PrivateRoute><CuentasPage /></PrivateRoute>} />
      <Route path="/categorias"  element={<PrivateRoute><CategoriasPage /></PrivateRoute>} />
      <Route path="/mas"         element={<PrivateRoute><MasPage /></PrivateRoute>} />

      {/* Rutas privadas — Sprint 2 */}
      <Route path="/presupuestos" element={<PrivateRoute><PresupuestosPage /></PrivateRoute>} />
      <Route path="/objetivos"    element={<PrivateRoute><ObjetivosPage /></PrivateRoute>} />

      {/* Rutas privadas — Sprint 3 */}
      <Route path="/deudas"  element={<PrivateRoute><DeudasPage /></PrivateRoute>} />
      <Route path="/cuotas"  element={<PrivateRoute><CuotasPage /></PrivateRoute>} />

      {/* Rutas privadas — Sprint 3 cierre */}
      <Route path="/suscripciones" element={<PrivateRoute><SuscripcionesPage /></PrivateRoute>} />
      <Route path="/calendario"    element={<PrivateRoute><CalendarioPage /></PrivateRoute>} />
      <Route path="/ajustes"       element={<PrivateRoute><AjustesPage /></PrivateRoute>} />

      {/* Rutas privadas — Sprint 4 */}
      <Route path="/analisis" element={<PrivateRoute><AnalisisPage /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
