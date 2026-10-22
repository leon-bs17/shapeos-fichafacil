'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({
  open,
  onClose,
  titulo,
  children,
  className,
  admin = false,
  personal = false,
}: {
  open: boolean
  onClose: () => void
  titulo: string
  children: ReactNode
  className?: string
  admin?: boolean
  personal?: boolean
}) {
  if (personal) return <AdminModal personal open={open} onClose={onClose} titulo={titulo} className={className}>{children}</AdminModal>
  if (admin) return <AdminModal open={open} onClose={onClose} titulo={titulo} className={className}>{children}</AdminModal>
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/50 bg-card p-6 shadow-2xl animate-slide-up',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AdminModal({ open, onClose, titulo, children, className, personal = false }: {
  open: boolean
  onClose: () => void
  titulo: string
  children: ReactNode
  className?: string
  personal?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const focused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (personal) document.body.style.overflow = 'hidden'
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.close()
      if (personal) document.body.style.overflow = previousOverflow
      focused?.focus()
    }
  }, [open, personal])

  return <dialog ref={ref} data-admin-modal={personal ? undefined : true} data-personal-modal={personal ? true : undefined} aria-labelledby={titleId}
    className={cn('w-full max-w-lg rounded-2xl p-6', className)}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}>
    {open && <>
      <div data-personal-modal-heading={personal ? true : undefined} className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-lg font-bold tracking-tight">{titulo}</h2>
        <button type="button" onClick={onClose} autoFocus
          className="personal-command grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Fechar" data-shapeos-tooltip="Fechar janela"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </>}
  </dialog>
}

