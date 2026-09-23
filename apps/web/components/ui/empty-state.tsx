import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-7' : 'min-h-64 py-12', className)}>
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-foreground/[0.035] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
