import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const SelectField = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-2xl bg-field pl-3.5 pr-10 text-sm text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.72)] outline-none transition hover:shadow-[inset_0_0_0_1px_hsl(var(--border))] focus:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.7),0_0_0_3px_hsl(var(--primary)/0.12)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
)
SelectField.displayName = 'SelectField'
