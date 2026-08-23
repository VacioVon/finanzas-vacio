import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={[
        'relative shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto',
        sizeClass,
        isDark
          ? 'bg-night-1 border-t border-night-border'
          : 'bg-white'
      ].join(' ')}>
        {title && (
          <div className={[
            'flex items-center justify-between px-5 py-4 border-b',
            isDark ? 'border-night-border' : 'border-slate-100'
          ].join(' ')}>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
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
        <div className="p-5 pb-8">{children}</div>
      </div>
    </div>,
    document.body
  )
}
