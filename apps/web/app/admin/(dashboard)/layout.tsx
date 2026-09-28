'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BellRing,
  ClipboardCheck,
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

const novasFerramentas = [
  { href: '/admin/aprovacoes', label: 'Aprovações', icone: ClipboardCheck },
  { href: '/admin/atividade', label: 'Atividade', icone: Activity },
  { href: '/admin/relatorios', label: 'Relatórios', icone: BarChart3 },
  { href: '/admin/notificacoes', label: 'Notificações', icone: BellRing },
  { href: '/admin/sistema', label: 'Sistema', icone: ServerCog },
]

const gestaoLinks = [
  { href: '/admin', label: 'Command Center', icone: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icone: Users },
  { href: '/admin/personais', label: 'Personais', icone: UserCheck },
  { href: '/admin/exercicios', label: 'Exercícios', icone: Dumbbell },
  { href: '/admin/auditoria', label: 'Auditoria', icone: History },
]

const contaLink = { href: '/admin/conta', label: 'Minha conta', icone: KeyRound }
const todosLinks = [...novasFerramentas, ...gestaoLinks, contaLink]

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

  function linkDesktop(item: typeof contaLink, destaque = false) {
    const Icon = item.icone
    const ativo = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
        style={{
          color: ativo ? '#F5F7FA' : destaque ? '#a1a1aa' : '#71717a',
          background: ativo ? 'rgba(34,199,199,.09)' : destaque ? 'rgba(255,255,255,.02)' : 'transparent',
          border: ativo ? '1px solid rgba(34,199,199,.18)' : destaque ? '1px solid rgba(255,255,255,.035)' : '1px solid transparent',
        }}
      >
        {ativo && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#22C7C7]" />}
        <Icon className="h-4 w-4" style={{ color: ativo || destaque ? '#22C7C7' : undefined }} />
        <span className="flex-1">{item.label}</span>
        {destaque && !ativo ? (
          <span className="rounded-full bg-[#22C7C7]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#22C7C7]">novo</span>
        ) : null}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F5F7FA]" style={{ fontFamily: "'Sora', sans-serif" }}>
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col lg:flex"
        style={{
          background: 'linear-gradient(180deg,rgba(22,22,22,.98),rgba(18,18,18,.98))',
          borderRight: '1px solid rgba(255,255,255,.06)',
          boxShadow: '18px 0 50px rgba(0,0,0,.18)',
        }}
      >
        <div className="flex h-20 flex-shrink-0 items-center px-5" style={{ borderBottom: '1px solid rgba(255,255,255,.055)' }}>
          <Logo size="sm" />
        </div>

        <div className="flex-shrink-0 px-4 pt-4">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(34,199,199,.045)', border: '1px solid rgba(34,199,199,.12)' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#22C7C7]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Admin OS</p>
              <p className="mt-0.5 text-[9px] text-zinc-600">controle da plataforma</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-[#22C7C7]">Novas ferramentas</p>
          <div className="space-y-1">
            {novasFerramentas.map((item) => linkDesktop(item, true))}
          </div>

          <p className="mb-2 mt-5 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600">Gestão</p>
          <div className="space-y-1">
            {gestaoLinks.map((item) => linkDesktop(item))}
          </div>

          <p className="mb-2 mt-5 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600">Conta</p>
          <div className="space-y-1">{linkDesktop(contaLink)}</div>
        </nav>

        <div className="flex-shrink-0 space-y-1 p-4" style={{ borderTop: '1px solid rgba(255,255,255,.055)' }}>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-white/[.03] hover:text-zinc-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao app
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-red-400/[.05] hover:text-red-300">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>

        {user && (
          <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,.055)' }}>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-xs font-bold text-[#0E1116]" style={{ background: '#22C7C7' }}>
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

      <div className="sticky top-0 z-40 border-b border-white/[.06] bg-[#0E1116]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <button onClick={sair} className="rounded-xl p-2 text-zinc-500" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#22C7C7]">Menu Admin</p>
        <nav className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {todosLinks.map(({ href, label, icone: Icon }) => {
            const ativo = href === '/admin' ? pathname === href : pathname.startsWith(href)
            const novo = novasFerramentas.some((item) => item.href === href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[11px]"
                style={{
                  background: ativo ? 'rgba(34,199,199,.09)' : novo ? 'rgba(34,199,199,.035)' : 'rgba(255,255,255,.025)',
                  border: ativo ? '1px solid rgba(34,199,199,.16)' : novo ? '1px solid rgba(34,199,199,.09)' : '1px solid rgba(255,255,255,.05)',
                  color: ativo || novo ? '#22C7C7' : '#71717a',
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
