'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, Megaphone, MessageCircle, Library, LifeBuoy, Users, Dumbbell, FileDown, LogOut, Ruler, TrendingUp, X } from 'lucide-react'
import Logo from '@/davi/components/Logo'
import type { DashboardNavigationControls } from './dashboard-shell'

export const studentTabs = [
  { id: 'treino', label: 'Treinar', Icon: Dumbbell, description: 'Suas fichas e sessões de treino.' },
  { id: 'evolucao', label: 'Evolução', Icon: TrendingUp, description: 'Consulte sua frequência e seus registros.' },
  { id: 'agenda', label: 'Agenda', Icon: CalendarDays, description: 'Organize os próximos treinos.' },
  { id: 'avaliacao', label: 'Avaliações', Icon: Ruler, description: 'Acompanhe medidas e avaliações físicas.' },
  { id: 'orientacoes', label: 'Comunicados', Icon: Megaphone, description: 'Leia as orientações do Personal e os avisos recebidos.' },
  { id: 'personal', label: 'Meu Personal', Icon: Users, description: 'Seus vínculos e o acompanhamento do Personal.' },
  { id: 'biblioteca', label: 'Biblioteca de exercícios', Icon: Library, description: 'Consulte os exercícios das suas fichas ativas.' },
  { id: 'mys', label: 'Mys · Assistente', Icon: MessageCircle, description: 'Entenda sua ficha e consulte seus registros.' },
  { id: 'conta', label: 'Minha conta', Icon: CircleUserRound, description: 'Seus dados e a segurança do seu acesso.' },
  { id: 'ajuda', label: 'Ajuda e suporte', Icon: LifeBuoy, description: 'Fale com seu Personal ou com a administração.' },
  { id: 'dados', label: 'Meus dados', Icon: FileDown, description: 'Exporte e importe seus registros.' },
] as const
export type StudentTab = typeof studentTabs[number]['id']

// Explicit item order, matching Admin and Personal with Mys at the top.
const studentMenuGroups = [
  { label: 'Acompanhamento', ids: ['mys', 'treino', 'evolucao', 'agenda', 'avaliacao', 'orientacoes'] },
  { label: 'Gestão', ids: ['personal', 'biblioteca'] },
  { label: 'Conta', ids: ['conta', 'dados', 'ajuda'] },
] as const satisfies ReadonlyArray<{ label: string; ids: readonly StudentTab[] }>

const studentTabsById = Object.fromEntries(studentTabs.map(item => [item.id, item])) as Record<StudentTab, typeof studentTabs[number]>

export function StudentSidebar({ collapsed, onToggle, mobileOpen, onClose, tab, onSelect, name, onLogout, locked = false }: DashboardNavigationControls & {
  tab: StudentTab; onSelect: (tab: StudentTab) => void; name: string; onLogout: () => Promise<void>; locked?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    const desktop = window.matchMedia('(min-width: 1024px)')
    const resize = () => { if (desktop.matches) onClose() }
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    desktop.addEventListener('change', resize)
    const element = dialog.current
    return () => {
      desktop.removeEventListener('change', resize)
      element?.close()
      document.body.style.overflow = previousOverflow
      if (!desktop.matches && previousFocus?.isConnected) previousFocus.focus()
    }
  }, [mobileOpen, onClose])
  async function logout() {
    if (signingOut) return
    setSigningOut(true); setError('')
    try { await onLogout() }
    catch { setError('Não foi possível sair. Tente novamente.') }
    finally { setSigningOut(false) }
  }
  function contents(mobile = false) {
    const compact = collapsed && !mobile
    const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A'
    const select = (next: StudentTab) => { if (locked) return; onSelect(next); if (mobile) onClose() }
    return <>
      <div className="personal-menu-brand">
        <button type="button" className="personal-logo student-menu-logo" aria-label="ShapeOS · Treinar" onClick={() => select('treino')} disabled={locked}><Logo size="sm" showTagline /></button>
        {mobile ? <button type="button" className="personal-icon-button" aria-label="Fechar menu" onClick={onClose}><X size={20} /></button> : <button type="button" className="personal-icon-button personal-menu-toggle" aria-label={compact ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!compact} data-shapeos-tooltip={compact ? 'Expandir menu' : 'Recolher menu'} onClick={onToggle}>{compact ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button>}
      </div>
      <div className="personal-menu-area" data-shapeos-tooltip={compact ? 'Área do Aluno' : undefined}><CircleUserRound size={19} strokeWidth={1.75} aria-hidden="true" />{!compact && <span>Área do Aluno</span>}</div>
      <nav aria-label="Menu do Aluno" className="personal-menu-nav">
        {studentMenuGroups.map(group=><div className="personal-menu-group" key={group.label}>
          {!compact && <p className="personal-menu-group-label">{group.label}</p>}
          {group.ids.map(id => studentTabsById[id]).map(({id,label,Icon}) => <button key={id} type="button" className="personal-menu-row" aria-label={label} aria-current={tab === id ? 'page' : undefined} disabled={locked} data-shapeos-tooltip={compact ? label : undefined} onClick={() => select(id)}><Icon size={18} strokeWidth={1.75} aria-hidden="true" />{!compact && <span>{label}</span>}</button>)}
        </div>)}
        {locked && !compact && <p className="student-menu-hint">Seu treino está aberto. Use os controles da sessão para voltar ao painel.</p>}
      </nav>
      <div className="personal-menu-footer">
        <button type="button" className="personal-menu-row student-footer-action" aria-label="Voltar ao app" disabled={locked || signingOut} data-shapeos-tooltip={compact ? 'Voltar ao app' : undefined} onClick={() => select('treino')}><ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />{!compact && <span>Voltar ao app</span>}</button>
        <button type="button" className="personal-menu-row personal-logout student-footer-action" aria-label={signingOut ? 'Saindo…' : 'Sair'} disabled={signingOut} data-shapeos-tooltip={compact ? 'Sair' : undefined} onClick={() => void logout()}><LogOut size={18} strokeWidth={1.75} aria-hidden="true" />{!compact && <span>{signingOut ? 'Saindo…' : 'Sair'}</span>}</button>{error && <p className="personal-menu-error" role="alert">{error}</p>}</div>
      <div className="personal-menu-profile" data-shapeos-tooltip={compact ? `${name} · Aluno` : undefined} tabIndex={compact ? 0 : undefined} aria-label={compact ? `${name} · Aluno` : undefined}><span className="personal-avatar" aria-hidden="true">{initials}</span>{!compact && <div><p>{name}</p><span>Aluno</span></div>}</div>
    </>
  }
  return <>
    <aside className="personal-sidebar" data-collapsed={collapsed}>{contents()}</aside>
    <dialog ref={dialog} id="personal-mobile-menu" className="personal-mobile-dialog" aria-label="Menu do Aluno" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}><div className="personal-mobile-menu">{contents(true)}</div></dialog>
    <style jsx global>{`
      [data-student-shell] .student-menu-logo { border:0; padding:0; background:transparent; cursor:pointer; text-align:left; }
      [data-student-shell] .student-menu-hint { color:var(--p-muted); font-size:11px; line-height:1.6; padding:8px 10px; }
      html body [data-student-shell] .personal-menu-footer .personal-menu-row.student-footer-action:is(:hover,:active) { background:transparent!important; border-color:transparent!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:none!important; }
    `}</style>
  </>
}
