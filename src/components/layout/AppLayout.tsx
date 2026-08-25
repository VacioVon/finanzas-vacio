import { type ReactNode } from 'react'
import { AppNav } from './AppNav'
import { StarField } from '@/components/ui/StarField'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background lg:flex">
      {/* Fondo de estrellas — fijo, detrás de todo, ambientación */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 60% 45% at 80% 10%,  rgba(155,93,229,0.08) 0%, transparent 65%)',
              'radial-gradient(ellipse 50% 40% at 10% 85%,  rgba(41,121,255,0.07) 0%, transparent 60%)',
              'radial-gradient(ellipse 35% 30% at 50% 50%,  rgba(16,217,127,0.03) 0%, transparent 70%)',
            ].join(', ')
          }}
        />
      </div>

      {/* Nav (sidebar en desktop, barra inferior en móvil) */}
      <AppNav />

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 pb-24 lg:pb-8 lg:ml-64">
        {/* Móvil: 1 columna, max-w-2xl centrado. Desktop: ancho completo con padding. */}
        <div className="max-w-2xl mx-auto lg:max-w-none lg:mx-0 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
