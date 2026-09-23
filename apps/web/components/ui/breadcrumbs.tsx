import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {index > 0 ? <ChevronRight className="h-3 w-3 opacity-50" /> : null}
          {item.href ? <Link href={item.href} className="transition hover:text-foreground">{item.label}</Link> : <span className="text-foreground">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}
