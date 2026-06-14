import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5'
}

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-card',
        paddingClasses[padding],
        className
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
