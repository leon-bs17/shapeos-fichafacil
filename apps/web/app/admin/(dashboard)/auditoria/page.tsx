'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Activity, Ban, CheckCircle2, Clock3, Search, ShieldCheck, UserRoundCheck, ClipboardList, Users, Eye, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Auditoria = {
  id: string
  admin_id: string
  usuario_id: string | null
  acao: 'APROVAR_USUARIO' | 'BLOQUEAR_USUARIO' | 'REATIVAR_USUARIO' | 'ALTERAR_TIPO' | 'EDITAR_USUARIO' | 'VINCULAR' | 'DESATIVAR_VINCULO' | 'EDITAR_TREINO' | 'CONFIGURAR'
  detalhes: Record<string, unknown>
  criado_em: string
}

type UsuarioMinimo = { id: string; nome: string; email: string }

const acaoConfig = {
  EDITAR_USUARIO: { label: 'Conta atualizada', icon: ShieldCheck, classe: 'text-info bg-info/10' },
  VINCULAR: { label: 'Vínculo ativado', icon: ShieldCheck, classe: 'text-success bg-success/10' },
  DESATIVAR_VINCULO: { label: 'Vínculo desativado', icon: Ban, classe: 'text-warning bg-warning/10' },
  EDITAR_TREINO: { label: 'Treino atualizado', icon: Activity, classe: 'text-info bg-info/10' },
  CONFIGURAR: { label: 'Configuração alterada', icon: ShieldCheck, classe: 'text-warning bg-warning/10' },
  APROVAR_USUARIO: { label: 'Usuário aprovado', icon: CheckCircle2, classe: 'text-success bg-success/10' },
  BLOQUEAR_USUARIO: { label: 'Usuário bloqueado', icon: Ban, classe: 'text-destructive bg-destructive/10' },
  REATIVAR_USUARIO: { label: 'Usuário reativado', icon: UserRoundCheck, classe: 'text-info bg-info/10' },
  ALTERAR_TIPO: { label: 'Tipo alterado', icon: ShieldCheck, classe: 'text-warning bg-warning/10' },
} as const


type UserFilterOption = { value: string; label: string }
const ACTION_OPTIONS: UserFilterOption[] = [
  { value: 'TODOS', label: 'Todas' },
  ...Object.entries(acaoConfig).map(([value, config]) => ({ value, label: config.label })),
]
const PERIOD_OPTIONS: UserFilterOption[] = [
  { value: 'TODOS', label: 'Todo período' }, { value: 'HOJE', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' }, { value: '30', label: 'Últimos 30 dias' },
]
const dateOptions = { timeZone: 'America/Fortaleza' } as const
const dateLabel = (value: string) => new Date(value).toLocaleDateString('pt-BR', dateOptions)
const timeLabel = (value: string) => new Date(value).toLocaleTimeString('pt-BR', { ...dateOptions, hour: '2-digit', minute: '2-digit' })
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : words[0]?.slice(0, 2).toUpperCase() || '?'
}
const detailLabels: Record<string, string> = {
  nome: 'Nome', email: 'E-mail', status_anterior: 'Status anterior', status_novo: 'Novo status',
  tipo_anterior: 'Perfil anterior', tipo_novo: 'Novo perfil', antes: 'Antes', depois: 'Depois',
  alteracoes: 'Alterações', dados: 'Dados', acao: 'Ação',
}
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return 'Não informado'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}
function DetailFields({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details)
  return entries.length ? <dl className="audit-detail-changes">{entries.map(([key, value]) =>
    <div key={key}><dt>{detailLabels[key] ?? key.replace(/_/g, ' ')}</dt><dd>{displayValue(value)}</dd></div>
  )}</dl> : <p className="audit-no-details">Este registro não contém alterações adicionais.</p>
}

export default function AdminAuditoriaPage() {
  const [busca, setBusca] = useState('')
  const [acao, setAcao] = useState('TODOS')
  const [periodo, setPeriodo] = useState('TODOS')
  const [pagina, setPagina] = useState(1)
  const [selected, setSelected] = useState<Auditoria | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-auditoria'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: eventos, error } = await supabase
        .from('admin_auditoria')
        .select('id, admin_id, usuario_id, acao, detalhes, criado_em')
        .order('criado_em', { ascending: false })
        .limit(200)

      if (error) throw error

      const lista = (eventos ?? []) as Auditoria[]
      const ids = Array.from(new Set(lista.flatMap((e) => [e.admin_id, e.usuario_id].filter(Boolean)))) as string[]
      let usuarios: UsuarioMinimo[] = []

      if (ids.length > 0) {
        const { data: encontrados, error: erroUsuarios } = await supabase
          .from('usuarios')
          .select('id, nome, email')
          .in('id', ids)
        if (erroUsuarios) throw erroUsuarios
        usuarios = (encontrados ?? []) as UsuarioMinimo[]
      }

      return { eventos: lista, usuarios }
    },
  })

  const nomes = useMemo(() => new Map((data?.usuarios ?? []).map(u => [u.id, u])), [data?.usuarios])
  const configFor = (evento: Auditoria) => acaoConfig[evento.acao] ?? { label: evento.acao, icon: Activity, classe: 'text-info bg-info/10' }
  const targetName = (evento: Auditoria) => (evento.usuario_id ? nomes.get(evento.usuario_id)?.nome : null) ?? (typeof evento.detalhes?.nome === 'string' ? evento.detalhes.nome : 'Não informado')
  const filtrados = useMemo(() => {
    const term = busca.trim().toLocaleLowerCase('pt-BR')
    const today = new Date(new Date().toLocaleDateString('sv-SE', dateOptions) + 'T00:00:00-03:00').getTime()
    const days = periodo === 'HOJE' ? 1 : Number(periodo)
    const cutoff = periodo === 'TODOS' ? null : today - (days - 1) * 86_400_000
    return (data?.eventos ?? []).filter(evento => {
      if (acao !== 'TODOS' && evento.acao !== acao) return false
      if (cutoff !== null && new Date(evento.criado_em).getTime() < cutoff) return false
      const admin = nomes.get(evento.admin_id)
      const alvo = evento.usuario_id ? nomes.get(evento.usuario_id) : null
      return !term || [admin?.nome, admin?.email, alvo?.nome, alvo?.email, evento.detalhes?.nome, configFor(evento).label]
        .some(value => typeof value === 'string' && value.toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [busca, acao, periodo, data?.eventos, nomes])
  const total = filtrados.length
  const pages = Math.max(1, Math.ceil(total / 5))
  const current = Math.min(pagina, pages)
  const start = (current - 1) * 5
  const rows = filtrados.slice(start, start + 5)
  const latest = data?.eventos[0]
  const admins = new Set((data?.eventos ?? []).map(evento => evento.admin_id)).size
  useEffect(() => { setPagina(1) }, [busca, acao, periodo])
  useEffect(() => {
    if (!selected) return
    const dialog = dialogRef.current
    const focused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; focused?.focus() }
  }, [selected])
  useEffect(() => {
    const html = document.documentElement
    let theme = html.classList.contains('dark')
    let frame = 0
    let style: HTMLStyleElement | null = null
    const restore = () => { style?.remove(); style = null }
    const observer = new MutationObserver(() => {
      const next = html.classList.contains('dark')
      if (next === theme) return
      theme = next; cancelAnimationFrame(frame); restore()
      style = document.createElement('style')
      style.textContent = '.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace.audit-workspace * { transition:none!important; }'
      document.head.appendChild(style)
      const root = document.querySelector('.audit-workspace')
      if (root) window.getComputedStyle(root).backgroundColor
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(restore) })
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => { observer.disconnect(); cancelAnimationFrame(frame); restore() }
  }, [])
  return <div className="audit-workspace">
    <header className="audit-hero">
      <div className="audit-hero-copy"><p className="eyebrow">Gestão</p>
        <h1>Histórico <span>administrativo</span></h1>
        <p>Acompanhe decisões de acesso e alterações realizadas no painel.</p>
      </div>
      <AuditWireframe />
    </header>
    <section className="audit-stats" aria-label="Resumo dos registros carregados">
      <div className="audit-stat"><span className="audit-stat-icon"><ClipboardList size={25} /></span><div><p>Registros</p><strong>{isLoading || error ? '—' : data?.eventos.length ?? 0}</strong></div></div>
      <div className="audit-stat"><span className="audit-stat-icon"><Users size={25} /></span><div><p>Administradores</p><strong>{isLoading || error ? '—' : admins}</strong></div></div>
      <div className="audit-stat"><span className="audit-stat-icon"><Clock3 size={25} /></span><div><p>Último registro</p><strong>{!error && latest ? new Date(latest.criado_em).toLocaleDateString('pt-BR', { ...dateOptions, day: '2-digit', month: 'short' }) : '—'}</strong></div></div>
    </section>
    <section className="audit-filters" aria-label="Busca e filtros de auditoria">
      <div className="audit-toolbar"><div data-admin-search className="audit-search"><Search size={19} aria-hidden="true" />
        <Input value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar administrador, usuário ou ação..." aria-label="Buscar administrador, usuário ou ação" />
      </div>
      <AuditFilterSelect label="Ação" value={acao} onChange={setAcao} options={ACTION_OPTIONS} />
      <AuditFilterSelect label="Período" value={periodo} onChange={setPeriodo} options={PERIOD_OPTIONS} /></div>
      {(acao !== 'TODOS' || periodo !== 'TODOS') && <div className="audit-active-filters"><span>Filtros ativos:</span>
        {acao !== 'TODOS' && <button type="button" onClick={() => setAcao('TODOS')} aria-label="Remover filtro de ação">{ACTION_OPTIONS.find(option => option.value === acao)?.label}<X size={14}/></button>}
        {periodo !== 'TODOS' && <button type="button" onClick={() => setPeriodo('TODOS')} aria-label="Remover filtro de período">{PERIOD_OPTIONS.find(option => option.value === periodo)?.label}<X size={14}/></button>}
        <button type="button" className="audit-clear" onClick={() => { setAcao('TODOS'); setPeriodo('TODOS') }}>Limpar filtros</button>
      </div>}
    </section>
    {error ? <section className="audit-message" role="alert"><p>Não foi possível carregar os registros de auditoria.</p><button type="button" disabled={isFetching} className="audit-button" onClick={() => refetch()}>{isFetching ? 'Carregando...' : 'Tentar novamente'}</button></section> :
      isLoading ? <div className="audit-loading" role="status" aria-label="Carregando registros de auditoria">{[0,1,2].map(i => <div key={i} className="skeleton" />)}</div> :
      !total ? <section className="audit-message"><Clock3 size={32}/><h2>{data?.eventos.length ? 'Nenhum registro encontrado' : 'Nenhuma ação registrada'}</h2><p>{data?.eventos.length ? 'Tente ajustar a busca ou os filtros.' : 'As decisões administrativas aparecerão aqui.'}</p></section> :
      <section className="audit-table-card">
        <div className="audit-table-heading"><h2>Registros de auditoria</h2><span>{total} {total === 1 ? 'registro' : 'registros'}</span></div>
        <div className="audit-table-wrap"><table className="audit-table">
          <caption className="sr-only">Registros de decisões administrativas</caption>
          <colgroup><col className="audit-col-action"/><col className="audit-col-person"/><col className="audit-col-person"/><col className="audit-col-date"/><col className="audit-col-view"/></colgroup>
          <thead><tr>{['Ação','Administrador','Usuário','Data e hora','Ações'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{rows.map(evento => {
            const config = configFor(evento)
            const Icon = config.icon
            const admin = nomes.get(evento.admin_id)?.nome ?? 'Administrador'
            const target = targetName(evento)
            return <tr key={evento.id}>
              <td data-label="Ação"><div className="audit-event"><span className={'audit-event-icon ' + config.classe}><Icon size={18}/></span><strong>{config.label}</strong></div></td>
              <td data-label="Administrador"><div className="audit-person"><span className="audit-avatar" aria-hidden="true">{initials(admin)}</span><span>{admin}</span></div></td>
              <td data-label="Usuário"><div className="audit-person"><span className="audit-avatar" aria-hidden="true">{initials(target)}</span><span>{target}</span></div></td>
              <td data-label="Data e hora"><time dateTime={evento.criado_em}>{dateLabel(evento.criado_em)}<span>{timeLabel(evento.criado_em)}</span></time></td>
              <td data-label="Ações"><button type="button" className="audit-button" aria-label={'Ver detalhes de ' + config.label} onClick={() => setSelected(evento)}><Eye size={15}/>Ver</button></td>
            </tr>
          })}</tbody>
        </table></div>
        <footer className="audit-pagination"><span>{start + 1}–{Math.min(start + 5, total)} de {total} registros</span><nav aria-label="Paginação da auditoria">
          <button type="button" className="audit-button" aria-label="Página anterior" disabled={current === 1} onClick={() => setPagina(current - 1)}><ChevronLeft size={16}/></button>
          <span className="audit-current" aria-current="page">{current}</span>
          <button type="button" className="audit-button" aria-label="Próxima página" disabled={current === pages} onClick={() => setPagina(current + 1)}><ChevronRight size={16}/></button>
        </nav></footer>
      </section>}
    {!isLoading && !error && <p className="audit-scope">Resumo dos até 200 registros mais recentes carregados.</p>}
    <dialog ref={dialogRef} className="audit-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setSelected(null) }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSelected(null)
    }}>
      {selected && <><header className="audit-dialog-heading"><div><p>Auditoria</p><h2 id={titleId}>Detalhes do registro</h2></div><button type="button" autoFocus className="audit-button" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X size={20}/></button></header>
        <div className="audit-detail-summary"><ShieldCheck size={26}/><div><h3>{configFor(selected).label}</h3><p>{dateLabel(selected.criado_em)} às {timeLabel(selected.criado_em)}</p></div></div>
        <dl className="audit-detail-people"><div><dt>Administrador</dt><dd>{nomes.get(selected.admin_id)?.nome ?? 'Administrador'}</dd>{nomes.get(selected.admin_id)?.email && <dd className="audit-detail-email">{nomes.get(selected.admin_id)?.email}</dd>}</div>
          <div><dt>Usuário</dt><dd>{targetName(selected)}</dd>{selected.usuario_id && nomes.get(selected.usuario_id)?.email && <dd className="audit-detail-email">{nomes.get(selected.usuario_id)?.email}</dd>}</div></dl>
        <section className="audit-changes"><h3>Alterações registradas</h3><DetailFields details={selected.detalhes ?? {}} /></section>
        <footer><button type="button" className="audit-button" onClick={() => setSelected(null)}>Fechar</button></footer>
      </>}
    </dialog>
    <style jsx global>{`
      .audit-workspace { --audit-surface:#fcfdf9; --audit-border:#d7ded3; --audit-text:#162623; --audit-muted:#5f6f68; --audit-brand:#129b89; display:grid; gap:18px; min-width:0; padding-bottom:24px; font-family:'Sora',sans-serif; }
      html.dark .audit-workspace { --audit-surface:#091c18; --audit-border:#1c4037; --audit-text:#f5faf9; --audit-muted:#a3becd; --audit-brand:#00e9df; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace { color:var(--audit-text); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero { position:relative; isolation:isolate; overflow:hidden; min-height:225px; padding:34px 36px; display:flex; align-items:center; border:1px solid var(--audit-border); border-radius:17px; background:radial-gradient(ellipse at 84% 60%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%); }
      html.dark [data-admin-route="/admin/auditoria"] .audit-workspace .audit-hero { background:radial-gradient(ellipse at 84% 60%,#073d32 0%,#071d18 43%,#041512 100%); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero-copy { position:relative; z-index:1; max-width:70%; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 { font-size:46px; font-weight:800; line-height:1.12; letter-spacing:-.045em; color:var(--audit-text); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 span { color:var(--audit-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 + p { margin-top:13px; font-size:16px; line-height:1.6; color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-wireframe { position:absolute; right:0; top:50%; transform:translateY(-50%); width:40%; max-width:500px; color:var(--audit-brand); pointer-events:none; opacity:.65; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat { display:flex; align-items:center; gap:16px; min-width:0; padding:20px; background:var(--audit-surface); border:1px solid var(--audit-border); border-radius:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat-icon { display:grid; place-items:center; width:48px; height:48px; border-radius:13px; flex-shrink:0; background:color-mix(in srgb,var(--audit-brand) 7%,transparent); color:var(--audit-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat p { font-size:12px; color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat strong { display:block; margin-top:5px; font-size:24px; font-weight:700; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 230px 210px; gap:12px; align-items:start; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-search { border-radius:13px!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select { position:relative; min-width:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-button, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-active-filters button { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:0 14px; border:1px solid var(--audit-border); border-radius:13px; background:var(--audit-surface); color:var(--audit-text); font-size:12px; cursor:pointer; transition:background-color 150ms ease,border-color 150ms ease!important; box-shadow:none; transform:none; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger { width:100%; height:48px; justify-content:space-between; color:var(--audit-muted); font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger > span { min-width:0; text-align:left; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger strong { font-weight:600; color:var(--audit-text); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger svg, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-button svg { flex-shrink:0; color:inherit; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-menu { position:absolute; z-index:40; right:0; top:calc(100% + 8px); width:280px; max-width:calc(100vw - 32px); max-height:min(380px,calc(100dvh - 24px)); overflow-y:auto; overscroll-behavior:contain; padding:6px; border:1px solid var(--audit-border); border-radius:13px; background:var(--audit-surface); color:var(--audit-text); box-shadow:0 8px 24px rgba(0,0,0,.12); outline:none; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-menu[data-above="true"] { top:auto; bottom:calc(100% + 8px); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-option { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:44px; padding:9px 10px; border:1px solid transparent; border-radius:13px; font-size:13px; cursor:pointer; transition:background-color 150ms ease,border-color 150ms ease; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-option + .audit-select-option { margin-top:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-option svg { flex-shrink:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-option[aria-selected="true"] { background:color-mix(in srgb,var(--audit-brand) 7%,transparent); color:var(--audit-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-menu:focus .audit-select-option[data-active="true"] { border-color:color-mix(in srgb,var(--audit-brand) 40%,transparent); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-active-filters { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px; font-size:12px; color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-active-filters button { min-height:36px; background:color-mix(in srgb,var(--audit-brand) 7%,transparent); color:var(--audit-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-active-filters .audit-clear { background:transparent; border-color:transparent; color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace button:focus-visible { outline:2px solid var(--audit-brand); outline-offset:3px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace button:disabled { opacity:.4; cursor:default; }
      @media(hover:hover) and (pointer:fine) {
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-search:hover, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace :is(.audit-select-trigger,.audit-button,.audit-active-filters button):hover:enabled, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-option:hover { background:color-mix(in srgb,var(--audit-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--audit-brand) 40%,transparent)!important; }
      }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table-card { border:1px solid var(--audit-border); border-radius:14px; background:var(--audit-surface); overflow:hidden; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px; border-bottom:1px solid var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace h2 { font-size:15px; font-weight:650; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading > span { color:var(--audit-muted); font-size:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table { width:100%; table-layout:fixed; border-collapse:collapse; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-action { width:26%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-person { width:24%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-date { width:16%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-view { width:10%; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table th { padding:14px 18px; color:var(--audit-muted); font-size:10px; font-weight:650; text-align:left; text-transform:uppercase; letter-spacing:.05em; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td { padding:14px 18px; border-top:1px solid var(--audit-border); vertical-align:middle; font-size:12px; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table th:last-child, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td:last-child { text-align:center; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td:last-child .audit-button { min-height:36px; padding:0 12px; white-space:nowrap; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-event, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-person { display:flex; align-items:center; gap:10px; min-width:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-event strong { font-weight:600; line-height:1.5; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-event-icon { display:grid; place-items:center; width:34px; height:34px; flex-shrink:0; border-radius:10px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-avatar { display:grid; place-items:center; width:30px; height:30px; flex-shrink:0; border-radius:50%; background:linear-gradient(145deg,#6f86b6,#4f678f); color:#fff; font-size:10px; font-weight:700; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace time { display:block; color:var(--audit-muted); font-variant-numeric:tabular-nums; line-height:1.6; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace time span { display:block; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:16px 20px; border-top:1px solid var(--audit-border); color:var(--audit-muted); font-size:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination nav { display:flex; align-items:center; gap:6px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination .audit-button { width:36px; min-height:36px; padding:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-current { display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:var(--audit-brand); color:#fff; }
      html.dark [data-admin-route="/admin/auditoria"] .audit-workspace .audit-current { color:#002a26; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-scope { color:var(--audit-muted); font-size:11px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-message { display:grid; justify-items:center; gap:12px; padding:36px 24px; text-align:center; background:var(--audit-surface); border:1px solid var(--audit-border); border-radius:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-message p { color:var(--audit-muted); font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-loading { display:grid; gap:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-loading > div { height:70px; border-radius:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog { width:min(620px,calc(100vw - 32px)); padding:24px; background:var(--audit-surface); color:var(--audit-text); border:1px solid var(--audit-border); border-radius:18px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading p { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--audit-muted); margin-bottom:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading h2 { font-size:22px; font-weight:700; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading .audit-button { width:44px; padding:0; flex-shrink:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary { display:flex; align-items:center; gap:14px; border:1px solid var(--audit-border); border-radius:13px; padding:18px; margin:20px 0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary > svg { color:var(--audit-brand); flex-shrink:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary h3, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-changes h3 { font-size:15px; font-weight:650; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary p { font-size:12px; color:var(--audit-muted); margin-top:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog dt { color:var(--audit-muted); font-size:12px; margin-bottom:5px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog dd { font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog .audit-detail-email { color:var(--audit-muted); font-size:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-changes { margin-top:22px; padding-top:20px; border-top:1px solid var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-changes { margin-top:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-changes > div { padding:12px 0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-changes > div + div { border-top:1px solid var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-changes dd { white-space:pre-wrap; max-height:240px; overflow:auto; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-no-details { font-size:13px; color:var(--audit-muted); margin-top:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog footer { display:flex; justify-content:flex-end; margin-top:20px; padding-top:16px; border-top:1px solid var(--audit-border); }
      @media(min-width:768px) and (max-width:1199px) {
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-toolbar { grid-template-columns:minmax(0,1fr) 210px 200px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table th, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td { padding-left:10px; padding-right:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-event, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-person { gap:7px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-action { width:25%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-person { width:23%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-date { width:17%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-col-view { width:12%; }
      }
      @media(max-width:767px) {
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero { padding:27px 22px; min-height:220px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero-copy { max-width:100%; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 { font-size:32px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 + p { font-size:14px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-wireframe { width:360px; right:-200px; opacity:.18; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat { padding:16px; gap:12px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat:last-child { grid-column:1/-1; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat-icon { width:40px; height:40px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stat strong { font-size:22px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-toolbar { grid-template-columns:minmax(0,1fr); gap:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-option { font-size:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-select-menu { width:100%; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-active-filters button { min-height:44px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading { padding:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table tbody { display:block; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table colgroup, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table thead { display:none; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table tr { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:16px 14px; padding:18px 16px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table tr + tr { border-top:1px solid var(--audit-border); }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td { display:block; padding:0; border:0; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Ação"], html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Data e hora"], html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Ações"] { grid-column:1/-1; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td:not([data-label="Ação"]):not([data-label="Ações"])::before { content:attr(data-label); display:block; margin-bottom:7px; color:var(--audit-muted); font-size:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td:last-child { text-align:left; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td:last-child .audit-button { min-height:44px; width:100%; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace time { display:flex; gap:10px; flex-wrap:wrap; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination { padding:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination .audit-button, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-current { width:44px; height:44px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog { padding:20px; width:calc(100vw - 24px); }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading h2 { font-size:20px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people { grid-template-columns:minmax(0,1fr); gap:16px; }
      }
      @media(max-width:359px) { html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-stats { grid-template-columns:minmax(0,1fr); } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table tr { grid-template-columns:minmax(0,1fr); } }
      @media(prefers-reduced-motion:reduce) { html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace :is(.audit-search,.audit-select-trigger,.audit-select-option,.audit-button,.audit-active-filters button) { transition:none!important; } }
    `}</style>
  </div>
}
function AuditFilterSelect({ label: fieldLabel, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: UserFilterOption[]
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [above, setAbove] = useState(false)
  const [menuHeight, setMenuHeight] = useState(380)
  const selected = Math.max(0, options.findIndex((option) => option.value === value))

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        const below = window.innerHeight - rect.bottom - 16
        const above = rect.top - 16
        const showAbove = below < Math.min(380, options.length * 48 + 12) && above > below
        setAbove(showAbove)
        setMenuHeight(Math.max(80, Math.min(380, showAbove ? above : below)))
      }
    }
    place()
    listRef.current?.focus({ preventScroll: true })
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div ref={rootRef} className="audit-select" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="audit-select-trigger"
      aria-label={`Filtrar por ${fieldLabel.toLowerCase()}: ${options[selected].label}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setActive(selected); setOpen(!open) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive(selected); setOpen(true)
        }
      }}>
      <span>{fieldLabel}: <strong>{options[selected].label}</strong></span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div ref={listRef} id={id} role="listbox" tabIndex={-1} className="audit-select-menu"
      data-above={above} style={{ maxHeight: menuHeight }} aria-label={`Opções de ${fieldLabel.toLowerCase()}`} aria-activedescendant={`${id}-${active}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus()
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length)
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); choose(active)
        } else if (event.key.length === 1) {
          const index = options.findIndex((option) => option.label.toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR')))
          if (index >= 0) { event.preventDefault(); setActive(index) }
        }
      }}>
      {options.map(({ value: optionValue, label }, index) => <div
        key={optionValue} id={`${id}-${index}`} role="option"
        aria-selected={value === optionValue} data-active={active === index}
        className="audit-select-option"
        onPointerDown={(event) => event.preventDefault()}
        onPointerMove={() => setActive(index)}
        onClick={() => choose(index)}>
        <span>{label}</span>
        {value === optionValue && <Check size={17} strokeWidth={2} />}
      </div>)}
    </div>}
  </div>
}



function AuditWireframe() {
  return <svg className="audit-wireframe" viewBox="0 0 480 260" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth=".8"><path d="M40 170L190 80L420 150L260 240Z" opacity=".3"/><path d="M65 110L200 40L435 105L305 180Z" opacity=".25"/>
      {[0,1,2].map(i => <g key={i} transform={`translate(${125+i*60} ${105-i*25})`}><path d="M0 0Q0-12 12-7L115 40Q128 46 128 60V150Q128 164 115 158L12 111Q0 105 0 91Z" fill="var(--audit-surface)" fillOpacity=".3"/>{[20,43,66].map(y => <path key={y} d={`M23 ${y}L96 ${y+33}`} opacity=".65"/>)}</g>)}
      <path d="M65 110L125 105M253 255L420 150M435 105L425 55" opacity=".5"/>
    </g>{[{x:65,y:110},{x:190,y:80},{x:420,y:150},{x:260,y:240},{x:425,y:55}].map((point,i) => <circle key={i} cx={point.x} cy={point.y} r="3" fill="currentColor" />)}
  </svg>
}
