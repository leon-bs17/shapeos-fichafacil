'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  ChartColumn,
  CircleCheck,
  CircleUserRound,
  ClipboardList,
  Dumbbell,
  FileText,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import Logo from '@/davi/components/Logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'

const novasFerramentas = [
  { href: '/admin/mys', label: 'Mys · Assistente', icone: MessageCircle },
  { href: '/admin', label: 'Central de controle', icone: LayoutGrid },
  { href: '/admin/aprovacoes', label: 'Aprovações', icone: CircleCheck },
  { href: '/admin/atividade', label: 'Atividade', icone: ChartColumn },
  { href: '/admin/relatorios', label: 'Relatórios', icone: FileText },
  { href: '/admin/notificacoes', label: 'Notificações', icone: Bell },
  { href: '/admin/sistema', label: 'Sistema', icone: Settings },
]

const gestaoLinks = [
  { href: '/admin/usuarios', label: 'Usuários', icone: Users },
  { href: '/admin/personais', label: 'Personais', icone: UserRound },
  { href: '/admin/exercicios', label: 'Exercícios', icone: Dumbbell },
  { href: '/admin/auditoria', label: 'Auditoria', icone: ClipboardList },
]

const contaLink = { href: '/admin/conta', label: 'Minha conta', icone: CircleUserRound }
const todosLinks = [...novasFerramentas, ...gestaoLinks, contaLink]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const buscaRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (pathname !== '/admin/aprovacoes') return

    const focarBusca = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        buscaRef.current?.focus()
      }
    }

    window.addEventListener('keydown', focarBusca)
    return () => window.removeEventListener('keydown', focarBusca)
  }, [pathname])

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  function buscarNoAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return

    const destino = todosLinks.find((item) => item.label.toLocaleLowerCase('pt-BR').includes(termo))
    if (!destino) return

    setBusca('')
    router.push(destino.href)
  }

  function linkDesktop(item: typeof contaLink) {
    const Icon = item.icone
    const ativo = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={ativo ? 'page' : undefined}
        className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
        style={{
          color: ativo ? 'var(--shapeos-text)' : 'var(--shapeos-muted)',
          background: ativo ? 'rgba(var(--shapeos-neutral-rgb),.06)' : 'transparent',
          border: '1px solid transparent',
        }}
      >
        {ativo && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[var(--shapeos-brand)]" />}
        <Icon className="shapeos-menu-icon h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="flex-1">{item.label}</span>

      </Link>
    )
  }

  return (
    <div data-admin-route={pathname} className="min-h-screen bg-[var(--shapeos-bg)] text-[var(--shapeos-text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
      <aside
        className="shapeos-navigation fixed inset-y-0 left-0 z-50 hidden w-64 flex-col lg:flex"
        style={{
          background: 'var(--shapeos-surface)',
          borderRight: '1px solid rgba(var(--shapeos-neutral-rgb),.06)',
          boxShadow: 'none',
        }}
      >
        <div className="flex h-20 flex-shrink-0 items-center px-5" style={{ borderBottom: '1px solid rgba(var(--shapeos-neutral-rgb),.055)' }}>
          <Logo size="sm" />
        </div>

        <div className="flex-shrink-0 px-4 pt-4">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(34,199,199,.045)', border: '1px solid rgba(34,199,199,.12)' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--shapeos-brand)]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground">Administração</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">controle da plataforma</p>
            </div>
          </div>
        </div>

        <nav aria-label="Administração" className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--shapeos-brand)]">Operação</p>
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

        <div className="flex-shrink-0 space-y-1 p-4" style={{ borderTop: '1px solid rgba(var(--shapeos-neutral-rgb),.055)' }}>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
            <ArrowLeft className="shapeos-menu-icon h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" /> Voltar ao app
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-red-400/[.05] hover:text-red-300">
            <LogOut className="shapeos-menu-icon h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" /> Sair
          </button>
        </div>

        {user && (
          <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(var(--shapeos-neutral-rgb),.055)' }}>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-xs font-bold text-[var(--shapeos-on-brand)]" style={{ background: 'var(--shapeos-brand)' }}>
                {user.nome?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{user.nome}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="sticky top-0 z-40 border-b border-border bg-[var(--shapeos-bg)]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={sair} className="rounded-xl p-2 text-muted-foreground" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
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
          <div className="mb-6 hidden items-center gap-2 border-b border-border pb-4 text-xs text-muted-foreground lg:flex">
            <span>ShapeOS</span><span aria-hidden="true">/</span>
            <span className="text-foreground">{todosLinks.find((item) => item.href === pathname)?.label ?? 'Administração'}</span>
            {pathname !== '/admin/aprovacoes' && <div className="ml-auto"><ThemeToggle /></div>}
          </div>

          {pathname === '/admin/aprovacoes' ? (
            <div className="mb-6 flex items-center gap-3">
              <form onSubmit={buscarNoAdmin} className="min-w-0 flex-1 sm:max-w-[620px]">
                <label className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 text-muted-foreground shadow-[0_8px_24px_rgba(15,23,42,0.045)] backdrop-blur-xl sm:h-14 sm:px-5 dark:shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
                  <Search className="h-5 w-5 shrink-0 text-foreground/70" strokeWidth={1.8} />
                  <input
                    ref={buscaRef}
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    list="shapeos-admin-search"
                    placeholder="Buscar algo no ShapeOS..."
                    aria-label="Buscar no painel administrativo"
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <kbd className="hidden shrink-0 items-center gap-1 rounded-lg border border-border bg-accent/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:flex">
                    <span>Ctrl/⌘</span>
                    <span>K</span>
                  </kbd>
                </label>
                <datalist id="shapeos-admin-search">
                  {todosLinks.map((item) => <option key={item.href} value={item.label} />)}
                </datalist>
              </form>

              <Link
                href="/admin/notificacoes"
                aria-label="Abrir notificações"
                title="Notificações"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.045)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--shapeos-brand)]/40 hover:text-[var(--shapeos-brand)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:h-14 sm:w-14 dark:shadow-[0_10px_30px_rgba(0,0,0,0.20)]"
              >
                <Bell className="h-5 w-5" strokeWidth={1.8} />
              </Link>
              <div className="hidden lg:block"><ThemeToggle /></div>
            </div>
          ) : null}

          <div data-admin-content={pathname}>{children}</div>
        </div>
      </main>
    </div>
  )
}
