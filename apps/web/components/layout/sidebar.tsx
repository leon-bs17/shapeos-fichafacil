'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, FileBarChart, LayoutDashboard, Library, LogOut, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[#181818]/90 backdrop-blur-xl md:flex">
      <div className="flex min-h-20 items-center border-b border-white/[0.06] px-5">
        <Logo size="lg" />
      </div>

      <div className="px-5 pt-6 pb-2">
        <p className="shapeos-eyebrow">Personal dashboard</p>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[#00D2D2]/10 text-[#00D2D2] border border-[#00D2D2]/25 shadow-[0_0_18px_rgba(0,210,210,.08)]'
                  : 'border border-transparent text-zinc-400 hover:bg-white/[0.035] hover:text-[#F5F5F5]'
              )}
            >
              <Icon className={cn('h-4 w-4 transition-transform', active && 'scale-110')} aria-hidden="true" />
              <span>{label}</span>
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00D2D2] shadow-[0_0_10px_#00D2D2]" /> : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-sm text-zinc-500 transition-all hover:border-red-400/15 hover:bg-red-400/[0.06] hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
