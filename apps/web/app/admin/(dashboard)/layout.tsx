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
  { href: '/admin', label: 'Visão geral', icone: LayoutDashboard },
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

  function linkDesktop(item: typeof contaLink) {
    const Icon = item.icone
    const ativo = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={ativo ? 'page' : undefined}
        className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/[.04]"
        style={{
          color: ativo ? '#edf2f3' : '#a9b8be',
          background: ativo ? 'rgba(255,255,255,.06)' : 'transparent',
          border: '1px solid transparent',
        }}
      >
        {ativo && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#22C7C7]" />}
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>

      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#121719] text-[#edf2f3]" style={{ fontFamily: "'Sora', sans-serif" }}>
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col lg:flex"
        style={{
          background: '#171d20',
          borderRight: '1px solid rgba(255,255,255,.06)',
          boxShadow: 'none',
        }}
      >
        <div className="flex h-20 flex-shrink-0 items-center px-5" style={{ borderBottom: '1px solid rgba(255,255,255,.055)' }}>
          <Logo size="sm" />
        </div>

        <div className="flex-shrink-0 px-4 pt-4">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(34,199,199,.045)', border: '1px solid rgba(34,199,199,.12)' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#22C7C7]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Administração</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">controle da plataforma</p>
            </div>
          </div>
        </div>

        <nav aria-label="Administração" className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[#22C7C7]">Operação</p>
          <div className="space-y-1">
            {novasFerramentas.map((item) => linkDesktop(item))}
          </div>

          <p className="mb-2 mt-5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gestão</p>
          <div className="space-y-1">
            {gestaoLinks.map((item) => linkDesktop(item))}
          </div>

          <p className="mb-2 mt-5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Conta</p>
          <div className="space-y-1">{linkDesktop(contaLink)}</div>
        </nav>

        <div className="flex-shrink-0 space-y-1 p-4" style={{ borderTop: '1px solid rgba(255,255,255,.055)' }}>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[.03] hover:text-zinc-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao app
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-red-400/[.05] hover:text-red-300">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>

        {user && (
          <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,.055)' }}>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-xs font-bold text-[#121719]" style={{ background: '#22C7C7' }}>
                {user.nome?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-200">{user.nome}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="sticky top-0 z-40 border-b border-white/[.06] bg-[#121719]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <button onClick={sair} className="rounded-xl p-2 text-muted-foreground" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <details className="mt-3 group">
          <summary className="cursor-pointer rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground">Navegar · {todosLinks.find((item) => item.href === pathname)?.label ?? 'Administração'}</summary>
          <nav aria-label="Administração no celular" className="mt-2 grid max-h-[60vh] grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-border bg-card p-2">
            {todosLinks.map((item) => linkDesktop(item))}
          </nav>
        </details>
      </div>

      <main className="min-h-screen px-4 py-5 md:px-6 md:py-7 lg:ml-64 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 hidden items-center gap-2 border-b border-border pb-4 text-xs text-muted-foreground lg:flex"><span>ShapeOS</span><span aria-hidden="true">/</span><span className="text-foreground">{todosLinks.find((item) => item.href === pathname)?.label ?? 'Administração'}</span></div>
          {children}
        </div>
      </main>
    </div>
  )
}
