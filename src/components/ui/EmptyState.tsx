import { type ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
}

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {icon && <span className="text-4xl mb-3">{icon}</span>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-[200px]">{description}</p>}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
