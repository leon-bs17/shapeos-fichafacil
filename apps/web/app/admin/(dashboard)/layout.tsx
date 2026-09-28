'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Dumbbell,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ServerCog,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import Logo from '@/davi/components/Logo'

const links = [
  { href: '/admin', label: 'Command Center', icone: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icone: Users },
  { href: '/admin/personais', label: 'Personais', icone: UserCheck },
  { href: '/admin/exercicios', label: 'Exercícios', icone: Dumbbell },
  { href: '/admin/relatorios', label: 'Relatórios', icone: BarChart3 },
  { href: '/admin/notificacoes', label: 'Notificações', icone: BellRing },
  { href: '/admin/auditoria', label: 'Auditoria', icone: History },
  { href: '/admin/sistema', label: 'Sistema', icone: ServerCog },
  { href: '/admin/conta', label: 'Minha conta', icone: KeyRound },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const { data: user } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { data } = await supabase.from('usuarios').select('nome, email, tipo').eq('id', user.id).single()
      return data
    },
  })

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F5F7FA]" style={{ fontFamily: "'Sora', sans-serif" }}>
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col lg:flex"
        style={{
          background: 'linear-gradient(180deg,rgba(22,22,22,.96),rgba(18,18,18,.96))',
          borderRight: '1px solid rgba(255,255,255,.06)',
          boxShadow: '18px 0 50px rgba(0,0,0,.18)',
        }}
      >
        <div className="flex h-20 items-center px-5" style={{ borderBottom: '1px solid rgba(255,255,255,.055)' }}>
          <Logo size="sm" />
        </div>

        <div className="px-4 pt-5">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(34,199,199,.045)', border: '1px solid rgba(34,199,199,.12)' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#22C7C7]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Admin OS</p>
              <p className="mt-0.5 text-[9px] text-zinc-600">controle da plataforma</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4 pt-5">
          {links.map(({ href, label, icone: Icon }) => {
            const ativo = href === '/admin' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
                style={{
                  color: ativo ? '#F5F7FA' : '#71717a',
                  background: ativo ? 'rgba(34,199,199,.075)' : 'transparent',
                  border: ativo ? '1px solid rgba(34,199,199,.14)' : '1px solid transparent',
                }}
              >
                {ativo && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#22C7C7]" />}
                <Icon className="h-4 w-4" style={{ color: ativo ? '#22C7C7' : undefined }} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 p-4" style={{ borderTop: '1px solid rgba(255,255,255,.055)' }}>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-zinc-500 transition-colors hover:bg-white/[.03] hover:text-zinc-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao app
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-zinc-500 transition-colors hover:bg-red-400/[.05] hover:text-red-300">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>

        {user && (
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,.055)' }}>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-xs font-bold text-[#0E1116]" style={{ background: '#22C7C7', boxShadow: '0 0 20px rgba(34,199,199,.15)' }}>
                {user.nome?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-200">{user.nome}</p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-600">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="sticky top-0 z-40 border-b border-white/[.06] bg-[#0E1116]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <button onClick={sair} className="rounded-xl p-2 text-zinc-500" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {links.map(({ href, label, icone: Icon }) => {
            const ativo = href === '/admin' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[11px]"
                style={{
                  background: ativo ? 'rgba(34,199,199,.09)' : 'rgba(255,255,255,.025)',
                  border: ativo ? '1px solid rgba(34,199,199,.16)' : '1px solid rgba(255,255,255,.05)',
                  color: ativo ? '#22C7C7' : '#71717a',
                }}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </Link>
            )
          })}
        </nav>
      </div>

      <main className="min-h-screen px-4 py-5 md:px-6 md:py-7 lg:ml-64 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  )
}
