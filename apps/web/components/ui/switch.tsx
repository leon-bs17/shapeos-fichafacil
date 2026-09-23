'use client'

import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-7 w-12 rounded-full p-0.5 transition duration-300 outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
        className
      )}
    >
      <span className={cn('block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300', checked && 'translate-x-5')} />
    </button>
  )
}
