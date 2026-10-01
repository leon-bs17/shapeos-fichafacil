'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, FileBarChart, LayoutDashboard, Library, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: LayoutDashboard },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/treinos', label: 'Treinos', icon: Dumbbell },
  { href: '/exercicios', label: 'Biblioteca', icon: Library },
  { href: '/relatorios', label: 'Evolução', icon: FileBarChart },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/50 bg-background/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 p-2 min-w-0 flex-1 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200',
                active && 'bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform duration-200', active && 'scale-110')} />
            </div>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
