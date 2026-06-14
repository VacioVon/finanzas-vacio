import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'full'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
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
      <div className={`relative bg-white shadow-2xl animate-slide-up ${sizeClass} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        )}
        <div className="p-5 pb-8">{children}</div>
      </div>
    </div>,
    document.body
  )
}
