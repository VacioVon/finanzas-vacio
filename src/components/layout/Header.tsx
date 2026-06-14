import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  title: string
  showBack?: boolean
  action?: ReactNode
}

export function Header({ title, showBack, action }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
        )}
        <h1 className="flex-1 text-base font-semibold text-slate-900">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
