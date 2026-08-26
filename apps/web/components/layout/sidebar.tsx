'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, FileBarChart, LayoutDashboard, Library, LogOut, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from './theme-toggle'
import { Logo } from './logo'

const NAV_ITEMS = [
  { href: '/', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/treinos', label: 'Treinos', icon: Dumbbell },
  { href: '/exercicios', label: 'Biblioteca', icon: Library },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
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
    <aside className="flex h-screen w-60 flex-col glass border-r border-border/50">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/30 px-5">
        <Logo size="lg" />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.15)]'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 transition-all duration-200', active && 'text-primary scale-110')} aria-hidden="true" />
              <span>{label}</span>
              {active && (
                <>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-primary animate-slide-up" />
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                </>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border/30 p-3 space-y-1">
        <div className="flex justify-end px-1 pb-1">
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={sair}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}