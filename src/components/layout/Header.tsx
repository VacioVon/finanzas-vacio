import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  title:     string
  showBack?: boolean
  action?:   ReactNode
}

export function Header({ title, showBack, action }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 bg-night-0/95 backdrop-blur-md border-b border-night-border/60">
      <div className="flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
        )}
        <h1 className="flex-1 text-base font-semibold text-white">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
