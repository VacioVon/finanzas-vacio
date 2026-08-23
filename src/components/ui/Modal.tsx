import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { StarField } from './StarField'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'full'
  theme?: 'light' | 'dark'
}

export function Modal({ isOpen, onClose, title, children, size = 'md', theme = 'light' }: ModalProps) {
  const isDark = theme === 'dark'

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClass = size === 'full'
    ? 'w-full h-full rounded-none'
    : size === 'sm'
    ? 'w-full max-w-sm rounded-t-3xl'
    : 'w-full max-w-lg rounded-t-3xl'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={[
        'relative shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto overflow-x-hidden',
        sizeClass,
        isDark ? 'border-t border-night-border' : 'bg-white'
      ].join(' ')}
        style={isDark ? {
          backgroundColor: '#23212C',
          boxShadow: '0 -1px 0 0 rgba(155,93,229,0.35), 0 0 40px 0 rgba(155,93,229,0.12), 0 -20px 60px 0 rgba(41,121,255,0.08)'
        } : undefined}
      >
        {/* Starfield + nebula — solo en dark */}
        {isDark && (
          <>
            <StarField className="opacity-90 rounded-t-3xl" />
            {/* Nebulosa: violeta fuerte arriba-derecha, cian suave abajo-izquierda, coral muy sutil al centro */}
            <div
              className="absolute inset-0 pointer-events-none rounded-t-3xl"
              style={{
                background: [
                  'radial-gradient(ellipse 70% 50% at 85% -5%,  rgba(155,93,229,0.28) 0%, transparent 65%)',
                  'radial-gradient(ellipse 50% 35% at 5%  95%,  rgba(41,121,255,0.20) 0%, transparent 60%)',
                  'radial-gradient(ellipse 40% 30% at 50% 40%,  rgba(244,100,95,0.06) 0%, transparent 70%)',
                ].join(', ')
              }}
            />
          </>
        )}

        {/* Header */}
        {title && (
          <div className={[
            'relative z-10 flex items-center justify-between px-5 py-4 border-b',
            isDark ? 'border-night-border/60' : 'border-slate-100'
          ].join(' ')}>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className={[
                'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              ].join(' ')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 p-5 pb-8">{children}</div>
      </div>
    </div>,
    document.body
  )
}
