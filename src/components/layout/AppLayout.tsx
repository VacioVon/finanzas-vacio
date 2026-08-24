import { type ReactNode } from 'react'
import { AppNav } from './AppNav'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-night-0 lg:flex">
      {/* Sidebar desktop — oculto en móvil */}
      <AppNav />

      {/* Contenido principal */}
      <main className="flex-1 pb-24 lg:pb-8 lg:ml-64">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
