'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'info' | 'warning' | 'danger'
type ToastItem = { id: number; title: string; description?: string; tone: ToastTone }

const ToastContext = createContext<{ toast: (item: Omit<ToastItem, 'id'>) => void } | null>(null)

const tones = {
  success: { icon: CheckCircle2, className: 'text-success' },
  info: { icon: Info, className: 'text-info' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  danger: { icon: XCircle, className: 'text-destructive' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.round(Math.random() * 1000)
    setItems((current) => [...current.slice(-3), { ...item, id }])
    window.setTimeout(() => remove(id), 4200)
  }, [remove])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((item) => {
          const tone = tones[item.tone]
          const Icon = tone.icon
          return (
            <div key={item.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-popover/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(255,255,255,0.07)] backdrop-blur-xl">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.className)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p> : null}
              </div>
              <button type="button" onClick={() => remove(item.id)} className="rounded-lg p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground" aria-label="Fechar notificação">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return context
}
