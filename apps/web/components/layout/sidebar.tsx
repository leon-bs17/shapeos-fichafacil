'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Dumbbell, FileText, LayoutGrid, Library, MessageCircle, LogOut, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/davi/components/Logo'

const GROUPS = [
  { label: 'Acompanhamento', items: [
    { href: '/', label: 'Visão Geral', icon: LayoutGrid },
    { href: '/alunos', label: 'Alunos', icon: Users },
    { href: '/treinos', label: 'Treinos', icon: Dumbbell },
  ] },
  { label: 'Ferramentas', items: [
    { href: '/exercicios', label: 'Biblioteca', icon: Library },
    { href: '/relatorios', label: 'Relatórios', icon: FileText },
    { href: '/mys', label: 'Mys · Assistente', icon: MessageCircle },
  ] },
]

type Props = { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const { data: profile } = useQuery({
    queryKey: ['personal-menu-user'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      if (!user) return null
      const { data } = await supabase.from('usuarios').select('nome').eq('id', user.id).single()
      return { name: data?.nome || user.user_metadata?.nome || 'Minha conta' }
    },
    gcTime: 0,
  })

  useEffect(() => {
    if (!mobileOpen) return
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 1024px)')
    const resize = () => { if (desktop.matches) onClose() }
    desktop.addEventListener('change', resize)
    return () => {
      desktop.removeEventListener('change', resize)
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (!desktop.matches && previousFocus?.isConnected) previousFocus.focus()
    }
  }, [mobileOpen, onClose])

  async function sair() {
    if (signingOut) return
    setSigningOut(true)
    setError('')
    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error
      onClose()
      router.push('/login')
      router.refresh()
    } catch {
      setError('Não foi possível sair. Tente novamente.')
    } finally { setSigningOut(false) }
  }

  function contents(mobile = false) {
    const compact = collapsed && !mobile
    const name = profile?.name || 'Minha conta'
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()
    return <>
      <div className="personal-menu-brand">
        <Link href="/" aria-label="ShapeOS · Visão Geral" onClick={mobile ? onClose : undefined} className="personal-logo"><Logo size="sm" showTagline={false} /></Link>
        {mobile ? <button type="button" className="personal-icon-button" onClick={onClose} aria-label="Fechar menu"><X size={18} /></button> :
          <button type="button" className="personal-icon-button personal-menu-toggle" onClick={onToggle} aria-label={compact ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!compact} data-shapeos-tooltip={compact ? 'Expandir menu' : 'Recolher menu'}>{compact ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>}
      </div>
      <nav aria-label="Menu do Personal" className="personal-menu-nav">
        {GROUPS.map(group => <div className="personal-menu-group" key={group.label}>
          {!compact && <p className="personal-menu-group-label">{group.label}</p>}
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === href : pathname === href || pathname.startsWith(href + '/')
            return <Link href={href} key={href} className="personal-menu-row" aria-label={label} aria-current={active ? 'page' : undefined} data-shapeos-tooltip={compact ? label : undefined} onClick={mobile ? onClose : undefined}>
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />{!compact && <span>{label}</span>}
            </Link>
          })}
        </div>)}
      </nav>
      <div className="personal-menu-footer">
        <div className="personal-menu-profile" data-shapeos-tooltip={compact ? name + ' · Personal' : undefined} tabIndex={compact ? 0 : undefined} aria-label={compact ? name + ' · Personal' : undefined}>
          <span className="personal-avatar" aria-hidden="true">{initials}</span>
          {!compact && <div><p>{name}</p><span>Personal</span></div>}
        </div>
        <button type="button" className="personal-menu-row personal-logout" onClick={sair} disabled={signingOut} aria-label={signingOut ? 'Saindo…' : 'Sair'} data-shapeos-tooltip={compact ? 'Sair' : undefined}><LogOut size={18} strokeWidth={1.75} aria-hidden="true" />{!compact && <span>{signingOut ? 'Saindo…' : 'Sair'}</span>}</button>
        {error && <p className="personal-menu-error" role="alert">{error}</p>}
      </div>
    </>
  }

  return <>
    <aside className="personal-sidebar" data-collapsed={collapsed}>{contents()}</aside>
    <dialog ref={dialogRef} id="personal-mobile-menu" className="personal-mobile-dialog" aria-label="Menu do Personal" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="personal-mobile-menu">{contents(true)}</div>
    </dialog>
  </>
}
