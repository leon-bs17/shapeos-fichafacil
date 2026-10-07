'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChartColumn,
  CircleCheck,
  CircleUserRound,
  ClipboardList,
  Dumbbell,
  FileText,
  LayoutGrid,
  LogOut,
  Megaphone,
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
import { NotificationBell } from '@/components/layout/notification-bell'

const novasFerramentas = [
  { href: '/admin/mys', label: 'Mys · Assistente', icone: MessageCircle },
  { href: '/admin', label: 'Central de controle', icone: LayoutGrid },
  { href: '/admin/aprovacoes', label: 'Aprovações', icone: CircleCheck },
  { href: '/admin/atividade', label: 'Atividade', icone: ChartColumn },
  { href: '/admin/relatorios', label: 'Relatórios', icone: FileText },
  { href: '/admin/comunicados', label: 'Comunicados', icone: Megaphone },
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <NotificationBell />
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
          <div data-admin-breadcrumb className="admin-breadcrumb mb-6 hidden items-center gap-2 border-b border-border pb-4 text-xs text-muted-foreground lg:flex">
            <span>ShapeOS</span><span aria-hidden="true">/</span>
            <span className="text-foreground">{todosLinks.find((item) => item.href === pathname)?.label ?? 'Administração'}</span>
            <div className="ml-auto flex items-center gap-2"><NotificationBell /><ThemeToggle /></div>
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

            </div>
          ) : null}

          <div data-admin-content={pathname}>{children}</div>
        </div>
      </main>

      <style jsx global>{`

        /* Shared search geometry and focus state for every admin search. */
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) {
          display:flex!important; align-items:center!important; gap:13px!important;
          position:relative!important; min-width:0!important; height:48px!important;
          padding:0 16px!important; border:1px solid var(--admin-search-border)!important;
          border-radius:11px!important; background:var(--admin-search-surface)!important;
          color:var(--admin-search-muted)!important; box-shadow:none!important;
          transition:border-color .15s!important;
        }
        html.light [data-admin-route] {
          --admin-search-surface:#fcfdf9; --admin-search-border:#d7ded3;
          --admin-search-text:#162623; --admin-search-muted:#5f6f68;
          --admin-search-placeholder:#7b8983; --admin-search-accent:#129b89;
        }
        html.dark [data-admin-route] {
          --admin-search-surface:#091c18; --admin-search-border:#1c4037;
          --admin-search-text:#f5faf9; --admin-search-muted:#a3becd;
          --admin-search-placeholder:#a3becd; --admin-search-accent:#00e9df;
        }
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]):focus-within {
          border-color:var(--admin-search-accent)!important; box-shadow:none!important;
        }
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) > svg {
          position:static!important; inset:auto!important; transform:none!important;
          translate:none!important; align-self:center!important; margin:0!important; width:19px!important;
          height:19px!important; flex-shrink:0!important; color:var(--admin-search-muted)!important;
        }
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) > input {
          width:100%!important; min-width:0!important; flex:1!important;
          height:100%!important; min-height:0!important; padding:0!important;
          border:0!important; border-radius:0!important; background:transparent!important;
          color:var(--admin-search-text)!important; font-family:'Sora',sans-serif!important;
          font-size:13px!important; font-weight:400!important; line-height:1.5!important;
          outline:none!important; box-shadow:none!important;
        }
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) > input::placeholder {
          color:var(--admin-search-placeholder)!important; font-weight:400!important;
        }
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) > input:focus,
        html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) > input:focus-visible {
          outline:none!important; box-shadow:none!important;
        }
        @media(max-width:767px) {
          html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) > input { font-size:16px!important; }
        }
        @media(prefers-reduced-motion:reduce) {
          html:is(.light,.dark) [data-admin-route] [data-admin-content] :is([data-admin-search], .approvals-workspace section[data-approvals-filters] [data-admin-search]) { transition:none!important; }
        }

        html [data-admin-route="/admin/aprovacoes"] main > div > .admin-breadcrumb[data-admin-breadcrumb] {
          border-bottom-width:1px!important; border-bottom-style:solid!important;
        }
        html:not(.dark) [data-admin-route="/admin/aprovacoes"] main > div > .admin-breadcrumb[data-admin-breadcrumb] {
          border-bottom-color:#d7ded3!important;
        }
        html.dark [data-admin-route="/admin/aprovacoes"] main > div > .admin-breadcrumb[data-admin-breadcrumb] {
          border-bottom-color:#2e4239!important;
        }

        /* Keep the approvals top bar on the shared dashboard baseline. */
        @media(min-width:1024px) {
          html [data-admin-route="/admin/aprovacoes"] main { padding-top:28px!important; }
          html [data-admin-route="/admin/aprovacoes"] main > div > .admin-breadcrumb[data-admin-breadcrumb] {
            display:flex!important; position:relative!important; align-items:center!important;
            height:auto!important; min-height:0!important; margin:0 0 24px!important; padding:0 0 16px!important;
            top:auto!important; transform:none!important;
          }
        }
        html:not(.dark) [data-admin-route="/admin/aprovacoes"] .admin-breadcrumb[data-admin-breadcrumb] > span:nth-child(-n+2) {
          color:hsl(240 3.8% 46.1%)!important;
        }
        html.dark [data-admin-route="/admin/aprovacoes"] .admin-breadcrumb[data-admin-breadcrumb] > span:nth-child(-n+2) {
          color:hsl(196.88 24.24% 74.12%)!important;
        }

        [data-admin-content] .eyebrow,
        [data-admin-content] .control-heading-copy > p:first-child,
        [data-admin-content] [data-approvals-hero] div:has(> h1) > div:first-child,
        [data-admin-content] :is(p, div)[class*="uppercase"]:has(+ h1) {
          display:inline-flex!important; align-items:center; width:fit-content; max-width:100%;
          gap:7px!important; padding:6px 16px!important;
          border:1px solid var(--shapeos-brand)!important; border-radius:999px!important;
          background:transparent!important; color:var(--shapeos-brand)!important;
          font-size:10px!important; line-height:1.4!important; font-weight:650!important;
          letter-spacing:.1em!important; text-transform:uppercase;
          margin-bottom:17px!important; box-shadow:none!important;
        }
        [data-admin-content] .eyebrow > svg,
        [data-admin-content] .control-heading-copy > p:first-child > svg,
        [data-admin-content] [data-approvals-hero] div:has(> h1) > div:first-child > svg,
        [data-admin-content] :is(p, div)[class*="uppercase"]:has(+ h1) > svg { display:none!important; }

        [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-hero] h1,
        [data-admin-route="/admin/atividade"] [data-admin-content] .activity-workspace .activity-hero h1 {
          font-family:'Sora',sans-serif!important; font-size:46px!important;
          font-weight:800!important; line-height:1.12!important; letter-spacing:-.045em!important;
        }
        @media(max-width:639px) {
          [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-hero] h1,
          [data-admin-route="/admin/atividade"] [data-admin-content] .activity-workspace .activity-hero h1 { font-size:32px!important; }
        }

        [data-admin-route] [data-admin-content] .control-center .control-heading h1,
        [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1,
        [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1,
        [data-admin-route] [data-admin-content] .reports-workspace .hero h1,
        [data-admin-route] [data-admin-content] .notices-workspace .hero h1,
        [data-admin-route] [data-admin-content] .system-workspace .hero h1 {
          font-family:'Sora',sans-serif!important; font-size:46px!important;
          font-weight:800!important; line-height:1.12!important;
          letter-spacing:-.045em!important; color:#112B2A!important;
        }
        [data-admin-route] [data-admin-content] .control-center .control-heading h1 span,
        [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1 span,
        [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1 span,
        [data-admin-route] [data-admin-content] .reports-workspace .hero h1 span,
        [data-admin-route] [data-admin-content] .notices-workspace .hero h1 span,
        [data-admin-route] [data-admin-content] .system-workspace .hero h1 span { color:#008D85!important; }
        [data-admin-route] [data-admin-content] .control-center .control-heading h1 + p,
        [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1 + p,
        [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1 + p,
        [data-admin-route] [data-admin-content] .reports-workspace .hero h1 + p,
        [data-admin-route] [data-admin-content] .notices-workspace .hero h1 + p,
        [data-admin-route] [data-admin-content] .system-workspace .hero h1 + p {
          font-family:'Sora',sans-serif!important; font-size:16px!important;
          font-weight:400!important; line-height:1.6!important;
          color:#53717E!important; margin-top:13px!important;
        }
        html.dark [data-admin-route] [data-admin-content] .control-center .control-heading h1,
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1,
        html.dark [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1,
        html.dark [data-admin-route] [data-admin-content] .reports-workspace .hero h1,
        html.dark [data-admin-route] [data-admin-content] .notices-workspace .hero h1,
        html.dark [data-admin-route] [data-admin-content] .system-workspace .hero h1 { color:#F5FAF9!important; }
        html.dark [data-admin-route] [data-admin-content] .control-center .control-heading h1 span,
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1 span,
        html.dark [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1 span,
        html.dark [data-admin-route] [data-admin-content] .reports-workspace .hero h1 span,
        html.dark [data-admin-route] [data-admin-content] .notices-workspace .hero h1 span,
        html.dark [data-admin-route] [data-admin-content] .system-workspace .hero h1 span { color:#00E9DF!important; }
        html.dark [data-admin-route] [data-admin-content] .control-center .control-heading h1 + p,
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1 + p,
        html.dark [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1 + p,
        html.dark [data-admin-route] [data-admin-content] .reports-workspace .hero h1 + p,
        html.dark [data-admin-route] [data-admin-content] .notices-workspace .hero h1 + p,
        html.dark [data-admin-route] [data-admin-content] .system-workspace .hero h1 + p { color:#A3BECD!important; }
        [data-admin-route="/admin/mys"] [data-admin-content] section > header h1 { color:#112B2A!important; }
        [data-admin-route="/admin/mys"] [data-admin-content] section > header h1 + p { color:#53717E!important; }
        html.dark [data-admin-route="/admin/mys"] [data-admin-content] section > header h1 { color:#F5FAF9!important; }
        html.dark [data-admin-route="/admin/mys"] [data-admin-content] section > header h1 + p { color:#A3BECD!important; }
        @media(max-width:767px) {
          [data-admin-route] [data-admin-content] .control-center .control-heading h1,
          [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1,
          [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1,
          [data-admin-route] [data-admin-content] .reports-workspace .hero h1,
          [data-admin-route] [data-admin-content] .notices-workspace .hero h1,
          [data-admin-route] [data-admin-content] .system-workspace .hero h1 { font-size:32px!important; }
          [data-admin-route] [data-admin-content] .control-center .control-heading h1 + p,
          [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-hero] h1 + p,
          [data-admin-route] [data-admin-content] .activity-workspace .activity-hero h1 + p,
          [data-admin-route] [data-admin-content] .reports-workspace .hero h1 + p,
          [data-admin-route] [data-admin-content] .notices-workspace .hero h1 + p,
          [data-admin-route] [data-admin-content] .system-workspace .hero h1 + p { font-size:14px!important; }
        }

        /* Canonical admin dark palette: Activity is the reference. */
        html.dark [data-admin-route],
        html.dark [data-admin-route] .shapeos-navigation,
        html.dark [data-admin-route] [data-admin-content],
        html.dark [data-admin-route] [data-admin-content] :is(.control-center,.approvals-workspace,.activity-workspace,.reports-workspace,.notices-workspace,.system-workspace,.users-workspace,.personals-workspace,.exercises-workspace) {
          --background:169.411765 68% 4.901961%!important;
          --foreground:168 33.333333% 97.058824%!important;
          --card:167.37 51.35% 7.25%!important; --card-foreground:168 33.333333% 97.058824%!important;
          --popover:167.37 51.35% 7.25%!important; --popover-foreground:168 33.333333% 97.058824%!important;
          --primary:177.42 100% 45.69%!important; --primary-foreground:174 100% 8.24%!important;
          --secondary:167.37 51.35% 7.25%!important; --secondary-foreground:168 33.333333% 97.058824%!important;
          --muted:167.37 51.35% 7.25%!important; --muted-foreground:201.428571 29.577465% 72.156863%!important;
          --accent:177.42 100% 45.69%!important; --accent-foreground:174 100% 8.24%!important;
          --border:165 39.13% 18.04%!important; --input:165 39.13% 18.04%!important; --ring:177.42 100% 45.69%!important;
          --shapeos-bg:#041512!important; --shapeos-surface:#091c18!important; --shapeos-surface-strong:#091c18!important;
          --shapeos-text:#f5faf9!important; --shapeos-muted:#a3becd!important; --shapeos-subtle:#a3becd!important;
          --shapeos-border:#1c4037!important; --shapeos-brand:#00e9df!important; --shapeos-brand-hover:#00e9df!important;
          --shapeos-brand-soft:rgba(0,233,223,.09)!important; --shapeos-on-brand:#002a26!important;
          --surface:#091c18!important; --border-color:#1c4037!important; --text:#f5faf9!important;
          --muted-color:#a3becd!important;
          --approval-surface:#091c18!important; --approval-border:#1c4037!important; --approval-muted:#a3becd!important; --approval-accent:#00e9df!important;
          --users-surface:#091c18!important; --users-border:#1c4037!important; --users-muted:#a3becd!important; --users-title:#f5faf9!important; --users-accent:#00e9df!important;
          --personal-surface:#091c18!important; --personal-border:#1c4037!important; --personal-muted:#a3becd!important; --personal-ink:#f5faf9!important; --personal-brand:#00e9df!important;
          --exercise-surface:#091c18!important; --exercise-border:#1c4037!important; --exercise-muted:#a3becd!important; --exercise-ink:#f5faf9!important; --exercise-brand:#00e9df!important;
        }
        /* These custom workspaces use hex tokens rather than the HSL utility tokens. */
        html.dark [data-admin-route] [data-admin-content] :is(.activity-workspace,.reports-workspace,.notices-workspace,.system-workspace) {
          --border:#1c4037!important; --muted:#a3becd!important; --accent:#00e9df!important;
        }
        html.dark [data-admin-route] { background:#041512!important; color:#f5faf9!important; }
        html.dark [data-admin-route] .shapeos-navigation {
          --shapeos-bg:#101917!important; --shapeos-surface:#101917!important; --shapeos-surface-strong:#19261f!important;
          --shapeos-border:#2e4239!important; --shapeos-text:#eff5ed!important; --shapeos-muted:#a5b8ae!important;
          --shapeos-brand:#4dddc6!important; --shapeos-brand-hover:#6df0dc!important; --shapeos-on-brand:#101917!important;
          background:#101917!important; border-color:#2e4239!important;
        }
        html.dark [data-admin-route] [data-admin-content] :is(.control-heading,[data-approvals-hero],.activity-hero,.reports-workspace .hero,.notices-workspace .hero,.system-workspace .hero,.users-hero,.personals-hero,.exercises-hero) {
          background:radial-gradient(ellipse at 84% 60%,#073d32 0%,#071d18 43%,#041512 100%)!important;
          border-color:#1c4037!important;
        }
        html.dark [data-admin-route] [data-admin-content] .control-metric,
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace :is([data-approvals-summary]>div,[data-approvals-table],[data-approvals-columns],[role="dialog"],[data-approvals-details],[data-approvals-pagination]),
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace section:not([data-approvals-hero]):not([data-approvals-filters]),
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace div[class*="dark:bg-[#"] {
          background:#091c18!important; border-color:#1c4037!important;
        }
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace :is([data-approvals-row],[data-approvals-pagination] button:not([aria-current])) {
          border-color:#1c4037!important;
        }
        html.dark [data-admin-route] [data-admin-content] :is(input,textarea)::placeholder { color:#a3becd!important; }
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-filters] label {
          background:#091c18!important; border-color:#1c4037!important; color:#a3becd!important;
        }
        html.dark [data-admin-route] [data-admin-content] .approvals-workspace [data-approvals-filters] label:focus-within { border-color:#00e9df!important; }

        /* Quiet, shared focus states. Outline never changes element geometry. */
        html.light [data-admin-route] { --admin-focus-color:#129b89; }
        html.dark [data-admin-route] { --admin-focus-color:#00e9df; }
        html:is(.light,.dark) [data-admin-route] :is(
          input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]),
          textarea,select
        ):not(:disabled):not([aria-disabled="true"]):focus {
          border-color:var(--admin-focus-color)!important;
          outline:1px solid var(--admin-focus-color)!important;
          outline-offset:0!important;
          box-shadow:none!important;
        }
        /* Compound fields highlight their existing frame rather than the inner input. */
        html:is(.light,.dark) [data-admin-route] :is(
          [data-admin-search],
          label:has(> input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])),
          label:has(> select)
        ):has(> :is(input,select):not(:disabled):not([aria-disabled="true"]):focus) {
          border-color:var(--admin-focus-color)!important;
          outline:none!important;
          box-shadow:none!important;
        }
        html:is(.light,.dark) [data-admin-route] :is(
          [data-admin-search],
          label:has(> input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])),
          label:has(> select)
        ) > :is(input,select):focus {
          outline:none!important; box-shadow:none!important;
        }
        html:is(.light,.dark) [data-admin-route] :is(
          button,a[href],summary,[role="button"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],
          input[type="checkbox"],input[type="radio"],input[type="range"],input[type="color"],input[type="file"],
          input[type="button"],input[type="submit"],input[type="reset"],[tabindex]:not([tabindex="-1"])
        ):not(:disabled):not([aria-disabled="true"]):focus-visible {
          outline:2px solid var(--admin-focus-color)!important;
          outline-offset:2px!important;
          box-shadow:none!important;
        }
        /* Inset outlines stay visible inside clipped segmented controls and tables. */
        html:is(.light,.dark) [data-admin-route] :is(
          .segments button,[data-approval-status-group] button,.audiences button,
          [role="tab"],tr[tabindex],[role="row"][tabindex]
        ):not(:disabled):not([aria-disabled="true"]):focus-visible { outline-offset:-3px!important; }
        @media (forced-colors:active) {
          html:is(.light,.dark) [data-admin-route] { --admin-focus-color:Highlight; }
        }
      `}</style>
    </div>
  )
}
