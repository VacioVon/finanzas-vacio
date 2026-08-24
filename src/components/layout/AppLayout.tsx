import { type ReactNode } from 'react'
import { AppNav } from './AppNav'
import { StarField } from '@/components/ui/StarField'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen bg-night-0 lg:flex">
      {/* Fondo de estrellas — fijo, detrás de todo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
        {/* Nebulosas ambientales */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 60% 45% at 80% 10%,  rgba(155,93,229,0.10) 0%, transparent 65%)',
              'radial-gradient(ellipse 50% 40% at 10% 85%,  rgba(41,121,255,0.09) 0%, transparent 60%)',
              'radial-gradient(ellipse 35% 30% at 50% 50%,  rgba(16,217,127,0.04) 0%, transparent 70%)',
            ].join(', ')
          }}
        />
      </div>

      {/* Sidebar desktop */}
      <AppNav />

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 pb-24 lg:pb-8 lg:ml-64">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
