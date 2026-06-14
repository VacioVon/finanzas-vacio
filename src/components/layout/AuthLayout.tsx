import { type ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <span className="text-3xl">💰</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Finanzas Vacío</h1>
            <p className="text-primary-200 text-sm mt-1">Tu asistente financiero personal</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
