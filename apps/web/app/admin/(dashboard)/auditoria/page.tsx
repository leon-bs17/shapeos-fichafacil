'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, ArrowRight, Info, Activity, Ban, CheckCircle2, Clock3, Search, ShieldCheck, UserRoundCheck, ClipboardList, Users, Eye, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
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
  nome: 'Nome', email: 'E-mail', tipo: 'Perfil', status_conta: 'Status da conta', status: 'Status',
  ativo: 'Ativo', titulo: 'Título', descricao: 'Descrição', criado_em: 'Data de cadastro',
  admin_id: 'Administrador', usuario_id: 'Usuário', aluno_id: 'Aluno', personal_id: 'Personal',
  registro_id: 'Identificador do registro', id: 'Identificador', antes: 'Antes', depois: 'Depois',
}
type AuditChange = { key: string; before: unknown; after: unknown; beforePresent: boolean; afterPresent: boolean }
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function equalAuditValues(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, i) => equalAuditValues(value, b[i]))
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && equalAuditValues(a[key], b[key]))
  }
  return false
}
function compareAuditRecords(before: Record<string, unknown>, after: Record<string, unknown>, prefix = ''): AuditChange[] {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).flatMap(key => {
    const path = prefix ? prefix + '.' + key : key
    const beforePresent = Object.prototype.hasOwnProperty.call(before, key)
    const afterPresent = Object.prototype.hasOwnProperty.call(after, key)
    if (beforePresent === afterPresent && equalAuditValues(before[key], after[key])) return []
    if (beforePresent && afterPresent && isRecord(before[key]) && isRecord(after[key]))
      return compareAuditRecords(before[key], after[key], path)
    return [{ key: path, before: before[key], after: after[key], beforePresent, afterPresent }]
  })
}
function getAuditChanges(details: Record<string, unknown>): { comparable: boolean; changes: AuditChange[] } {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(details, key)
  if (has('antes') && has('depois') && (isRecord(details.antes) || details.antes === null) && (isRecord(details.depois) || details.depois === null)) {
    return { comparable: true, changes: compareAuditRecords(isRecord(details.antes) ? details.antes : {}, isRecord(details.depois) ? details.depois : {}) }
  }
  const pairs = Object.keys(details).filter(key => key.endsWith('_anterior') && has(key.slice(0, -9) + '_novo'))
  return {
    comparable: pairs.length > 0,
    changes: pairs.flatMap(key => {
      const newKey = key.slice(0, -9) + '_novo'
      return equalAuditValues(details[key], details[newKey]) ? [] : [{
        key: key.slice(0, -9), before: details[key], after: details[newKey], beforePresent: true, afterPresent: true,
      }]
    }),
  }
}
function auditFieldLabel(key: string): string {
  return key.split('.').map(part => detailLabels[part] ?? part.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase())).join(' · ')
}
function displayAuditValue(value: unknown, present = true): string {
  if (!present) return 'Não registrado'
  if (value === null || value === undefined) return 'Não informado'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'string') {
    const labels: Record<string, string> = { ATIVO:'Ativo', INATIVO:'Inativo', PENDENTE:'Pendente', BLOQUEADO:'Bloqueado', ADMIN:'Administrador', PERSONAL:'Personal', ALUNO:'Aluno' }
    if (labels[value]) return labels[value]
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(new Date(value).getTime())) return dateLabel(value) + ' às ' + timeLabel(value)
    return value || 'Vazio'
  }
  if (Array.isArray(value)) return value.length ? value.map(item => displayAuditValue(item)).join('; ') : 'Lista vazia'
  if (isRecord(value)) return Object.entries(value).map(([key, item]) => auditFieldLabel(key) + ': ' + displayAuditValue(item)).join('; ') || 'Sem dados'
  return String(value)
}
function AuditValue({ value, present = true, field }: { value: unknown; present?: boolean; field: string }) {
  const statusField = ['status', 'status_conta', 'ativo'].includes(field.split('.').pop() ?? '')
  const tone = value === 'ATIVO' || value === true ? 'active' : value === 'PENDENTE' ? 'pending' : value === 'BLOQUEADO' ? 'blocked' : 'neutral'
  return statusField && present && value !== null && value !== undefined ?
    <span className="audit-value-badge" data-tone={tone}>{displayAuditValue(value)}</span> :
    <>{displayAuditValue(value, present)}</>
}
function AuditRecordData({ value }: { value: unknown }) {
  if (!isRecord(value)) return <p className="audit-record-value">{displayAuditValue(value)}</p>
  return <dl className="audit-record-fields">{Object.entries(value).map(([key, item]) => <div key={key}>
    <dt>{auditFieldLabel(key)}</dt><dd>{isRecord(item) ? <AuditRecordData value={item}/> : displayAuditValue(item)}</dd>
  </div>)}</dl>
}
function DetailFields({ details }: { details: Record<string, unknown> }) {
  const { comparable, changes } = getAuditChanges(details)
  return <>
    {changes.length ? <div className="audit-diff-wrap"><table className="audit-diff-table">
      <caption className="sr-only">Campos modificados neste registro</caption>
      <colgroup><col className="audit-diff-field"/><col className="audit-diff-before"/><col className="audit-diff-arrow-col"/><col className="audit-diff-after"/></colgroup>
      <thead><tr><th scope="col">Campo</th><th scope="col">Antes</th><th aria-label="Comparação"/><th scope="col">Depois</th></tr></thead>
      <tbody>{changes.map(change => <tr key={change.key}>
        <th scope="row">{auditFieldLabel(change.key)}</th>
        <td data-label="Antes"><AuditValue value={change.before} present={change.beforePresent} field={change.key}/></td>
        <td className="audit-diff-arrow" aria-hidden="true"><ArrowRight size={16}/></td>
        <td data-label="Depois"><AuditValue value={change.after} present={change.afterPresent} field={change.key}/></td>
      </tr>)}</tbody>
    </table></div> : <><div className="audit-change-message"><Info size={25} aria-hidden="true"/><div>
      <h4>{comparable ? 'Nenhuma alteração identificada' : 'Comparação indisponível'}</h4>
      <p>{comparable ? 'Os dados anteriores e posteriores são iguais neste registro.' : 'Este registro não contém os valores anteriores e posteriores para comparação.'}</p>
    </div></div>{comparable && <p className="audit-change-note">A ação foi registrada, mas os valores exibidos não apresentam diferenças.</p>}</>}
    {Object.keys(details).length > 0 && <details className="audit-full-record">
      <summary><span>Consultar dados do registro</span><ChevronDown size={17} aria-hidden="true"/></summary>
      <div className="audit-record-scroll" tabIndex={0} aria-label="Dados completos do registro"><AuditRecordData value={details}/></div>
    </details>}
  </>
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
  return <div className="audit-workspace" data-audit-refined>
    <header className="audit-hero">
      <div className="audit-hero-copy"><p className="eyebrow">Rastreabilidade</p>
        <h2 className="audit-banner-title">Histórico <span>administrativo</span></h2>
        <p>Acompanhe decisões de acesso e alterações realizadas no painel.</p>
      </div>
      <AuditWireframe />
    </header>
    <section className="audit-stats" aria-label="Resumo dos registros carregados">
      <div className="audit-stat"><span data-admin-metric-icon aria-hidden="true" className="audit-stat-icon"><ClipboardList size={25} /></span><div><p>Registros</p><strong>{isLoading || error ? '—' : data?.eventos.length ?? 0}</strong></div></div>
      <div className="audit-stat"><span data-admin-metric-icon aria-hidden="true" className="audit-stat-icon"><Users size={25} /></span><div><p><span className="audit-desktop-copy">Administradores</span><span className="audit-mobile-copy">Admins</span></p><strong>{isLoading || error ? '—' : admins}</strong></div></div>
      <div className="audit-stat"><span data-admin-metric-icon aria-hidden="true" className="audit-stat-icon"><Clock3 size={25} /></span><div><p>Último registro</p><strong>{!error && latest ? new Date(latest.criado_em).toLocaleDateString('pt-BR', { ...dateOptions, day: '2-digit', month: 'short' }) : '—'}</strong></div></div>
    </section>
    <section className="audit-management"><header className="audit-management-heading"><h2>Registros de auditoria</h2><span>{total} {total === 1 ? 'registro' : 'registros'}</span></header><section className="audit-filters" aria-label="Busca e filtros de auditoria">
      <div className="audit-toolbar"><div data-admin-search className="audit-search"><Search size={19} aria-hidden="true" />
        <Input value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar na auditoria" aria-label="Buscar administrador, usuário ou ação" />
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
              <td data-label="Data e hora"><CalendarDays className="audit-mobile-copy audit-date-icon" size={15} aria-hidden="true"/><time dateTime={evento.criado_em}>{dateLabel(evento.criado_em)}<span className="audit-date-time"><span className="audit-desktop-copy">, </span><span className="audit-mobile-copy"> · </span>{timeLabel(evento.criado_em)}</span></time></td>
              <td data-label="Ações"><button type="button" data-admin-view className="audit-button" aria-label={'Ver detalhes de ' + config.label} onClick={() => setSelected(evento)}><Eye size={15}/>Ver</button></td>
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
    </section>
    <dialog ref={dialogRef} className="audit-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setSelected(null) }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSelected(null)
    }}>
      {selected && <><header className="audit-dialog-heading"><div><p>Auditoria</p><h2 id={titleId}>Detalhes do registro</h2></div><button type="button" autoFocus className="audit-button" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X size={20}/></button></header>
        <div className="audit-dialog-body" tabIndex={0} role="region" aria-label="Conteúdo do registro"><div className="audit-detail-summary"><ShieldCheck size={26}/><div><h3>{configFor(selected).label}</h3><p>{dateLabel(selected.criado_em)} às {timeLabel(selected.criado_em)}</p></div></div>
        <dl className="audit-detail-people"><div><dt>Administrador</dt><dd>{nomes.get(selected.admin_id)?.nome ?? 'Administrador'}</dd>{nomes.get(selected.admin_id)?.email && <dd className="audit-detail-email">{nomes.get(selected.admin_id)?.email}</dd>}</div>
          <div><dt>Usuário</dt><dd>{targetName(selected)}</dd>{selected.usuario_id && nomes.get(selected.usuario_id)?.email && <dd className="audit-detail-email">{nomes.get(selected.usuario_id)?.email}</dd>}</div></dl>
        <section className="audit-changes"><h3>Alterações registradas</h3><DetailFields details={selected.detalhes ?? {}} /></section></div>
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

      /* Human-readable audit comparison; original details remain available on demand. */
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message { display:flex; align-items:flex-start; gap:14px; margin-top:16px; padding:18px; border:1px solid var(--audit-border); border-radius:13px; background:color-mix(in srgb,var(--audit-muted) 5%,var(--audit-surface)); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message > svg { flex-shrink:0; color:var(--audit-muted); margin-top:2px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message h4 { font-size:14px; font-weight:650; line-height:1.5; color:var(--audit-text); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message p, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-note { color:var(--audit-muted); font-size:12px; line-height:1.7; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message p { margin-top:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-note { margin-top:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-wrap { margin-top:16px; border:1px solid var(--audit-border); border-radius:13px; overflow:hidden; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table { width:100%; table-layout:fixed; border-collapse:collapse; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table th, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table td { padding:14px; text-align:left; vertical-align:top; overflow-wrap:anywhere; white-space:pre-wrap; font-size:12px; line-height:1.6; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table thead th { color:var(--audit-muted); font-weight:600; background:color-mix(in srgb,var(--audit-brand) 5%,var(--audit-surface)); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tbody th { font-weight:600; color:var(--audit-text); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tbody tr > * { border-top:1px solid var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tbody td:nth-child(2) { color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tbody td:last-child { color:var(--audit-text); font-weight:600; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record { margin-top:18px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record summary { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; min-height:48px; border:1px solid var(--audit-border); border-radius:13px; list-style:none; cursor:pointer; font-size:12px; font-weight:600; color:var(--audit-text); background:var(--audit-surface); transition:background-color 150ms ease,border-color 150ms ease!important; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record summary::-webkit-details-marker { display:none; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record[open] summary > svg { transform:rotate(180deg); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record summary:focus-visible, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record pre:focus-visible { outline:2px solid var(--audit-brand); outline-offset:3px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record > p { font-size:11px; line-height:1.6; color:var(--audit-muted); margin:12px 0 8px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record pre { max-height:280px; overflow:auto; overscroll-behavior:contain; padding:14px; border:1px solid var(--audit-border); border-radius:13px; background:var(--audit-surface); color:var(--audit-muted); font-family:monospace; font-size:11px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; }
      @media(hover:hover) and (pointer:fine) { html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record summary:hover { background:color-mix(in srgb,var(--audit-brand) 7%,transparent); border-color:color-mix(in srgb,var(--audit-brand) 40%,transparent); } }
      @media(max-width:767px) {
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message { padding:16px; gap:12px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tbody { display:block; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table thead { display:none; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tr { display:grid; grid-template-columns:minmax(0,1fr); padding:14px; gap:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tr + tr { border-top:1px solid var(--audit-border); }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table tbody tr > * { display:block; padding:0; border:0; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table td::before { content:attr(data-label); display:block; font-size:10px; font-weight:400; color:var(--audit-muted); margin-bottom:3px; }
      }
      @media(prefers-reduced-motion:reduce) { html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record summary { transition:none!important; } }


      /* Explicit mode selectors outrank the common light hero declaration. */
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero { background:radial-gradient(ellipse at 84% 60%,#073d32 0%,#071d18 43%,#041512 100%)!important; border-color:#1c4037!important; }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero { background:radial-gradient(ellipse at 84% 60%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important; border-color:#d7ded3!important; }
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 { color:#f5faf9!important; }
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 span, html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-wireframe { color:#00e9df!important; }
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 + p { color:#a3becd!important; }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 { color:#162623!important; }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 span, html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-wireframe { color:#129b89!important; }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 + p { color:#5f6f68!important; }
      html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace dialog.audit-dialog[open][open][open][open] {
        display:flex!important; flex-direction:column!important;
        max-height:min(820px,calc(100dvh - 32px))!important; overflow:hidden!important;
        padding:28px!important;
      }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading { flex-shrink:0; padding-bottom:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading h2 { font-size:24px; line-height:1.3; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-body { flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding-right:4px; scrollbar-gutter:stable; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary { padding:20px; margin:20px 0 24px; gap:16px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary h3 { font-size:16px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary p { font-size:13px; line-height:1.6; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people { gap:24px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people > div + div { border-left:1px solid var(--audit-border); padding-left:24px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people dd:not(.audit-detail-email) { font-weight:600; font-size:14px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-email { font-size:13px; line-height:1.7; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-changes { margin-top:26px; padding-top:24px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-changes h3 { font-size:16px; font-weight:700; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog footer { flex-shrink:0; margin-top:24px; padding-top:18px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-field { width:31%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-before { width:29%; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-arrow-col { width:8%; } html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-after { width:32%; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table th, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table td { vertical-align:middle; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table .audit-diff-arrow { padding-left:0; padding-right:0; text-align:center; color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-arrow svg { display:inline-block; vertical-align:middle; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge { display:inline-flex; align-items:center; padding:6px 11px; border-radius:999px; font-size:11px; font-weight:500; line-height:1.5; background:color-mix(in srgb,var(--audit-muted) 8%,transparent); color:var(--audit-muted); }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge[data-tone="active"] { background:#e4f3eb!important; color:#0d7e70!important; }
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge[data-tone="active"] { background:#123b31!important; color:#00e9df!important; }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge[data-tone="pending"] { background:#fff3d6!important; color:#8a5c10!important; }
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge[data-tone="pending"] { background:#352b16!important; color:#edc66a!important; }
      html.light body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge[data-tone="blocked"] { background:#fce6e8!important; color:#a52b3d!important; }
      html.dark body [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-value-badge[data-tone="blocked"] { background:#3b1d26!important; color:#ff8f9b!important; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-scroll { max-height:220px; overflow-y:auto; overscroll-behavior:contain; padding:16px; margin-top:12px; border:1px solid var(--audit-border); border-radius:13px; background:var(--audit-surface); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-scroll:focus-visible { outline:2px solid var(--audit-brand); outline-offset:3px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-fields { display:grid; gap:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-fields > div + div { padding-top:12px; border-top:1px solid var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-fields dt { font-size:12px; line-height:1.5; font-weight:600; color:var(--audit-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-fields dd { font-size:12px; line-height:1.7; color:var(--audit-text); overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-fields .audit-record-fields { margin-top:10px; padding-left:14px; border-left:1px solid var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-value { font-size:12px; line-height:1.7; color:var(--audit-text); }
      @media(max-width:767px) {
        html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace dialog.audit-dialog[open][open][open][open] { max-height:calc(100dvh - 24px)!important; padding:20px!important; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-heading h2 { font-size:20px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary { padding:16px; margin:18px 0; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people { gap:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people > div + div { border-left:0; padding-left:0; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table colgroup, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-diff-table .audit-diff-arrow { display:none; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog footer { margin-top:18px; padding-top:16px; }
      }


      /* Center the original wireframe artwork without changing its dimensions. */
      @media(min-width:768px) {
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-wireframe { top:calc(50% - 16px); }
      }
      /* Match the approved detail preview and use one content scroll area. */
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog { width:min(600px,calc(100vw - 32px)); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-body { scrollbar-gutter:auto; scrollbar-width:thin; scrollbar-color:var(--audit-border) transparent; padding-right:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-body::-webkit-scrollbar { width:6px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-body::-webkit-scrollbar-track { background:transparent; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-body::-webkit-scrollbar-thumb { border-radius:999px; background:var(--audit-border); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog-body:focus-visible { outline:2px solid var(--audit-brand); outline-offset:-2px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary { padding:20px; border-radius:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary > svg { width:30px; height:30px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary h3 { font-size:18px; line-height:1.4; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary p { font-size:14px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people dt { font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-people .audit-detail-email { font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message { padding:20px; gap:16px; background:color-mix(in srgb,var(--audit-muted) 9%,var(--audit-surface)); border-color:color-mix(in srgb,var(--audit-muted) 35%,var(--audit-border)); }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message > svg { width:34px; height:34px; padding:3px; border-radius:50%; background:color-mix(in srgb,var(--audit-muted) 12%,transparent); margin-top:0; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message h4 { font-size:15px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message p, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-note { font-size:13px; line-height:1.65; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-full-record summary { min-height:56px; padding:15px 18px; font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-record-scroll { max-height:none; overflow:visible; }
      html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog footer .audit-button { padding:0 20px; font-size:13px; }
      @media(max-width:767px) {
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-dialog { width:calc(100vw - 24px); }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary h3 { font-size:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-detail-summary p { font-size:13px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message { padding:16px; gap:12px; }
        html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-change-message h4 { font-size:14px; }
      }

    
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] { display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:8px!important; width:auto!important; min-width:84px!important; height:36px!important; min-height:36px!important; padding:0 14px!important; border:1px solid var(--audit-border)!important; border-radius:13px!important; background:transparent!important; background-image:none!important; color:var(--audit-text,#162623)!important; font-size:12px!important; font-weight:600!important; line-height:1.5!important; white-space:nowrap!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] svg { width:15px!important; height:15px!important; color:var(--audit-brand)!important; flex-shrink:0!important; }
@media(hover:hover) and (pointer:fine) { html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]:hover:enabled { background:color-mix(in srgb,var(--audit-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--audit-brand) 40%,transparent)!important; } }
@media(max-width:640px) { html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] { height:44px!important; min-height:44px!important; } }
@media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] { transition:none!important; } }

/* Audit records follow the compact Users table reference. */
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table-card { border-radius:18px; }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading h2 { font-size:14px; font-weight:700; color:var(--audit-text); }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table th { font-weight:600; letter-spacing:.09em; }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-avatar { width:36px; height:36px; font-size:12px; }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-person > span:last-child { font-weight:600; color:var(--audit-text); }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td { color:var(--audit-text); }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table time { color:var(--audit-muted); }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table time span { display:inline; font-size:inherit; color:inherit; margin:0; }
@media(min-width:641px) {
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table th { padding:14px 20px; }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table td { height:50px; padding:7px 20px; }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-person, html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-event { gap:13px; }
html:is(.light,.dark) [data-admin-route="/admin/auditoria"] [data-admin-content] .audit-workspace.audit-workspace .audit-table time { white-space:nowrap; font-size:11px; }
}

.audit-mobile-copy { display:none; }
@media(max-width:767px) {
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace { gap:16px!important;padding-bottom:0!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-hero { min-height:0!important;padding:22px 16px!important;border-radius:16px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-hero-copy { max-width:100%!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 { font-size:30px!important;line-height:1.12!important;overflow-wrap:normal!important;word-break:normal!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-hero h1 + p { font-size:13px!important;line-height:1.55!important;margin-top:12px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-wireframe { width:280px!important;right:-140px!important;opacity:.18!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-stats { grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-stat { grid-column:auto!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;gap:6px!important;min-height:110px!important;padding:10px 5px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-stat>div { min-width:0!important;width:100%!important;display:flex!important;flex-direction:column!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-stat p { font-size:10px!important;line-height:1.3!important;margin:0!important;order:2!important;overflow-wrap:normal!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-stat strong { font-size:24px!important;line-height:1.2!important;order:1!important;overflow-wrap:normal!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-stat:last-child strong { font-size:15px!important;line-height:1.9!important;white-space:nowrap!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-desktop-copy { display:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-mobile-copy { display:inline!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-toolbar { grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-search { grid-column:1/-1!important;height:48px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-search input { font-size:16px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-select { min-width:0!important;width:100%!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger { height:44px!important;min-height:44px!important;padding:0 10px!important;font-size:12px!important;gap:6px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-period-prefix { display:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-select-trigger strong { white-space:normal!important;overflow-wrap:normal!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table-card { background:transparent!important;border:0!important;overflow:visible!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading { padding:0 0 12px!important;border:0!important;gap:8px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading h2 { font-size:14px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table-heading>span { font-size:11px!important;white-space:nowrap!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table-wrap { overflow:visible!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table { display:block!important;min-width:0!important;width:100%!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table tbody { display:grid!important;gap:12px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table tbody tr { display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px 12px!important;padding:16px!important;border:1px solid var(--audit-border)!important;border-radius:13px!important;background:var(--audit-surface)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td { height:auto!important;padding:0!important;border:0!important;min-width:0!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Ação"] { grid-column:1/-1!important;grid-row:1!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-event { gap:10px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-event strong { font-size:13px!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-event-icon { width:32px!important;height:32px!important;min-width:32px!important;border-radius:10px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Administrador"] { grid-column:1!important;grid-row:2!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Usuário"] { grid-column:2!important;grid-row:2!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Administrador"]::before,html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Usuário"]::before { margin-bottom:5px!important;font-size:10px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-person { gap:7px!important;min-width:0!important;align-items:center!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-person>span:last-child { font-size:11px!important;white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-avatar { width:28px!important;height:28px!important;min-width:28px!important;font-size:10px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Data e hora"] { grid-column:1/-1!important;grid-row:3!important;display:flex!important;align-items:center!important;gap:7px!important;font-size:11px!important;color:var(--audit-muted)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Data e hora"]::before { display:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td time { display:inline!important;white-space:normal!important;font-size:11px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-date-icon { display:block!important;flex-shrink:0!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table td[data-label="Ações"] { grid-column:1/-1!important;grid-row:4!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-table [data-admin-view][data-admin-view] { display:flex!important;justify-content:center!important;align-items:center!important;width:100%!important;min-width:0!important;min-height:44px!important;height:44px!important;border-radius:13px!important;background:transparent!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination { display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;gap:12px!important;padding:16px!important;margin-top:16px!important;border:1px solid var(--audit-border)!important;border-radius:13px!important;background:var(--audit-surface)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination nav { display:flex!important;justify-content:center!important;flex-wrap:wrap!important;gap:6px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination .audit-button,html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-pagination .audit-current { width:44px!important;min-width:44px!important;height:44px!important;border-radius:13px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/auditoria"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .audit-workspace.audit-workspace .audit-scope { font-size:10px!important;line-height:1.5!important;text-align:center!important;margin:0!important; }
}
html body :is(#audit-refined,[data-audit-refined]) .audit-hero{min-height:130px!important;padding:22px 26px!important;border-radius:16px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-banner-title{display:block!important;margin:5px 0 8px!important;font-size:28px!important;font-weight:650!important;line-height:1.15!important;letter-spacing:-.035em!important;color:var(--audit-text)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-banner-title span{display:inline!important;color:var(--audit-brand)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-hero-copy>p:last-child{font-size:12px!important;margin-top:8px!important;line-height:1.5!important}
html body :is(#audit-refined,[data-audit-refined]) .eyebrow{font-size:9px!important;padding:4px 10px!important;margin-bottom:6px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stats{gap:0!important;margin:0!important;padding:4px 0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;padding:4px 20px!important;gap:12px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat+.audit-stat{border-left:1px solid var(--audit-border)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat>div{display:flex!important;flex-direction:column!important;gap:3px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat strong{order:0!important;font-size:24px!important;line-height:1.2!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat p{order:1!important;font-size:11px!important;color:var(--audit-muted)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-management{border:1px solid var(--audit-border)!important;border-radius:16px!important;background:var(--audit-surface)!important;padding:20px!important;min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-management-heading{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:16px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-management-heading h2{margin:0!important;font-size:15px!important;font-weight:650!important;color:var(--audit-text)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-management-heading>span{font-size:11px!important;color:var(--audit-muted)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-filters{padding:0!important;margin:0 0 16px!important;border:0!important;background:transparent!important;box-shadow:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table-card{border:1px solid var(--audit-border)!important;border-radius:16px!important;overflow:hidden!important;box-shadow:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table-wrap{min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table{width:100%!important;min-width:0!important;table-layout:fixed!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-col-action{width:24%!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-col-person{width:23%!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-col-date{width:20%!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-col-view{width:10%!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table th{padding:11px 14px!important;font-size:11px!important;font-weight:500!important;color:var(--audit-muted)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td{padding:12px 14px!important;font-size:12px!important;vertical-align:middle!important;height:auto!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-event{gap:8px!important;min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-event strong{font-size:11px!important;line-height:1.5!important;overflow-wrap:anywhere!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-person{gap:8px!important;min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-person>span:last-child{font-size:12px!important;overflow-wrap:anywhere!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-avatar{width:32px!important;height:32px!important;min-width:32px!important;flex:0 0 32px!important;border-radius:50%!important;font-size:10px!important;aspect-ratio:1!important}
html body :is(#audit-refined,[data-audit-refined]) [data-admin-view]{color:var(--audit-text)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important}
html body :is(#audit-refined,[data-audit-refined]) [data-admin-view] svg{color:var(--audit-brand)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-button{border-radius:13px!important;box-shadow:none!important;transform:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-pagination{padding:14px 16px!important;gap:12px!important;border-top:1px solid var(--audit-border)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-pagination nav{display:flex!important;align-items:center!important;gap:6px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-scope{margin:12px 0 0!important;text-align:center!important;font-size:10px!important;color:var(--audit-muted)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog{position:fixed!important;inset:0!important;margin:auto!important;width:calc(100% - 32px)!important;max-width:640px!important;height:fit-content!important;max-height:calc(100dvh - 32px)!important;padding:24px!important;border:1px solid var(--audit-border)!important;border-radius:18px!important;overflow:auto!important;transform:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog-heading{padding:0 0 18px!important;margin:0!important;border-bottom:1px solid var(--audit-border)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog-heading h2{font-size:20px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog-body{padding:18px 0!important;min-height:0!important;max-height:none!important;overflow:visible!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-summary{padding:0 0 16px!important;border:0!important;border-radius:0!important;background:transparent!important;gap:10px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-summary h3{font-size:14px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-summary p{font-size:11px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-people{gap:12px!important;padding:16px 0!important;margin:0!important;border-top:1px solid var(--audit-border)!important;border-bottom:1px solid var(--audit-border)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-people>div{padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-people dd{overflow-wrap:anywhere!important;font-size:12px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-changes{margin-top:18px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-changes>h3{font-size:13px!important;margin-bottom:12px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog>footer{margin:0!important;padding:16px 0 0!important;border-top:1px solid var(--audit-border)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-button:not(:disabled):hover{background:color-mix(in srgb,var(--audit-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--audit-brand) 40%,transparent)!important;box-shadow:none!important;transform:none!important}
@media(max-width:767px){html body :is(#audit-refined,[data-audit-refined]) .audit-hero{min-height:150px!important;padding:20px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-banner-title{font-size:25px!important;white-space:normal!important;max-width:100%!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat{padding:4px 10px!important;flex-direction:column!important;align-items:flex-start!important;gap:7px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat strong{font-size:21px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-stat p{font-size:10px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-management{padding:14px!important;border-radius:13px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-management-heading{flex-wrap:wrap!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-toolbar{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-toolbar>div{width:100%!important;min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table{display:block!important;min-width:0!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table thead{display:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table colgroup{display:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table tbody{display:grid!important;gap:12px!important;padding:14px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table tbody tr{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:12px!important;height:auto!important;min-height:0!important;max-height:none!important;padding:14px!important;margin:0!important;border:1px solid var(--audit-border)!important;border-radius:13px!important;grid-template-rows:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table tbody td{display:block!important;position:static!important;inset:auto!important;transform:none!important;width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;grid-column:auto!important;grid-row:auto!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td[data-label="Administrador"]::before{content:"Administrador"!important;display:block!important;font-size:10px!important;color:var(--audit-muted)!important;margin-bottom:5px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td[data-label="Usuário"]::before{content:"Usuário"!important;display:block!important;font-size:10px!important;color:var(--audit-muted)!important;margin-bottom:5px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td[data-label="Ação"]::before{display:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td[data-label="Data e hora"]::before{display:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td[data-label="Ações"]::before{display:none!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td[data-label="Data e hora"]{display:flex!important;align-items:center!important;gap:7px!important;font-size:11px!important;color:var(--audit-muted)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-table td:last-child button{width:100%!important;min-height:44px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-pagination{display:flex!important;flex-direction:column!important;align-items:center!important;text-align:center!important;padding:14px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog{width:calc(100% - 24px)!important;max-height:calc(100dvh - 24px)!important;padding:18px!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-detail-people{grid-template-columns:minmax(0,1fr)!important}
html body :is(#audit-refined,[data-audit-refined]) .audit-dialog>footer button{min-height:44px!important}}
html body :is(#audit-refined,[data-audit-refined]) .audit-select-trigger{height:44px!important;color:var(--audit-text)!important;font-size:12px!important;}
html body :is(#audit-refined,[data-audit-refined]) .audit-search input{height:44px!important;}
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
      <span><span className={fieldLabel === 'Período' ? 'audit-period-prefix' : undefined}>{fieldLabel}: </span><strong>{options[selected].label}</strong></span>
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
