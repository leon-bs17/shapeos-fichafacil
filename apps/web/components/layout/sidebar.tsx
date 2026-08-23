'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, FileBarChart, LayoutDashboard, Library, LogOut, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from './theme-toggle'

const NAV_ITEMS = [
  { href: '/', label: 'Visao Geral', icon: LayoutDashboard },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/treinos', label: 'Treinos', icon: Dumbbell },
  { href: '/exercicios', label: 'Biblioteca', icon: Library },
  { href: '/relatorios', label: 'Relatorios', icon: FileBarChart },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card/80 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Dumbbell className="h-4.5 w-4.5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight">
          Shape<span className="text-primary">OS</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 transition-colors', active && 'text-primary')} />
              {label}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <div className="flex justify-end px-1 pb-1">
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={sair}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
