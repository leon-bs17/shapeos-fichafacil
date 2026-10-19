'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChartColumn,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
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

  useEffect(() => {
    const root = document.querySelector('[data-admin-content]')
    if (!root) return
    const groups = '.control-metrics,[data-approvals-summary],.activity-workspace .metrics,.reports-workspace .metrics,.users-stats,.personals-stats,.exercises-stats,.audit-stats'
    let frame = 0
    const observed = new Set<Element>()
    const measure = () => {
      root.querySelectorAll(groups).forEach(group => {
        group.setAttribute('data-admin-metric-group', '')
        if (!observed.has(group)) { observer.observe(group); observed.add(group) }
        const items = Array.from(group.children).filter(item => item.querySelector('[data-admin-metric-icon]'))
        group.setAttribute('data-admin-metric-count', String(items.length))
        items.forEach((item, index) => {
          item.setAttribute('data-admin-metric-item', '')
          const rect = item.getBoundingClientRect()
          const previous = items[index - 1]?.getBoundingClientRect()
          const sameRow = previous && Math.abs(rect.top - previous.top) < 4
          item.setAttribute('data-admin-metric-divider', sameRow ? 'true' : 'false')
        })
      })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(root)
    const mutations = new MutationObserver(schedule)
    mutations.observe(root, { childList: true, subtree: true })
    schedule()
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect()
      root.querySelectorAll('[data-admin-metric-group]').forEach(group => { group.removeAttribute('data-admin-metric-group'); group.removeAttribute('data-admin-metric-count') })
      root.querySelectorAll('[data-admin-metric-item]').forEach(item => {
        item.removeAttribute('data-admin-metric-item'); item.removeAttribute('data-admin-metric-divider')
      })
    }
  }, [pathname])

  const central = pathname === '/admin' || pathname === '/admin/controle'
  const approvals = pathname === '/admin/aprovacoes'
  const activity = pathname === '/admin/atividade'
  const reports = pathname === '/admin/relatorios'
  const notices = pathname === '/admin/comunicados'
  const system = pathname === '/admin/sistema'
  const users = pathname === '/admin/usuarios'
  const personals = pathname === '/admin/personais'
  const exercises = pathname === '/admin/exercicios'
  const audit = pathname === '/admin/auditoria'
  const account = pathname === '/admin/conta'
  useEffect(() => {
    if (pathname !== '/admin/auditoria' && pathname !== '/admin/usuarios') return
    const html = document.documentElement
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Tab') html.setAttribute('data-admin-search-keyboard', 'true')
    }
    const pointer = () => html.removeAttribute('data-admin-search-keyboard')
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    return () => {
      document.removeEventListener('keydown', keyboard, true)
      document.removeEventListener('pointerdown', pointer, true)
      html.removeAttribute('data-admin-search-keyboard')
    }
  }, [pathname])
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string|null>(null)
  const mobileDialog = useRef<HTMLDialogElement>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)
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

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const dialog = mobileDialog.current
    const previousOverflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width:1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false) }
    desktop.addEventListener('change',closeOnDesktop)
    return () => {
      desktop.removeEventListener('change',closeOnDesktop)
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (!desktop.matches) mobileTrigger.current?.focus()
    }
  }, [mobileOpen])
  useEffect(() => {
    const html = document.documentElement
    let dark = html.classList.contains('dark')
    let first = 0
    let second = 0
    let suppression:HTMLStyleElement|null = null
    const restore = () => { suppression?.remove(); suppression=null }
    const observer = new MutationObserver(() => {
      const next = html.classList.contains('dark')
      if (next===dark) return
      dark=next
      cancelAnimationFrame(first); cancelAnimationFrame(second); restore()
      suppression=document.createElement('style')
      suppression.textContent='html body [data-admin-route] .shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation.shapeos-navigation * { transition:none!important; }'
      document.head.appendChild(suppression)
      const menu=document.querySelector('.shapeos-navigation')
      if(menu)void getComputedStyle(menu).backgroundColor
      first=requestAnimationFrame(()=>{second=requestAnimationFrame(restore)})
    })
    observer.observe(html,{attributes:true,attributeFilter:['class']})
    return ()=>{observer.disconnect();cancelAnimationFrame(first);cancelAnimationFrame(second);restore()}
  }, [])
  async function sair() {
    if (signingOut) return
    setSigningOut(true);setSignOutError(null)
    try {
      const {error}=await createClient().auth.signOut()
      if(error)throw error
      setMobileOpen(false)
      router.push('/admin/login')
      router.refresh()
    } catch {setSignOutError('Não foi possível sair. Tente novamente.')}
    finally {setSigningOut(false)}
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

  function menuLink(item: typeof contaLink, mobile=false) {
    const Icon=item.icone
    const active=item.href==='/admin'?pathname===item.href:pathname.startsWith(item.href)
    return <Link key={item.href} href={item.href} aria-current={active?'page':undefined}
      aria-label={item.label} title={!mobile&&collapsed?item.label:undefined}
      className="admin-menu-row" onClick={()=>setMobileOpen(false)}>
      <Icon className="shapeos-menu-icon" size={18} strokeWidth={1.75} aria-hidden="true"/>
      <span className="admin-menu-label">{item.label}</span>
    </Link>
  }
  function menuContents(mobile=false) {
    const compact=!mobile&&collapsed
    const initials=(user?.nome?.trim()||'Administrador').split(/\s+/).filter(Boolean).slice(0,2).map((part:string)=>part[0]).join('').toLocaleUpperCase('pt-BR')
    return <>
      <header className="admin-menu-header">
        <div className="admin-menu-logo"><Logo size="sm"/></div>
        <button type="button" className="admin-menu-toggle" autoFocus={mobile}
          aria-label={mobile?'Fechar menu':compact?'Expandir menu':'Recolher menu'}
          aria-expanded={mobile?undefined:!collapsed} aria-controls={mobile?'admin-mobile-navigation':'admin-desktop-navigation'}
          onClick={()=>mobile?setMobileOpen(false):setCollapsed(!collapsed)}>
          {mobile?<X size={20}/>:compact?<ChevronRight size={20}/>:<ChevronLeft size={20}/>}
        </button>
      </header>
      <div className="admin-menu-identity"><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true"/><span className="admin-menu-label">Administração</span></div>
      <nav id={mobile?'admin-mobile-navigation':'admin-desktop-navigation'} aria-label={mobile?'Administração no celular':'Administração'} className="admin-menu-nav">
        <section aria-label="Operação"><h2 className="admin-menu-group">Operação</h2><div>{novasFerramentas.map(item=>menuLink(item,mobile))}</div></section>
        <section aria-label="Gestão"><h2 className="admin-menu-group">Gestão</h2><div>{gestaoLinks.map(item=>menuLink(item,mobile))}</div></section>
        <section aria-label="Conta"><h2 className="admin-menu-group">Conta</h2><div>{menuLink(contaLink,mobile)}</div></section>
      </nav>
      <div className="admin-menu-footer">
        <Link href="/" className="admin-menu-row" aria-label="Voltar ao app" title={compact?'Voltar ao app':undefined} onClick={()=>setMobileOpen(false)}><ArrowLeft size={18} className="shapeos-menu-icon" strokeWidth={1.75} aria-hidden="true"/><span className="admin-menu-label">Voltar ao app</span></Link>
        <button type="button" className="admin-menu-row admin-menu-logout" onClick={()=>void sair()} disabled={signingOut} aria-label={signingOut?'Saindo':'Sair'} title={compact?'Sair':undefined}><LogOut size={18} className="shapeos-menu-icon" strokeWidth={1.75} aria-hidden="true"/><span className="admin-menu-label">{signingOut?'Saindo...':'Sair'}</span></button>
        {signOutError&&<p className="admin-menu-error" role="alert">{signOutError}</p>}
      </div>
      {user&&<div className="admin-menu-profile" title={compact?user.nome:undefined}><span className="admin-menu-avatar" aria-hidden="true">{initials}</span><div className="admin-menu-label"><p>{user.nome}</p><span>Administrador</span></div></div>}
    </>
  }

  return (
    <div data-admin-route={pathname} data-menu-collapsed={collapsed} className="min-h-screen bg-[var(--shapeos-bg)] text-[var(--shapeos-text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
      <aside id="admin-desktop-menu" className="shapeos-navigation admin-desktop-menu" data-collapsed={collapsed}>
        {menuContents()}
      </aside>
      <div className="admin-mobile-bar">
        <button ref={mobileTrigger} type="button" className="admin-menu-open" aria-label="Abrir menu de administração" aria-expanded={mobileOpen} aria-controls="admin-mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={21}/></button>
        <Logo size="sm"/>
        {pathname !== '/admin/mys' && !central && !approvals && !activity && !reports && !notices && !system && !users && !personals && !exercises && !audit && !account && <div className="admin-mobile-tools"><NotificationBell/><ThemeToggle/></div>}
      </div>
      <dialog ref={mobileDialog} id="admin-mobile-menu" className="shapeos-navigation admin-mobile-menu" aria-label="Menu de administração"
        onCancel={event=>{event.preventDefault();setMobileOpen(false)}}
        onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setMobileOpen(false)}}>
        {mobileOpen&&menuContents(true)}
      </dialog>

      <main className="min-h-screen px-4 py-5 md:px-6 md:py-7 lg:ml-64 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1400px]">
          {pathname !== '/admin/mys' && !central && !approvals && !activity && !reports && !notices && !system && !users && !personals && !exercises && !audit && !account && <div data-admin-breadcrumb className="admin-breadcrumb mb-6 hidden items-center gap-2 border-b border-border pb-4 text-xs text-muted-foreground lg:flex">
            <span>ShapeOS</span><span aria-hidden="true">/</span>
            <span className="text-foreground">{todosLinks.find((item) => item.href === pathname)?.label ?? 'Administração'}</span>
            <div className="ml-auto flex items-center gap-2"><NotificationBell /><ThemeToggle /></div>
          </div>}

          {(central || approvals || activity || reports || notices || system || users || personals || exercises || audit || account) && <header className="control-compact-top">
            <div className="control-compact-identity">
              <span className="control-compact-icon" aria-hidden="true">{account ? <CircleUserRound size={22} strokeWidth={1.75}/> : audit ? <ShieldCheck size={22} strokeWidth={1.75}/> : exercises ? <Dumbbell size={22} strokeWidth={1.75}/> : personals ? <UserRound size={22} strokeWidth={1.75}/> : users ? <Users size={22} strokeWidth={1.75}/> : system ? <Settings size={22} strokeWidth={1.75}/> : notices ? <Megaphone size={22} strokeWidth={1.75}/> : reports ? <FileText size={22} strokeWidth={1.75}/> : activity ? <ChartColumn size={22} strokeWidth={1.75}/> : approvals ? <CircleCheck size={22} strokeWidth={1.75}/> : <LayoutGrid size={22} strokeWidth={1.75}/>}</span>
              <div><h1>{account ? 'Minha conta' : audit ? 'Auditoria' : exercises ? 'Exercícios' : personals ? 'Personais' : users ? 'Usuários' : system ? 'Sistema' : notices ? 'Comunicados' : reports ? 'Relatórios' : activity ? 'Atividade' : approvals ? 'Aprovações' : 'Central de controle'}</h1><p>{account ? 'Gerencie seus dados e a segurança da sua conta.' : audit ? 'Acompanhe as ações administrativas e as alterações registradas.' : exercises ? 'Gerencie a biblioteca e as demonstrações dos exercícios.' : personals ? 'Gerencie os profissionais, alunos e treinos vinculados.' : users ? 'Gerencie as contas e os acessos da plataforma.' : system ? 'Acompanhe a disponibilidade dos serviços da plataforma.' : notices ? 'Gerencie a comunicação da plataforma.' : reports ? 'Acompanhe os resultados e indicadores da plataforma.' : activity ? 'Histórico de cadastros e ações da plataforma.' : approvals ? 'Revise os cadastros e gerencie novos acessos.' : 'Acompanhe a plataforma e gerencie sua operação.'}</p></div>
            </div>
            <div className="control-compact-tools"><NotificationBell/><ThemeToggle/></div>
          </header>}

          {pathname === '/admin/aprovacoes' ? (
            <div className="admin-approval-global-search mb-6 flex items-center gap-3">
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



        /* Admin dialogs share one viewport-based presentation in both themes. */
        html:is(.light,.dark) body [data-admin-route][data-admin-route] dialog[open][open][open][open] {
          position:fixed!important;
          inset:0!important;
          margin:auto!important;
          height:fit-content!important;
          min-width:0!important;
          max-width:calc(100vw - 32px)!important;
          max-height:calc(100dvh - 32px)!important;
          box-sizing:border-box!important;
          overflow-y:auto!important;
          overscroll-behavior:contain!important;
          transform:none!important;
          translate:none!important;
          animation:none!important;
        }
        html:is(.light,.dark) body [data-admin-route][data-admin-route] dialog[open][open][open][open]::backdrop {
          background:rgba(0,0,0,.5)!important;
          backdrop-filter:blur(3px)!important;
          -webkit-backdrop-filter:blur(3px)!important;
        }
        html:has([data-admin-route] dialog[open]),
        html:has([data-admin-route] dialog[open]) body {
          overflow:hidden!important;
          overscroll-behavior:none;
        }
        html.light body [data-admin-route] dialog[data-admin-modal] {
          background:#fcfdf9; color:#162623; border:1px solid #d7ded3;
        }
        html.dark body [data-admin-route] dialog[data-admin-modal] {
          background:#091c18; color:#f5faf9; border:1px solid #1c4037;
        }
        @media(max-width:767px) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route] dialog[open][open][open][open] {
            max-width:calc(100vw - 24px)!important;
            max-height:calc(100dvh - 24px)!important;
          }
        }


        /* Light wireframe backdrops mirror each page's dark lighting position. */
        html.light body [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace section[data-approvals-hero] {
          background:radial-gradient(ellipse at 84% 60%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important;
        }
        html.light body [data-admin-route="/admin/atividade"] [data-admin-content] .activity-workspace .activity-hero {
          background:radial-gradient(ellipse at 84% 60%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important;
        }
        html.light body [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .hero {
          background:radial-gradient(ellipse at 85% 65%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important;
        }
        html.light body [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace .hero {
          background:radial-gradient(ellipse at 83% 60%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important;
        }
        html.light body [data-admin-route="/admin/sistema"] [data-admin-content] .system-workspace .hero {
          background:radial-gradient(ellipse at 83% 65%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important;
        }


        /* Header notification and theme icons share one color in each mode. */
        html.light [data-admin-route] button[aria-label^="Abrir notificações"] {
          color:#5f6f68!important;
        }
        html.dark [data-admin-route] button[aria-label^="Abrir notificações"] {
          color:#a3becd!important;
        }
        html:is(.light,.dark) [data-admin-route] button[aria-label^="Abrir notificações"] > svg {
          color:inherit!important;
        }

        /* Pointer focus keeps the search hover; keyboard focus remains visible. */
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-search:focus-within,
        html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-filter-search:focus-within {
          border-color:var(--admin-search-border)!important;
          box-shadow:none!important; outline:none!important;
        }
        html:is(.light,.dark)[data-admin-search-keyboard="true"] [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-search:has(input:focus-visible),
        html:is(.light,.dark)[data-admin-search-keyboard="true"] [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-filter-search:has(input:focus-visible) {
          outline:2px solid var(--admin-search-accent)!important;
          outline-offset:3px;
        }
        @media(hover:hover) and (pointer:fine) {
          html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-search:focus-within:hover,
          html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-filter-search:focus-within:hover {
            border-color:color-mix(in srgb,var(--admin-search-accent) 40%,transparent)!important;
          }
        }
        /* Shared table pagination geometry and mode-aware current-page indicator. */
        html.light [data-admin-route] {
          --admin-pagination-surface:#fcfdf9; --admin-pagination-border:#d7ded3;
          --admin-pagination-muted:#5f6f68; --admin-pagination-brand:#129b89;
          --admin-pagination-on-brand:#ffffff;
        }
        html.dark [data-admin-route] {
          --admin-pagination-surface:#091c18; --admin-pagination-border:#1c4037;
          --admin-pagination-muted:#a3becd; --admin-pagination-brand:#00e9df;
          --admin-pagination-on-brand:#002a26;
        }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) { display:flex; align-items:center; flex-wrap:wrap; gap:6px!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) :is(button,[aria-current="page"]) {
          display:inline-grid!important; place-items:center!important; flex-shrink:0!important;
          box-sizing:border-box!important; width:36px!important; min-width:36px!important;
          height:36px!important; min-height:36px!important; padding:0!important; margin:0!important;
          border:1px solid var(--admin-pagination-border)!important; border-radius:10px!important;
          background:var(--admin-pagination-surface)!important; color:var(--admin-pagination-muted)!important;
          font-family:'Sora',sans-serif!important; font-size:12px!important; font-weight:500!important;
          line-height:1!important; font-variant-numeric:tabular-nums;
          box-shadow:none!important; filter:none!important; transform:none!important;
          translate:none!important; scale:none!important;
          transition:border-color 150ms ease!important;
        }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) [aria-current="page"] {
          background:var(--admin-pagination-brand)!important;
          border-color:var(--admin-pagination-brand)!important;
          color:var(--admin-pagination-on-brand)!important;
          font-weight:600!important; transition:none!important;
        }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) button:disabled { opacity:.35!important; cursor:default!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) button:focus-visible {
          outline:2px solid var(--admin-pagination-brand)!important; outline-offset:3px;
        }
        @media(hover:hover) and (pointer:fine) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) button:not([aria-current="page"]):hover:enabled {
            background:color-mix(in srgb,var(--admin-pagination-brand) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--admin-pagination-brand) 40%,transparent)!important;
          }
        }
        @media(max-width:767px) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) :is(button,[aria-current="page"]) {
            width:44px!important; min-width:44px!important;
            height:44px!important; min-height:44px!important;
          }
        }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .approvals-workspace [data-approvals-pagination] button:first-child,
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .approvals-workspace [data-approvals-pagination] button:last-child { display:none!important; }
        @media(prefers-reduced-motion:reduce) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .account-pagination nav,.approvals-workspace [data-approvals-pagination],.activity-workspace nav[aria-label="Paginação da atividade"],.users-workspace .users-pagination nav,.personals-workspace .personals-pagination nav,.audit-workspace .audit-pagination nav) :is(button,[aria-current="page"]) { transition:none!important; }
        }


        /* One section-label style for the existing Admin page headers. */
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .control-heading-copy > p:first-child,.approvals-workspace [data-approvals-hero] .eyebrow,.activity-workspace .activity-hero .eyebrow,.reports-workspace .hero .eyebrow,.notices-workspace .hero .eyebrow,.system-workspace .hero .eyebrow,.users-workspace .users-hero .eyebrow,.personals-workspace .personals-hero .eyebrow,.exercises-workspace .exercises-hero .eyebrow,.audit-workspace .audit-hero .eyebrow) {
          display:inline-flex!important; align-items:center!important; justify-content:center!important;
          width:fit-content!important; max-width:100%!important; min-height:28px!important; height:auto!important;
          box-sizing:border-box!important; padding:6px 16px!important; margin:0 0 17px!important;
          border:1px solid var(--admin-section-label-color)!important; border-radius:999px!important;
          background:transparent!important; color:var(--admin-section-label-color)!important;
          font-family:'Sora',sans-serif!important; font-size:10px!important; font-weight:650!important;
          line-height:14px!important; letter-spacing:.1em!important; text-transform:uppercase!important;
          white-space:normal!important; overflow-wrap:anywhere!important;
          box-shadow:none!important; text-shadow:none!important; transform:none!important;
        }
        html.light body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] { --admin-section-label-color:#129b89; }
        html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] { --admin-section-label-color:#00e9df; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] :is(.control-center .control-heading-copy > p:first-child,.approvals-workspace [data-approvals-hero] .eyebrow,.activity-workspace .activity-hero .eyebrow,.reports-workspace .hero .eyebrow,.notices-workspace .hero .eyebrow,.system-workspace .hero .eyebrow,.users-workspace .users-hero .eyebrow,.personals-workspace .personals-hero .eyebrow,.exercises-workspace .exercises-hero .eyebrow,.audit-workspace .audit-hero .eyebrow) > svg { display:none!important; }


        /* Admin navigation: matching desktop, compact and mobile presentations. */
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] { --admin-menu-bg:#fcfdf9; --admin-menu-border:#d7ded3; --admin-menu-text:#162623; --admin-menu-muted:#5f6f68; --admin-menu-brand:#129b89; }
        html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] { --admin-menu-bg:#101917; --admin-menu-border:#2e4239; --admin-menu-text:#eff5ed; --admin-menu-muted:#a5b8ae; --admin-menu-brand:#4dddc6; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation { font-family:'Sora',sans-serif!important; background:var(--admin-menu-bg)!important; color:var(--admin-menu-text)!important; border-right:1px solid var(--admin-menu-border)!important; box-shadow:none!important; padding:0!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation.admin-desktop-menu { position:fixed; inset:0 auto 0 0; width:290px; height:100dvh; z-index:50; display:none; flex-direction:column; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-header { display:flex; justify-content:space-between; align-items:center; gap:10px; min-height:80px; padding:16px 18px; border-bottom:1px solid var(--admin-menu-border); flex-shrink:0; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-logo { min-width:0; color:var(--admin-menu-brand); }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation :is(.admin-menu-toggle,.admin-menu-row) { border:1px solid transparent!important; border-radius:13px!important; box-shadow:none!important; filter:none!important; transform:none!important; background:transparent!important; color:var(--admin-menu-muted)!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-toggle { display:grid; place-items:center; width:44px; min-width:44px; height:44px; padding:0; cursor:pointer; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-identity { display:flex; align-items:center; gap:12px; min-height:56px; padding:12px 26px; border-bottom:1px solid var(--admin-menu-border); flex-shrink:0; font-size:13px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-identity svg { color:var(--admin-menu-brand)!important; flex-shrink:0; width:18px; height:18px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-nav { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:20px 14px 14px; scrollbar-width:thin; scrollbar-color:var(--admin-menu-border) transparent; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-nav section+section { margin-top:20px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-group { color:var(--admin-menu-brand)!important; font-size:10px!important; font-weight:650!important; letter-spacing:.1em!important; line-height:1.4; text-transform:uppercase; padding:0 12px; margin-bottom:9px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row { display:flex; align-items:center; gap:12px; width:100%; min-height:44px; padding:10px 12px; font-size:13px!important; font-weight:400; text-align:left; cursor:pointer; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row+.admin-menu-row { margin-top:3px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row[aria-current="page"] { color:var(--admin-menu-brand)!important; background:color-mix(in srgb,var(--admin-menu-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--admin-menu-brand) 40%,transparent)!important; font-weight:600; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .shapeos-menu-icon { width:18px!important; height:18px!important; flex-shrink:0; color:inherit!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-label { min-width:0; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-footer { padding:12px 14px; border-top:1px solid var(--admin-menu-border); flex-shrink:0; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-profile { display:flex; align-items:center; gap:12px; border-top:1px solid var(--admin-menu-border); padding:16px 24px; flex-shrink:0; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-avatar { display:grid; place-items:center; width:42px; height:42px; flex-shrink:0; border-radius:50%; background:color-mix(in srgb,var(--admin-menu-brand) 15%,var(--admin-menu-bg)); color:var(--admin-menu-brand); font-size:14px; font-weight:650; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-profile p { color:var(--admin-menu-text)!important; font-size:12px; font-weight:600; line-height:1.5; overflow-wrap:anywhere; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-profile .admin-menu-label>span { display:block; color:var(--admin-menu-muted)!important; font-size:11px; margin-top:3px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-error { color:#b42336; font-size:11px; line-height:1.6; margin-top:8px; overflow-wrap:anywhere; }
        html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-error { color:#ff8f9b; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation button:disabled { opacity:.5; cursor:not-allowed; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation :is(a,button):focus-visible { outline:2px solid var(--admin-menu-brand)!important; outline-offset:2px!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-mobile-bar { display:flex; flex-wrap:wrap; align-items:center; gap:12px; position:sticky; top:0; z-index:40; padding:12px 16px; border-bottom:1px solid var(--admin-menu-border); background:var(--admin-menu-bg); color:var(--admin-menu-text); }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-mobile-tools { margin-left:auto; display:flex; align-items:center; gap:6px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-menu-open { display:grid; place-items:center; width:44px; min-width:44px; height:44px; border:1px solid var(--admin-menu-border); border-radius:13px; color:var(--admin-menu-text); background:transparent; transition:background-color 150ms ease,border-color 150ms ease; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-menu-open:focus-visible { outline:2px solid var(--admin-menu-brand); outline-offset:2px; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation.admin-mobile-menu { display:none!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation.admin-mobile-menu[open][open][open][open] { display:flex!important; flex-direction:column!important; position:fixed!important; inset:0 auto 0 0!important; margin:0!important; width:min(300px,calc(100vw - 24px))!important; max-width:calc(100vw - 24px)!important; height:100dvh!important; max-height:100dvh!important; border:0!important; border-right:1px solid var(--admin-menu-border)!important; border-radius:0 18px 18px 0!important; overflow:hidden!important; transform:none!important; }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation.admin-mobile-menu[open][open][open][open]::backdrop { background:rgba(0,0,0,.5)!important; backdrop-filter:blur(3px)!important; -webkit-backdrop-filter:blur(3px)!important; }
        @media(min-width:1024px) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation.admin-desktop-menu { display:flex; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-mobile-bar { display:none; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] > main { margin-left:290px!important; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation.admin-desktop-menu[data-collapsed="true"] { width:84px; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-menu-collapsed="true"] > main { margin-left:84px!important; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-header { flex-direction:column; gap:8px; padding:14px 8px; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] :is(.admin-menu-label,.admin-menu-group) { display:none; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-identity { justify-content:center; padding:12px; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-row { justify-content:center; padding:10px; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-nav { padding:16px 10px; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-nav section+section { margin-top:16px; padding-top:16px; border-top:1px solid var(--admin-menu-border); }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-footer { padding:12px 10px; }
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation[data-collapsed="true"] .admin-menu-profile { justify-content:center; padding:14px 8px; }
        }
        @media(hover:hover) and (pointer:fine) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation :is(.admin-menu-row,.admin-menu-toggle):not(:disabled):hover,
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-menu-open:hover { background:color-mix(in srgb,var(--admin-menu-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--admin-menu-brand) 40%,transparent)!important; }
        }
        @media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation :is(.admin-menu-row,.admin-menu-toggle),html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .admin-menu-open { transition:none!important; } }


        /* Compact navigation keeps the original brand symbol. */
        [data-admin-route] .admin-desktop-menu[data-collapsed="true"] .admin-menu-logo [data-testid="brand-logo"] { justify-content:center; gap:0; }
        [data-admin-route] .admin-desktop-menu[data-collapsed="true"] .admin-menu-logo [data-testid="brand-logo"] > div { display:none; }
        [data-admin-route] .admin-desktop-menu[data-collapsed="true"] .admin-menu-logo { width:36px; height:36px; }

        /* Logout shares the destructive command treatment, retaining the menu geometry. */
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row.admin-menu-logout { color:#b42336!important; }
        html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row.admin-menu-logout { color:#ff8f9b!important; }
        @media(hover:hover) and (pointer:fine) {
          html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row.admin-menu-logout:not(:disabled):hover { background:rgba(180,35,54,.07)!important; border-color:rgba(180,35,54,.4)!important; }
          html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row.admin-menu-logout:not(:disabled):hover { background:rgba(255,143,155,.07)!important; border-color:rgba(255,143,155,.4)!important; }
        }
        html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row.admin-menu-logout:focus-visible { outline-color:#b42336!important; }
        html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] .shapeos-navigation.shapeos-navigation .admin-menu-row.admin-menu-logout:focus-visible { outline-color:#ff8f9b!important; }

      
/* Shared metric icons: compact option 2 across the admin pages. */
html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon] {
--metric-icon-color:#129b89;
display:grid!important;place-items:center!important;box-sizing:border-box!important;
width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;
max-width:44px!important;max-height:44px!important;flex:0 0 44px!important;
padding:0!important;margin:0!important;border:0!important;border-radius:13px!important;
color:var(--metric-icon-color)!important;background:color-mix(in srgb,var(--metric-icon-color) 7%,transparent)!important;
box-shadow:none!important;outline:none!important;filter:none!important;transform:none!important;
}
html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon] { --metric-icon-color:#00e9df; }
html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon][data-metric-tone="success"] { --metric-icon-color:hsl(var(--success)); }
html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon][data-metric-tone="warning"] { --metric-icon-color:#b88400; }
html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon][data-metric-tone="danger"] { --metric-icon-color:#b42336; }
html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon][data-metric-tone="warning"] { --metric-icon-color:#ffd52d; }
html.dark body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon][data-metric-tone="danger"] { --metric-icon-color:#ff8f9b; }
html:is(.light,.dark) body [data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] [data-admin-metric-icon] svg { width:24px!important;height:24px!important;min-width:24px!important;stroke-width:1.75!important;color:var(--metric-icon-color)!important;flex-shrink:0!important; }

/* Central and Mys share a compact title-and-tools hierarchy. */
.control-compact-top { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:64px; padding:0 0 12px; margin-bottom:20px; border-bottom:1px solid #d7ded3; }
html.dark .control-compact-top { border-bottom-color:#1c4037; }
.control-compact-identity { display:flex; align-items:center; gap:10px; min-width:0; }
.control-compact-icon { display:grid; place-items:center; flex:0 0 36px; width:36px; height:36px; border:1px solid #d7ded3; border-radius:11px; color:#129b89; }
html.dark .control-compact-icon { color:#00e9df; border-color:#1c4037; }
.control-compact-identity h1 { margin:0; font-size:20px; line-height:1.3; font-weight:650; letter-spacing:-.03em; color:#162623; }
.control-compact-identity p { margin:3px 0 0; font-size:11px; line-height:1.4; color:#5f6f68; }
html.dark .control-compact-identity h1 { color:#f5faf9; }
html.dark .control-compact-identity p { color:#a3becd; }
.control-compact-tools { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.control-compact-tools [data-shapeos-theme-inline] { margin-left:6px; }
.control-compact-tools [data-shapeos-theme-inline]::before { display:none; }
@media(min-width:768px) {
 .control-compact-tools>button,.control-compact-tools [data-shapeos-theme-inline],.control-compact-tools [data-shapeos-theme-inline] button { width:36px; height:36px; min-width:36px; min-height:36px; flex-basis:36px; }
}
@media(max-width:767px) {
 .control-compact-top { gap:10px; margin-bottom:16px; }
 .control-compact-identity h1 { font-size:18px; }
 .control-compact-identity p { font-size:10px; max-width:240px; }
 .control-compact-tools { gap:2px; }
 .control-compact-tools [data-shapeos-theme-inline] { margin-left:0; }
 .control-compact-icon { display:none; }
}
.admin-approval-global-search { display:none!important; }

/* One avatar geometry across every Admin detail dialog. */
html body :is(#admin-dialog-avatar-standard,[data-admin-route]):is(#admin-dialog-avatar-standard,[data-admin-route]):is(#admin-dialog-avatar-standard,[data-admin-route]) dialog :is(.users-avatar,.approval-profile-avatar,.control-manage-avatar,.personal-table-avatar,.avatar,[data-admin-avatar]){
display:grid!important;place-items:center!important;box-sizing:border-box!important;width:44px!important;min-width:44px!important;max-width:44px!important;height:44px!important;min-height:44px!important;max-height:44px!important;flex:0 0 44px!important;aspect-ratio:1 / 1!important;border-radius:50%!important;padding:0!important;font-size:14px!important;line-height:1!important;align-self:center!important;transform:none!important;scale:none!important;
}

@media(min-width:768px){
/* Fixed-height metric separators; actual row starts are measured on resize. */
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]{position:relative!important;border-left:0!important;border-right:0!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]::before{content:""!important;position:absolute!important;left:0!important;top:50%!important;bottom:auto!important;width:1px!important;height:48px!important;max-height:calc(100% - 8px)!important;transform:translateY(-50%)!important;background:#d7ded3!important;border:0!important;box-shadow:none!important;pointer-events:none!important;display:none!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-divider="true"]::before{display:block!important;}
html.dark body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]::before{background:#1c4037!important;}


/* Uniform metric section rhythm, independent of the number of columns. */
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) :has(>[data-admin-metric-group]){display:grid!important;row-gap:20px!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) :has(>[data-admin-metric-group])>*{margin-top:0!important;margin-bottom:0!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-group]{box-sizing:border-box!important;margin:0!important;padding:20px 0!important;min-height:104px!important;column-gap:0!important;row-gap:16px!important;align-items:stretch!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]{box-sizing:border-box!important;min-height:64px!important;margin:0!important;padding:0 20px!important;align-content:center!important;align-items:center!important;border-top:0!important;border-bottom:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]:has(>[data-admin-metric-icon]),html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]>:has(>[data-admin-metric-icon]){display:flex!important;flex-direction:row!important;align-items:center!important;gap:12px!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]>:has(>[data-admin-metric-icon]){width:100%!important;padding:0!important;margin:0!important;min-height:64px!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item] [data-admin-metric-icon]{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;flex:0 0 44px!important;}
html body :is(#metric-divider-standard,[data-admin-route]) :is(#metric-divider-standard,[data-admin-content]) [data-admin-metric-item]::before{height:56px!important;}

}


@media(max-width:767px){
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-group]{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px 0!important;box-sizing:border-box!important;margin:0!important;padding:8px 0!important;min-height:0!important;align-items:stretch!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-group][data-admin-metric-count="3"]{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-group][data-admin-metric-count="1"]{grid-template-columns:minmax(0,1fr)!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item]{position:relative!important;box-sizing:border-box!important;min-width:0!important;min-height:72px!important;height:auto!important;margin:0!important;padding:8px 12px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;align-content:center!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item]:has(>[data-admin-metric-icon]),html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item]>:has(>[data-admin-metric-icon]){display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;text-align:left!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item]>:has(>[data-admin-metric-icon]){padding:0!important;margin:0!important;width:100%!important;min-height:0!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item] [data-admin-metric-icon]{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;flex:0 0 30px!important;border-radius:9px!important;padding:0!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item] [data-admin-metric-icon] svg{width:18px!important;height:18px!important;min-width:18px!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item] :is(strong,.text-2xl,.text-3xl){font-size:20px!important;line-height:1.2!important;margin-top:2px!important;letter-spacing:-.025em!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item] :is(.text-xs,.text-sm){font-size:10px!important;line-height:1.4!important;letter-spacing:normal!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item] :is(p,strong){overflow-wrap:break-word!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item]::before{content:""!important;display:none!important;position:absolute!important;left:0!important;top:50%!important;bottom:auto!important;width:1px!important;height:40px!important;max-height:calc(100% - 16px)!important;transform:translateY(-50%)!important;background:#d7ded3!important;border:0!important;pointer-events:none!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-divider="true"]::before{display:block!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-count="3"] [data-admin-metric-item]{padding:8px 6px!important;min-height:92px!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-count="3"] [data-admin-metric-item]:has(>[data-admin-metric-icon]),html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-count="3"] [data-admin-metric-item]>:has(>[data-admin-metric-icon]){flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:6px!important;text-align:center!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-count="3"] [data-admin-metric-item] :is(p,strong){text-align:center!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-count="3"] [data-admin-metric-item] p{margin-top:2px!important;margin-bottom:0!important;}
html.dark body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-item]::before{background:#1c4037!important;}
}


/* Equal mobile spacing before and after the metric section. */
@media(max-width:767px){
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) :has(>[data-admin-metric-group]){display:grid!important;row-gap:16px!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) :has(>[data-admin-metric-group])>[data-admin-metric-group],
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) :has(>[data-admin-metric-group])>:has(+[data-admin-metric-group]),
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) :has(>[data-admin-metric-group])>[data-admin-metric-group]+*{margin-top:0!important;margin-bottom:0!important;}
html body :is(#metric-mobile-standard,[data-admin-route]) :is(#metric-mobile-standard,[data-admin-content]) [data-admin-metric-group]{margin-block:0!important;padding-block:8px!important;}
}

html body :is(#banner-eyebrow-standard,[data-admin-route="/admin/exercicios"],[data-admin-route="/admin/conta"],[data-admin-route="/admin/auditoria"]) :is(#banner-eyebrow-standard,[data-admin-content]) :is(.exercises-hero,.account-hero,.audit-hero) .eyebrow{display:block!important;width:auto!important;min-height:0!important;padding:0!important;margin:0 0 8px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;font-size:9px!important;line-height:1.5!important;font-weight:650!important;letter-spacing:.1em!important;}

/* Mobile banner art stays visible without obscuring the copy. */
@media(max-width:767px){
html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) :is(.control-globe,[data-approvals-wireframe],.activity-workspace .hero>.wireframe,.reports-workspace .hero>.wireframe,.notices-workspace .hero>.wireframe,.system-workspace .hero>.wireframe,.users-wireframe,.personal-wireframe,.exercise-wireframe,.audit-wireframe,.account-wireframe){display:block!important;position:absolute!important;inset:auto!important;left:auto!important;right:-12px!important;top:50%!important;bottom:auto!important;width:58%!important;min-width:0!important;max-width:220px!important;height:auto!important;max-height:140px!important;object-fit:contain!important;transform:translateY(-50%)!important;opacity:.24!important;pointer-events:none!important;z-index:0!important;mask-image:linear-gradient(to right,transparent 0%,#000 38%,#000 100%)!important;-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 38%,#000 100%)!important;}
html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) :is(.control-banner,.control-hero,[data-approvals-hero],.activity-workspace .hero,.reports-workspace .hero,.notices-workspace .hero,.system-workspace .hero,.users-hero,.personals-hero,.exercises-hero,.audit-hero,.account-hero){position:relative!important;overflow:hidden!important;isolation:isolate!important;}
html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) :is(.control-hero-copy,.control-banner-copy,[data-approvals-hero]>div,.hero-copy,.users-hero-copy,.personals-hero-copy,.exercises-hero-copy,.audit-hero-copy,.account-hero-copy){position:relative!important;z-index:1!important;}
}
@media(max-width:359px){html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) :is(.control-globe,[data-approvals-wireframe],.activity-workspace .hero>.wireframe,.reports-workspace .hero>.wireframe,.notices-workspace .hero>.wireframe,.system-workspace .hero>.wireframe,.users-wireframe,.personal-wireframe,.exercise-wireframe,.audit-wireframe,.account-wireframe){right:-18px!important;width:62%!important;max-height:125px!important;opacity:.18!important;}}

@media(max-width:767px){html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) .control-heading{position:relative!important;overflow:hidden!important;isolation:isolate!important;}html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) .control-heading-art{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;pointer-events:none!important;z-index:0!important;opacity:1!important;transform:none!important;}html body :is(#mobile-banner-wireframe,[data-admin-route]) :is(#mobile-banner-wireframe,[data-admin-content]) .control-heading-copy{position:relative!important;z-index:1!important;}}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-header{min-height:72px!important;padding:16px!important;gap:10px!important;border-bottom:1px solid var(--admin-menu-border)!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-identity{gap:9px!important;padding:16px 20px 8px!important;font-size:12px!important;font-weight:600!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-nav{padding:12px!important;scrollbar-width:thin!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-nav section+section{margin-top:18px!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-group{color:var(--admin-menu-muted)!important;font-size:9px!important;font-weight:600!important;letter-spacing:.09em!important;padding:0 10px!important;margin-bottom:7px!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row{display:flex!important;align-items:center!important;gap:10px!important;min-height:40px!important;padding:9px 10px!important;border:1px solid transparent!important;border-radius:13px!important;font-size:12px!important;font-weight:400!important;line-height:1.4!important;color:var(--admin-menu-text)!important;background:transparent!important;box-shadow:none!important;transform:none!important;filter:none!important;transition:background-color 150ms ease,border-color 150ms ease!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row+.admin-menu-row{margin-top:3px!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .shapeos-menu-icon{width:18px!important;height:18px!important;min-width:18px!important;flex:0 0 18px!important;stroke-width:1.75!important;color:inherit!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row[aria-current="page"]{background:color-mix(in srgb,var(--admin-menu-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--admin-menu-brand) 40%,transparent)!important;color:var(--admin-menu-brand)!important;font-weight:600!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row:not(.admin-menu-logout):not(:disabled):hover{background:color-mix(in srgb,var(--admin-menu-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--admin-menu-brand) 40%,transparent)!important;box-shadow:none!important;transform:none!important;filter:none!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-footer{padding:10px 12px!important;border-top:1px solid var(--admin-menu-border)!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-profile{padding:14px 20px!important;gap:10px!important;align-items:center!important;border-top:1px solid var(--admin-menu-border)!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-avatar{display:grid!important;place-items:center!important;box-sizing:border-box!important;width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;min-height:36px!important;max-height:36px!important;flex:0 0 36px!important;aspect-ratio:1!important;border-radius:50%!important;padding:0!important;background:linear-gradient(145deg,#6f86b6,#4f678f)!important;color:#fff!important;font-size:12px!important;font-weight:700!important;line-height:1!important;box-shadow:none!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-profile p{font-size:11px!important;font-weight:600!important;line-height:1.4!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-profile .admin-menu-label>span{font-size:10px!important;margin-top:3px!important;line-height:1.4!important}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-toggle{width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;border-radius:10px!important;box-shadow:none!important;transform:none!important}
@media(min-width:1024px){
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation[data-collapsed="true"] .admin-menu-header{min-height:96px!important;flex-direction:column!important;padding:14px 8px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation[data-collapsed="true"] .admin-menu-identity{justify-content:center!important;padding:12px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation[data-collapsed="true"] .admin-menu-nav{padding:12px 10px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation[data-collapsed="true"] .admin-menu-row{justify-content:center!important;padding:9px!important;min-height:40px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation[data-collapsed="true"] .admin-menu-profile{justify-content:center!important;padding:14px 8px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation[data-collapsed="true"] .admin-menu-footer{padding:10px!important;}
}
@media(max-width:1023px){
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation.admin-mobile-menu .admin-menu-row{min-height:44px!important;padding:11px 10px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation.admin-mobile-menu .admin-menu-header{min-height:68px!important;padding:14px 16px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation.admin-mobile-menu .admin-menu-toggle{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation.admin-mobile-menu .admin-menu-nav{padding:10px 12px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation.admin-mobile-menu .admin-menu-nav section+section{margin-top:14px!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation.admin-mobile-menu .admin-menu-profile{padding-bottom:max(14px,env(safe-area-inset-bottom))!important;}
}
@media(prefers-reduced-motion:reduce){html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row{transition:none!important;}}

html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row.admin-menu-logout{--menu-logout-color:#b42336;color:var(--menu-logout-color)!important;border-radius:13px!important;}
html.dark body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row.admin-menu-logout{--menu-logout-color:#ff8f9b;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row.admin-menu-logout:not(:disabled):hover{color:var(--menu-logout-color)!important;background:color-mix(in srgb,var(--menu-logout-color) 7%,transparent)!important;border:1px solid color-mix(in srgb,var(--menu-logout-color) 40%,transparent)!important;box-shadow:none!important;transform:none!important;filter:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row.admin-menu-logout .shapeos-menu-icon{color:inherit!important;}
html body :is(#admin-menu-refined,[data-admin-route]) .shapeos-navigation .admin-menu-row.admin-menu-logout:focus-visible{outline:2px solid var(--menu-logout-color)!important;outline-offset:2px!important;}

`}</style>
    </div>
  )
}
