import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type BannerTone = 'info' | 'success' | 'warning' | 'danger'

const config = {
  info: { icon: Info, shell: 'bg-info/8 text-foreground', iconClass: 'text-info' },
  success: { icon: CheckCircle2, shell: 'bg-success/8 text-foreground', iconClass: 'text-success' },
  warning: { icon: AlertTriangle, shell: 'bg-warning/10 text-foreground', iconClass: 'text-warning' },
  danger: { icon: AlertCircle, shell: 'bg-destructive/10 text-foreground', iconClass: 'text-destructive' },
} satisfies Record<BannerTone, { icon: typeof Info; shell: string; iconClass: string }>

export function Banner({
  title,
  children,
  tone = 'info',
  action,
  onDismiss,
  className,
}: {
  title?: string
  children: ReactNode
  tone?: BannerTone
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}) {
  const item = config[tone]
  const Icon = item.icon
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]', item.shell, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', item.iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className="mt-0.5 text-sm leading-6 text-muted-foreground">{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground" aria-label="Fechar aviso">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
