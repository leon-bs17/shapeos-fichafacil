 'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Shield, ShieldCheck, Info, Download, Search, Users, UserRound, Link2, Dumbbell, Settings2, ChevronLeft, ChevronRight, ChevronsUpDown, CircleCheck, Clock3, ShieldX, GraduationCap, ChevronDown, Check, X, type LucideIcon } from 'lucide-react'
type User = { id: string; nome: string; email: string; tipo: string; status_conta: string }
type Workout = { id: string; titulo: string; aluno_id: string; personal_id: string; ativo: boolean }
type Bond = { id: string; aluno_id: string; personal_id: string; status: string }
const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40'


type FilterOption = { value: string; label: string; icon: LucideIcon }
const profileOptions: FilterOption[] = [
 { value: '', label: 'Todos os perfis', icon: Users },
 { value: 'ADMIN', label: 'Admin', icon: Shield },
 { value: 'ALUNO', label: 'Aluno', icon: GraduationCap },
 { value: 'PERSONAL', label: 'Personal', icon: UserRound },
]
const statusOptions: FilterOption[] = [
 { value: '', label: 'Todos os status', icon: Users },
 { value: 'ATIVO', label: 'Ativo', icon: CircleCheck },
 { value: 'PENDENTE', label: 'Pendente', icon: Clock3 },
 { value: 'BLOQUEADO', label: 'Bloqueado', icon: ShieldX },
]
function ControlFilter({ label, value, options, onChange, editing = false, disabled = false }: {
 label: string; value: string; options: FilterOption[]; onChange: (value: string) => void; editing?: boolean; disabled?: boolean
}) {
 const id = useId()
 const root = useRef<HTMLDivElement>(null)
 const trigger = useRef<HTMLButtonElement>(null)
 const list = useRef<HTMLDivElement>(null)
 const [expanded, setExpanded] = useState(false)
 const [active, setActive] = useState(0)
 const [menuLayout, setMenuLayout] = useState({ above: false, maxHeight: 240 })
 const selected = Math.max(0, options.findIndex(option => option.value === value))
 const SelectedIcon = options[selected].icon
 useEffect(() => {
  if (!expanded) return
  if (disabled) { setExpanded(false); return }
  const positionMenu = () => {
   const bounds = trigger.current?.getBoundingClientRect()
   if (!bounds) return
   const viewport = window.visualViewport
   const top = viewport?.offsetTop ?? 0
   const bottom = top + (viewport?.height ?? window.innerHeight)
   const dialog = root.current?.closest('dialog')?.getBoundingClientRect()
   const availableAbove = bounds.top - Math.max(top, dialog?.top ?? top) - 12
   const availableBelow = Math.min(bottom, dialog?.bottom ?? bottom) - bounds.bottom - 12
   const needed = Math.min(240, options.length * 44 + 10)
   const above = availableBelow < needed && availableAbove > availableBelow
   setMenuLayout({ above, maxHeight: Math.max(44, Math.min(240, above ? availableAbove : availableBelow)) })
  }
  positionMenu()
  list.current?.focus({ preventScroll: true })
  window.addEventListener('resize', positionMenu)
  window.visualViewport?.addEventListener('resize', positionMenu)
  const closeOutside = (event: PointerEvent) => {
   if (!root.current?.contains(event.target as Node)) setExpanded(false)
  }
  document.addEventListener('pointerdown', closeOutside)
  return () => {
   document.removeEventListener('pointerdown', closeOutside)
   window.removeEventListener('resize', positionMenu)
   window.visualViewport?.removeEventListener('resize', positionMenu)
  }
 }, [expanded, disabled, options.length])
 useEffect(() => {
  if (expanded) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' })
 }, [active, expanded, id])
 const show = (index = selected) => { setActive(index); setExpanded(true) }
 const choose = (index: number) => { onChange(options[index].value); setExpanded(false); trigger.current?.focus() }
 return <div ref={root} className={`control-filter${editing ? ' control-filter-edit' : ''}`}>
  <span className="control-filter-label">{label}</span>
  <div className="control-filter-field">
   <button ref={trigger} type="button" className="control-filter-trigger" disabled={disabled} aria-label={`${editing ? 'Alterar' : 'Filtrar por'} ${label.toLowerCase()}`}
    aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? id : undefined}
    onClick={() => expanded ? setExpanded(false) : show()}
    onKeyDown={event => {
     if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show() }
    }}>
    <SelectedIcon size={17} aria-hidden="true"/><span>{options[selected].label}</span><ChevronDown size={16} aria-hidden="true"/>
   </button>
   {expanded && <div ref={list} id={id} className="control-filter-menu" data-above={menuLayout.above} style={{ maxHeight: menuLayout.maxHeight }} role="listbox" tabIndex={-1}
    aria-label={label} aria-activedescendant={`${id}-${active}`}
    onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node)) setExpanded(false) }}
    onKeyDown={event => {
     if (['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)) event.preventDefault()
     if (event.key === 'ArrowDown') setActive(index => (index + 1) % options.length)
     if (event.key === 'ArrowUp') setActive(index => (index - 1 + options.length) % options.length)
     if (event.key === 'Home') setActive(0)
     if (event.key === 'End') setActive(options.length - 1)
     if (event.key === 'Enter' || event.key === ' ') choose(active)
     if (event.key === 'Escape') { event.stopPropagation(); setExpanded(false); trigger.current?.focus() }
     if (event.key.length === 1 && event.key !== ' ') {
      const next = options.findIndex(option => option.label.toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR')))
      if (next >= 0) setActive(next)
     }
    }}>
    {options.map(({value: optionValue, label: optionLabel, icon: Icon}, index) =>
     <div key={optionValue} id={`${id}-${index}`} role="option" aria-selected={optionValue === value}
      data-active={active === index} className="control-filter-option"
      onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
      <Icon size={17} aria-hidden="true"/><span>{optionLabel}</span>{optionValue === value && <Check size={17} aria-hidden="true"/>}
     </div>)}
   </div>}
  </div>
 </div>
}

const globePoint = (latitude: number, longitude: number) => {
 const radius = 77
 const x = radius * Math.cos(latitude) * Math.cos(longitude)
 const y = radius * Math.sin(latitude)
 const z = radius * Math.cos(latitude) * Math.sin(longitude)
 const tilt = 0.35
 const yy = y * Math.cos(tilt) - z * Math.sin(tilt)
 const zz = y * Math.sin(tilt) + z * Math.cos(tilt)
 const spin = -0.32
 return { x: 160 + x * Math.cos(spin) - yy * Math.sin(spin), y: 105 + x * Math.sin(spin) + yy * Math.cos(spin), z: zz }
}
const globeLines = [
 ...Array.from({ length: 9 }, (_, i) => {
  const lat = (i - 4) * Math.PI / 11
  return Array.from({ length: 97 }, (_, n) => globePoint(lat, n * Math.PI / 48))
 }),
 ...Array.from({ length: 14 }, (_, i) =>
  Array.from({ length: 65 }, (_, n) => globePoint(-Math.PI / 2 + n * Math.PI / 64, i * Math.PI / 7))
 ),
].map(points => {
 const front: string[] = [], back: string[] = []
 points.slice(1).forEach((point, n) => {
  const segment = `M ${points[n].x.toFixed(2)} ${points[n].y.toFixed(2)} L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  ;((point.z + points[n].z) / 2 > 0 ? front : back).push(segment)
 })
 return { front: front.join(' '), back: back.join(' ') }
})
function ControlGlobe() {
 return <svg viewBox="0 0 320 210" fill="none" aria-hidden="true" focusable="false" className="control-globe">
  <circle cx="160" cy="105" r="77" stroke="currentColor" strokeWidth="0.8" opacity="0.65"/>
  {globeLines.map((line, i) => <g key={i} stroke="currentColor" strokeWidth="0.65"><path d={line.back} opacity="0.16"/><path d={line.front} opacity="0.68"/></g>)}
  <ellipse cx="160" cy="105" rx="139" ry="39" transform="rotate(-19 160 105)" stroke="currentColor" strokeWidth="1.1"/>
  <ellipse cx="160" cy="105" rx="113" ry="51" transform="rotate(42 160 105)" stroke="currentColor" strokeWidth="0.8" opacity="0.7"/>
  <ellipse cx="160" cy="105" rx="152" ry="52" transform="rotate(-19 160 105)" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 5" opacity="0.35"/>
  {[[29,143],[291,67],[223,151],[97,56]].map(([x,y],i) => <g key={i}><circle cx={x} cy={y} r="6" fill="currentColor" opacity="0.12"/><circle cx={x} cy={y} r="2" fill="currentColor"/></g>)}
 </svg>
}

export default function ControlPage() {
 const cache = useQueryClient()

 // Cancel color interpolation before the browser paints a newly applied theme.
 useEffect(() => {
  const html = document.documentElement
  const theme = () => html.classList.contains('dark') ? 'dark' : 'light'
  let previousTheme = theme()
  let frame = 0
  let suppression: HTMLStyleElement | null = null
  const restore = () => { suppression?.remove(); suppression = null }
  const observer = new MutationObserver(() => {
   const nextTheme = theme()
   if (nextTheme === previousTheme) return
   previousTheme = nextTheme
   cancelAnimationFrame(frame)
   restore()
   suppression = document.createElement('style')
   suppression.textContent = '.control-center.control-center.control-center.control-center.control-center.control-center.control-center.control-center :is(#control-manage-name, *) { transition: none !important; }'
   document.head.appendChild(suppression)
   // Flush the final palette while transitions are suppressed.
   const control = document.querySelector('.control-center')
   if (control) window.getComputedStyle(control).backgroundColor
   frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(restore)
   })
  })
  observer.observe(html, { attributes: true, attributeFilter: ['class'] })
  return () => { observer.disconnect(); cancelAnimationFrame(frame); restore() }
 }, [])

 const [tab, setTab] = useState('Contas')
 const [search, setSearch] = useState('')
 const [profileFilter, setProfileFilter] = useState('')
 const [statusFilter, setStatusFilter] = useState('')
 const [page, setPage] = useState(1)
 const [checkedIds, setCheckedIds] = useState<string[]>([])
 const [sortKey, setSortKey] = useState<'nome' | 'tipo'>('nome')
 const [sortAsc, setSortAsc] = useState(true)
 const [selected, setSelected] = useState<User | null>(null)
 const manageDialog = useRef<HTMLDialogElement>(null)
 const [busy, setBusy] = useState(false)
 const [feedback, setFeedback] = useState('')
 const [aluno, setAluno] = useState('')
 const [personal, setPersonal] = useState('')
 const [workout, setWorkout] = useState<Workout | null>(null)
 const [open, setOpen] = useState(true)
 const [message, setMessage] = useState('')
 const configNoteRef = useRef<HTMLTextAreaElement>(null)
 useEffect(() => {
  if (tab !== 'Configurações') return
  const field = configNoteRef.current
  if (!field) return
  const resize = () => { field.style.height = 'auto'; field.style.height = `${Math.max(130, field.scrollHeight + 2)}px` }
  resize()
  const observer = new ResizeObserver(() => {
   const width = field.getBoundingClientRect().width
   if (width === previousWidth) return
   previousWidth = width
   resize()
  })
  let previousWidth = field.getBoundingClientRect().width
  observer.observe(field)
  return () => observer.disconnect()
 }, [message, tab])
 const { data, error, isLoading } = useQuery({ queryKey: ['admin-control'], queryFn: async () => {
   const db = createClient()
   const [users, bonds, workouts, config] = await Promise.all([
    db.from('usuarios').select('id,nome,email,tipo,status_conta').order('nome'),
    db.from('personal_alunos').select('id,aluno_id,personal_id,status'),
    db.from('treinos').select('id,titulo,aluno_id,personal_id,ativo').order('criado_em', { ascending: false }),
    db.from('admin_configuracao').select('*').single(),
   ])
   if (users.error || bonds.error || workouts.error) throw new Error(users.error?.message || bonds.error?.message || workouts.error?.message)
   return { users: users.data as User[], bonds: bonds.data as Bond[], workouts: workouts.data as Workout[], config: config.data, ready: !config.error, configError: config.error?.message }
 } })
 useEffect(() => {
  if (!selected) return
  const dialog = manageDialog.current
  const previousFocus = document.activeElement as HTMLElement | null
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  if (dialog && !dialog.open) dialog.showModal()
  return () => {
   dialog?.close()
   document.body.style.overflow = previousOverflow
   if (previousFocus?.isConnected) previousFocus.focus()
  }
 }, [selected?.id])
 const name = (id: string) => data?.users.find(u => u.id === id)?.nome ?? id
 async function act(acao: string, id: string | null, dados: object) {
  setBusy(true); setFeedback('')
  try {
   const res = await fetch('/api/admin/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao, id, dados }) })
   const result = await res.json()
   if (!res.ok) throw new Error(result.error)
   setFeedback('Alteração salva e registrada na auditoria.'); setSelected(null); setWorkout(null)
   await cache.invalidateQueries({ queryKey: ['admin-control'] })
   await cache.invalidateQueries({ queryKey: ['admin-auditoria'] })
  } catch (e) { setFeedback(e instanceof Error ? e.message : 'Falha ao salvar') } finally { setBusy(false) }
 }
 function exportData(ids?: string[]) {
  if (!data) return
  const blob = new Blob([JSON.stringify({ exportado_em: new Date().toISOString(), usuarios: ids ? data.users.filter(u => ids.includes(u.id)) : data.users, vinculos: ids ? data.bonds.filter(v => ids.includes(v.aluno_id) || ids.includes(v.personal_id)) : data.bonds, treinos: ids ? data.workouts.filter(t => ids.includes(t.aluno_id) || ids.includes(t.personal_id)) : data.workouts }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'shapeos-administracao.json'; anchor.click(); URL.revokeObjectURL(url)
 }
 const personals = data?.users.filter(u => u.tipo === 'PERSONAL' && u.status_conta === 'ATIVO') ?? []
 const activeBondCount = data?.bonds.filter(v => v.status === 'ATIVO').length ?? 0
 const visibleBonds = data?.bonds.filter(v => `${name(v.aluno_id)} ${name(v.personal_id)}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) ?? []
 const visibleWorkouts = data?.workouts.filter(t => `${t.titulo} ${name(t.aluno_id)} ${name(t.personal_id)}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) ?? []
 const filteredUsers = data?.users.filter(u => `${u.nome} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()) && (!profileFilter || u.tipo === profileFilter) && (!statusFilter || u.status_conta === statusFilter)).slice().sort((a, b) => (sortAsc ? 1 : -1) * a[sortKey].localeCompare(b[sortKey], 'pt-BR')) ?? []
 const pageSize = 4
 const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
 const currentPage = Math.min(page, pageCount)
 const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
 const initials = (nome: string) => nome.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?'
 const metrics = [
  { label: 'Contas', value: data?.users.length, icon: Users },
  { label: 'Personais', value: data ? personals.length : undefined, icon: UserRound },
  { label: 'Vínculos ativos', value: data?.bonds.filter(v => v.status === 'ATIVO').length, icon: Link2 },
  { label: 'Treinos ativos', value: data?.workouts.filter(t => t.ativo).length, icon: Dumbbell },
 ]
 function sortAccounts(key: 'nome' | 'tipo') { setSortAsc(sortKey === key ? !sortAsc : true); setSortKey(key); setPage(1) }
 const toggleChecked = (id: string) => setCheckedIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id])
 const allVisibleChecked = visibleUsers.length > 0 && visibleUsers.every(u => checkedIds.includes(u.id))
 return <div className="control-center min-w-0 space-y-6">
  <header className="control-heading"><div className="control-heading-copy"><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-primary"><Shield size={15}/> Administração global</p><h1 className="control-title font-semibold tracking-tight">Central de <span className="control-title-accent">controle</span></h1><p className="mt-2 text-sm text-muted-foreground">Contas, relações e treinos. Cada mudança fica registrada.</p></div><div className="control-heading-art"><ControlGlobe/></div></header><div className="control-export-row"><button className={`${button} control-export`} disabled={!data} onClick={() => exportData()}><Download className="mr-2 inline" size={16}/>Exportar dados carregados</button></div>
  {isLoading && <p role="status">Carregando a plataforma…</p>}
  {error && <p role="alert" className="rounded-xl border border-destructive p-4">{error.message}</p>}
  {data && !data.ready && <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm"><strong>Configuração do banco necessária.</strong><p className="mt-1">Os controles aguardam a migração 0013_admin_control_center.sql no Supabase. As consultas continuam disponíveis.</p><p className="mt-1 text-muted-foreground">{data.configError}</p></div>}
  {feedback && <p role="status" className="rounded-xl border border-primary/40 p-4 text-sm">{feedback}</p>}
  <div className="control-metrics grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(({label, value, icon: Icon}) => <div key={label} className="control-metric flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card/60 p-4 sm:gap-4 sm:p-5"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={27} strokeWidth={1.6}/></span><div className="min-w-0"><p className="text-xs text-muted-foreground sm:text-sm">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? '—'}</p></div></div>)}</div>
  <nav className="control-tabs flex gap-1 overflow-x-auto border-b border-border" aria-label="Módulos da central">{['Contas', 'Vínculos', 'Treinos', 'Configurações'].map(t => <button key={t} className={`shrink-0 border-b-2 px-4 py-3 text-sm transition-colors sm:px-6 ${tab === t ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`} aria-pressed={tab === t} onClick={() => { setTab(t); setSearch(''); setPage(1); if (t === 'Configurações' && data?.config) { setOpen(data.config.cadastro_aberto); setMessage(data.config.mensagem_publica ?? '') } }}>{t}</button>)}</nav>
  {tab !== 'Configurações' && <div className="control-toolbar flex flex-col gap-3 lg:flex-row lg:items-center">
   <label data-admin-search className="relative min-w-0 flex-1"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input className={`${input} min-h-11 pl-10`} aria-label="Buscar registros" placeholder={tab === 'Vínculos' ? 'Buscar aluno ou personal' : tab === 'Treinos' ? 'Buscar treino, aluno ou personal' : 'Buscar por nome, e-mail ou título'} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label>
   {tab === 'Contas' && <div className="control-filter-group grid grid-cols-2 gap-3 lg:w-auto">
    <ControlFilter label="Perfil" value={profileFilter} options={profileOptions} onChange={value => { setProfileFilter(value); setPage(1) }}/>
    <ControlFilter label="Status" value={statusFilter} options={statusOptions} onChange={value => { setStatusFilter(value); setPage(1) }}/>
   </div>}
  </div>}
  {tab === 'Contas' && <section aria-label="Contas da plataforma" className="space-y-4">
   {checkedIds.length > 0 && <div className="control-selection-bar flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2 text-sm"><span>{checkedIds.length} conta(s) selecionada(s)</span><div className="control-selection-buttons flex gap-2"><button className={`${button} control-selection-action`} onClick={() => exportData(checkedIds)}>Exportar seleção</button><button className={`${button} control-selection-action`} onClick={() => setCheckedIds([])}>Limpar seleção</button></div></div>}
   <div className="account-table overflow-hidden rounded-xl border border-border bg-card/30"><table className="w-full text-left text-sm"><colgroup><col className="control-col-selection"/><col className="control-col-user"/><col className="control-col-email"/><col className="control-col-profile"/><col className="control-col-status"/><col className="control-col-action"/></colgroup><thead className="bg-card text-xs text-muted-foreground"><tr><th scope="col" className="selection-cell w-14 px-5 py-4"><input type="checkbox" aria-label="Selecionar contas desta página" checked={allVisibleChecked} onChange={() => setCheckedIds(ids => allVisibleChecked ? ids.filter(id => !visibleUsers.some(u => u.id === id)) : [...new Set([...ids, ...visibleUsers.map(u => u.id)])])}/></th><th scope="col" aria-sort={sortKey === 'nome' ? sortAsc ? 'ascending' : 'descending' : 'none'} className="px-5 py-4 font-medium"><button className="inline-flex items-center gap-2" onClick={() => sortAccounts('nome')}>Usuário<ChevronsUpDown size={13}/></button></th><th scope="col" className="email-heading px-5 py-4 font-medium">E-mail</th><th scope="col" className="px-5 py-4 font-medium"><button className="inline-flex items-center gap-2" onClick={() => sortAccounts('tipo')}>Perfil<ChevronsUpDown size={13}/></button></th><th scope="col" className="px-5 py-4 font-medium">Status</th><th scope="col" className="px-5 py-4 font-medium">Controle</th></tr></thead><tbody>{visibleUsers.map(u => <tr key={u.id} className="border-t border-border">
    <td className="selection-cell px-5 py-4"><input type="checkbox" aria-label={`Selecionar ${u.nome}`} checked={checkedIds.includes(u.id)} onChange={() => toggleChecked(u.id)}/></td><td className="user-cell px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className={`avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${u.tipo === 'ADMIN' ? 'bg-primary/15 text-primary' : u.tipo === 'ALUNO' ? 'bg-info/15 text-info' : 'personal-avatar'}`}>{initials(u.nome)}</span><div className="min-w-0"><p className="font-medium" title={u.nome}>{u.nome}</p></div></div></td>
    <td className="email-cell px-5 py-4" title={u.email}>{u.email}</td>
    <td className="profile-cell px-5 py-4"><span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold ${u.tipo === 'ADMIN' ? 'border-primary/25 bg-primary/10 text-primary' : u.tipo === 'ALUNO' ? 'border-info/25 bg-info/10 text-info' : 'personal-badge'}`}>{u.tipo}</span></td>
    <td className="status-cell px-5 py-4"><span data-account-status={u.status_conta} className="account-status">{u.status_conta === 'ATIVO' ? <CircleCheck size={15} aria-hidden="true"/> : u.status_conta === 'PENDENTE' ? <Clock3 size={15} aria-hidden="true"/> : <ShieldX size={15} aria-hidden="true"/>}{u.status_conta === 'ATIVO' ? 'Ativo' : u.status_conta === 'PENDENTE' ? 'Pendente' : u.status_conta === 'BLOQUEADO' ? 'Bloqueado' : u.status_conta}</span></td>
    <td className="action-cell px-5 py-4"><div className="flex items-center justify-between gap-3"><button className={`${button} control-manage-trigger`} aria-label={`Gerenciar ${u.nome}`} disabled={!data?.ready || busy} onClick={() => { setFeedback(''); setSelected({...u}) }}><Settings2 size={17}/>Gerenciar</button></div></td>
   </tr>)}</tbody></table>
   {!isLoading && !error && filteredUsers.length === 0 && <div className="p-10 text-center"><Users size={28} className="mx-auto mb-3 text-muted-foreground"/><p className="font-medium">Nenhuma conta encontrada</p><p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou ajuste os filtros.</p>{(search || profileFilter || statusFilter) && <button className={`${button} mt-4`} onClick={() => { setSearch(''); setProfileFilter(''); setStatusFilter(''); setPage(1) }}>Limpar filtros</button>}</div>}
   <footer className="account-pagination flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p aria-live="polite">{filteredUsers.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredUsers.length)} de ${filteredUsers.length} contas` : '0 contas'}</p><nav aria-label="Paginação de contas" className="flex items-center gap-2"><button className={`${button} !px-3`} aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button>{Array.from({length: pageCount}, (_, i) => i + 1).filter(n => n === 1 || n === pageCount || Math.abs(n - currentPage) <= 1).map((n, i, pages) => <span key={n} className="flex items-center gap-2">{i > 0 && n - pages[i - 1] > 1 && <span>…</span>}<button aria-label={`Página ${n}`} aria-current={currentPage === n ? 'page' : undefined} className={`${button} !px-3 ${currentPage === n ? '!border-primary bg-primary/10 text-primary' : ''}`} onClick={() => setPage(n)}>{n}</button></span>)}<button className={`${button} !px-3`} aria-label="Próxima página" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></nav></footer>
   </div>
  </section>}
  {selected && tab === 'Contas' && <dialog ref={manageDialog} className="control-manage-dialog" aria-labelledby="control-manage-title"
   onCancel={event => { event.preventDefault(); if (!busy) setSelected(null) }}
   onClick={event => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.target === event.currentTarget && !busy && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) setSelected(null)
   }}>
   <div className="control-manage-header">
    <span className="control-manage-avatar" aria-hidden="true">{initials(selected.nome)}</span>
    <div className="control-manage-identity"><h2 id="control-manage-title">Gerenciar conta</h2><p>{selected.email}</p></div>
    <button type="button" className="control-manage-close" aria-label="Fechar gerenciamento" disabled={busy} onClick={() => setSelected(null)}><X size={18} aria-hidden="true"/></button>
   </div>
   <form onSubmit={e => { e.preventDefault(); void act('EDITAR_USUARIO', selected.id, selected) }}>
    <fieldset className="control-manage-fields" disabled={busy}>
     <legend className="sr-only">Dados da conta</legend>
     <label htmlFor="control-manage-name">Nome<input autoFocus id="control-manage-name" required minLength={2} maxLength={120} className={input} value={selected.nome} onChange={e => setSelected({...selected, nome:e.target.value})}/></label>
     <div className="control-manage-grid">
      <ControlFilter editing disabled={busy} label="Perfil" value={selected.tipo} options={profileOptions.filter(option => option.value !== '')} onChange={value => setSelected({...selected, tipo:value})}/>
      <ControlFilter editing disabled={busy} label="Status" value={selected.status_conta} options={statusOptions.filter(option => option.value !== '')} onChange={value => setSelected({...selected, status_conta:value})}/>
     </div>
    </fieldset>
    <p className="control-manage-note"><Shield size={16} aria-hidden="true"/><span>Promover a ADMIN concede acesso global. O servidor impede remover seu próprio acesso e alterar perfis com relações existentes.</span></p>
    {feedback && <p role="status" className="control-manage-feedback">{feedback}</p>}
    <footer className="control-manage-footer">
     <button type="button" className={button} disabled={busy} onClick={() => exportData([selected.id])}><Download size={16} aria-hidden="true"/>Exportar conta</button>
     <div><button type="button" className={button} disabled={busy} onClick={() => setSelected(null)}>Cancelar</button><button type="submit" disabled={busy} className={`${button} control-manage-save`}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </footer>
   </form>
  </dialog>}

  {tab === 'Vínculos' && <div className="control-bonds">
   <section className="control-bond-create" aria-labelledby="control-bond-create-title">
    <h2 id="control-bond-create-title">Criar vínculo</h2><p>Selecione o aluno e o personal responsável.</p>
    <form onSubmit={e => { e.preventDefault(); if(aluno && personal)void act('VINCULAR', aluno, {personal_id:personal}) }}>
     <ControlFilter label="Aluno" value={aluno} editing disabled={!data?.ready || busy} options={[{value:'',label:'Escolha o aluno',icon:GraduationCap},...(data?.users.filter(u => u.tipo === 'ALUNO' && u.status_conta === 'ATIVO') ?? []).map(u => ({value:u.id,label:u.nome,icon:GraduationCap}))]} onChange={setAluno}/>
     <ControlFilter label="Personal" value={personal} editing disabled={!data?.ready || busy} options={[{value:'',label:'Escolha o personal',icon:UserRound},...personals.map(u => ({value:u.id,label:u.nome,icon:UserRound}))]} onChange={setPersonal}/>
     <button className="control-bond-create-action" disabled={!data?.ready || busy || !aluno || !personal}>Criar / reativar vínculo</button>
    </form>
   </section>
   <section className="control-bond-list" aria-labelledby="control-bond-list-title">
    <header><h2 id="control-bond-list-title">Vínculos cadastrados</h2><p>{data ? `${activeBondCount} ${activeBondCount === 1 ? 'vínculo ativo' : 'vínculos ativos'}` : 'Carregando vínculos…'}</p></header>
    <table><colgroup><col/><col/><col/><col/></colgroup><thead><tr><th scope="col">Aluno</th><th scope="col">Personal responsável</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead><tbody>
     {visibleBonds.map(v => <tr key={v.id}>
      <td data-bond-person="aluno"><div className="control-bond-person"><span className="control-bond-avatar" aria-hidden="true">{initials(name(v.aluno_id))}</span><span><small>Aluno</small>{name(v.aluno_id)}</span></div></td>
      <td data-bond-person="personal"><div className="control-bond-person"><span className="control-bond-avatar" aria-hidden="true">{initials(name(v.personal_id))}</span><span><small>Personal responsável</small>{name(v.personal_id)}</span></div></td>
      <td className="control-bond-status"><span className="account-status" data-account-status={v.status === 'ATIVO' ? 'ATIVO' : 'INATIVO'}>{v.status === 'ATIVO' ? <CircleCheck size={15} aria-hidden="true"/> : <ShieldX size={15} aria-hidden="true"/>}{v.status === 'ATIVO' ? 'Ativo' : v.status === 'INATIVO' ? 'Inativo' : v.status}</span></td>
      <td className="control-bond-action"><button aria-label={`Desativar vínculo de ${name(v.aluno_id)} com ${name(v.personal_id)}`} disabled={!data?.ready || busy || v.status !== 'ATIVO'} onClick={() => void act('DESATIVAR_VINCULO',v.id,{})}>Desativar vínculo</button></td>
     </tr>)}
    </tbody></table>
    {!isLoading && !error && !visibleBonds.length && <div className="control-bond-empty"><Link2 size={26} aria-hidden="true"/><p>{search.trim() ? 'Nenhum vínculo encontrado para esta busca.' : 'Nenhum vínculo cadastrado.'}</p></div>}
   </section>
  </div>}
  {tab === 'Treinos' && <div className="control-bonds control-workouts">
   <section className="control-bond-list" aria-labelledby="control-workout-list-title">
    <header><h2 id="control-workout-list-title">Treinos cadastrados</h2><p>{data ? `${data.workouts.filter(t => t.ativo).length} treino(s) ativo(s)` : 'Carregando treinos…'}</p></header>
    <table aria-label="Treinos cadastrados"><colgroup><col/><col/><col/><col/><col/></colgroup>
     <thead><tr><th scope="col">Treino</th><th scope="col">Aluno</th><th scope="col">Personal responsável</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead>
     <tbody>{visibleWorkouts.map(t => <tr key={t.id}>
      <td><div className="control-bond-person"><span className="control-workout-icon" aria-hidden="true"><Dumbbell size={18} strokeWidth={1.75}/></span><span><small>Treino</small>{t.titulo}</span></div></td>
      <td><div className="control-bond-person"><span className="control-bond-avatar" aria-hidden="true">{initials(name(t.aluno_id))}</span><span><small>Aluno</small>{name(t.aluno_id)}</span></div></td>
      <td><div className="control-bond-person"><span className="control-bond-avatar" aria-hidden="true">{initials(name(t.personal_id))}</span><span><small>Personal responsável</small>{name(t.personal_id)}</span></div></td>
      <td className="control-bond-status"><span className="account-status" data-account-status={t.ativo ? 'ATIVO' : 'INATIVO'}>{t.ativo ? <CircleCheck size={15} aria-hidden="true"/> : <ShieldX size={15} aria-hidden="true"/>}{t.ativo ? 'Ativo' : 'Arquivado'}</span></td>
      <td className="control-bond-action"><button className="control-workout-action" disabled={!data?.ready || busy} onClick={() => setWorkout({...t})} aria-label={`Editar ou transferir ${t.titulo}`}><Settings2 size={15} aria-hidden="true"/>Editar / transferir</button></td>
     </tr>)}</tbody>
    </table>
    {!isLoading && !error && !visibleWorkouts.length && <div className="control-bond-empty"><Dumbbell size={26} aria-hidden="true"/><p>{search.trim() ? 'Nenhum treino encontrado para esta busca.' : 'Nenhum treino cadastrado.'}</p></div>}
   </section>
   {workout && <form className="control-workout-editor" aria-labelledby="control-workout-editor-title" aria-busy={busy} onSubmit={e => { e.preventDefault(); void act('EDITAR_TREINO',workout.id,workout) }}>
    <header className="workout-editor-heading"><span className="control-workout-icon" aria-hidden="true"><Dumbbell size={22} strokeWidth={1.75}/></span><div><h2 id="control-workout-editor-title">Editar / transferir treino</h2><p>Atualize o treino e escolha o personal responsável.</p></div><button type="button" className="workout-editor-close" aria-label="Fechar edição do treino" disabled={busy} onClick={() => setWorkout(null)}><X size={20}/></button></header>
    <div className="workout-editor-student"><span>Aluno</span><span className="control-bond-avatar" aria-hidden="true">{initials(name(workout.aluno_id))}</span><strong>{name(workout.aluno_id)}</strong></div>
    <div className="workout-editor-fields"><label>Título do treino<input required minLength={2} maxLength={150} disabled={busy} value={workout.titulo} onChange={e => setWorkout({...workout,titulo:e.target.value})}/></label>
     <ControlFilter label="Personal responsável" value={workout.personal_id} editing disabled={busy} options={[
      ...(!personals.some(u => u.id === workout.personal_id) ? [{value:workout.personal_id,label:name(workout.personal_id),icon:UserRound}] : []),
      ...personals.map(u => ({value:u.id,label:u.nome,icon:UserRound})),
     ]} onChange={value => setWorkout({...workout,personal_id:value})}/>
    </div>
    <div className="workout-editor-status"><div><strong>Status do treino</strong><p>{workout.ativo ? 'Disponível para o aluno.' : 'Treino arquivado.'}</p></div><label className="workout-editor-status-control"><input type="checkbox" role="switch" aria-label="Treino ativo" checked={workout.ativo} disabled={busy} onChange={e => setWorkout({...workout,ativo:e.target.checked})}/><span>{workout.ativo ? 'Ativo' : 'Arquivado'}</span></label></div>
    <p className="workout-editor-note"><Info size={18} aria-hidden="true"/><span>A transferência exige vínculo ativo com o aluno. Séries e histórico são preservados.</span></p>
    <footer className="workout-editor-footer"><button type="button" disabled={busy} onClick={() => setWorkout(null)}>Cancelar</button><button type="submit" disabled={busy} className="workout-editor-save">{busy ? 'Salvando…' : 'Salvar alterações'}</button></footer>
   </form>}</div>}
  {tab === 'Configurações' && <form className="control-config" aria-labelledby="control-config-title" aria-busy={busy} onSubmit={e => { e.preventDefault(); void act('CONFIGURAR',null,{cadastro_aberto:open,mensagem_publica:message}) }}>
   <header className="config-heading"><span className="config-icon" aria-hidden="true"><Users size={28} strokeWidth={1.75}/></span><div><h2 id="control-config-title">Controle de cadastros</h2><p>Defina se novos usuários podem criar uma conta.</p></div></header>
   <div className="config-registration"><div><label htmlFor="config-registration-switch">Permitir novas contas</label><p>Novos cadastros ficam disponíveis enquanto esta opção estiver ativa.</p></div><div className="config-state"><input id="config-registration-switch" type="checkbox" role="switch" checked={open} disabled={!data?.ready || busy} onChange={e => setOpen(e.target.checked)}/><span className="config-badge" data-open={open}>{open ? 'Cadastros abertos' : 'Cadastros bloqueados'}</span></div></div>
   <p className="config-notice"><ShieldCheck size={28} strokeWidth={1.75} aria-hidden="true"/><span>Ao desativar, novos cadastros serão bloqueados.<br/>As contas existentes continuam disponíveis.</span></p>
   <div className="config-note"><label htmlFor="config-admin-note">Nota administrativa</label><p id="config-note-help">Adicione uma observação sobre esta configuração.</p><textarea ref={configNoteRef} id="config-admin-note" aria-describedby="config-note-help config-note-count" maxLength={500} rows={4} placeholder="Escreva uma nota..." disabled={!data?.ready || busy} value={message} onChange={e => setMessage(e.target.value)}/><span id="config-note-count">{message.length}/500</span></div>
   <footer><button type="submit" disabled={!data?.ready || busy}><Check size={20} strokeWidth={1.75} aria-hidden="true"/>{busy ? 'Salvando…' : 'Salvar configuração'}</button></footer>
  </form>}
 <style jsx>{`

  .control-center { --primary: 172.12 79.19% 33.92%; --info: 200 90% 34%; --success: 163 87% 30%; }
  :global(.dark) .control-center { --background: 164 46% 5%; --card: 164 40% 8%; --foreground: 180 20% 96%; --muted-foreground: 182 21% 72%; --primary: 177 100% 50%; --border: 168 30% 17%; --info: 197 100% 57%; --success: 166 100% 49%; color: hsl(var(--foreground)); }
  :global(.dark [data-admin-route="/admin"]), :global(.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"])) { --shapeos-bg: #06120f; --shapeos-surface: #091814; --shapeos-brand: #00fff0; --shapeos-text: #f1f8f7; --shapeos-muted: #abcac9; --border: 168 30% 17%; background: radial-gradient(ellipse at 70% 12%, #0b2923 0%, transparent 45%), #06120f; }
  :global(.dark [data-admin-route="/admin"] .shapeos-navigation), :global(.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) .shapeos-navigation) { --shapeos-surface: #071511; --shapeos-brand: #00fff0; --shapeos-text: #f1f8f7; --shapeos-muted: #abcac9; }
  :global([data-admin-route="/admin"] .shapeos-navigation a[aria-current="page"]), :global(:is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) .shapeos-navigation a[aria-current="page"]) { color: var(--shapeos-brand) !important; border-color: hsl(var(--primary) / .28) !important; background: hsl(var(--primary) / .08) !important; }
  .control-heading { display: grid; grid-template-columns: minmax(0, 1fr) 240px; align-items: center; gap: 12px 16px; min-height: 130px; }
  .control-heading-copy { position: relative; z-index: 1; }
  .control-title { font-size: clamp(30px, 3vw, 48px); line-height: 1.15; }
  .control-heading-copy p:last-child { font-size: 15px; line-height: 1.65; }
  .control-heading-art { color: hsl(var(--primary)); pointer-events: none; width: 100%; justify-self: end; }
  .control-heading-art :global(svg) { display: block; width: 100%; height: auto; }
  :global(.dark) .control-heading-art :global(svg) { filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.4)); }
  .control-export { justify-self: start; }
  .control-metric { min-height: 100px; background: linear-gradient(110deg, hsl(var(--card)), hsl(var(--card) / .4)); }
  .control-tabs { padding-top: 0; }
  .control-toolbar input, .control-toolbar select { min-height: 48px; }
  .account-table { overflow: visible; }
  .account-table thead { height: 52px; }
  .account-table tr { height: 70px; }
  .account-table th:first-child { border-top-left-radius: 12px; }
  .account-table th:last-child { border-top-right-radius: 12px; }
  .account-table input[type="checkbox"] { width: 15px; height: 15px; accent-color: hsl(var(--primary)); cursor: pointer; }
  .personal-avatar { background: #ede9fe; color: #6d28d9; }
  .personal-badge { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
  :global(.dark) .personal-avatar { background: linear-gradient(140deg, #625194, #352651); color: #f3eaff; }
  :global(.dark) .personal-badge { background: #312907; color: #ffd327; border-color: #635311; }
  .account-menu summary::-webkit-details-marker { display: none; }
  @media (min-width: 1440px) { .control-heading { grid-template-columns: minmax(0, 1fr) 350px 280px; gap: 8px; } .control-heading-art { width: 390px; margin-top: -70px; margin-bottom: -28px; } .control-export { justify-self: end; align-self: start; margin-top: 8px; } }
  @media (min-width: 1280px) and (max-width: 1439px) { .control-heading { grid-template-columns: minmax(0, 1fr) 260px; } .control-heading-art { grid-row: 1 / 3; grid-column: 2; } }
  @media (max-width: 639px) { .control-heading { grid-template-columns: minmax(0, 1fr) 120px; gap: 4px 8px; } .control-heading-copy { grid-column: 1 / -1; } .control-heading-art { grid-column: 2; grid-row: 2; width: 120px; } .control-export { grid-column: 1; grid-row: 2; padding: 10px 12px; font-size: 12px; } .control-metric { gap: 8px; padding: 12px; min-height: 86px; } .control-metric > span { width: 36px; height: 36px; } }
  @media (max-width: 767px) {
   .account-table table, .account-table tbody { display: block; }
   .account-table thead { display: none; }
   .account-table tr { height: auto; display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 16px; }
   .account-table tr:first-child { border-top: 0; }
   .account-table td { display: block; padding: 0; min-width: 0; }
   .account-table .selection-cell { grid-column: 2; grid-row: 1; justify-self: end; } .account-table .user-cell { grid-column: 1; grid-row: 1; }
   .account-table .profile-cell { align-self: center; }
   .account-table .status-cell { justify-self: end; align-self: center; }
   .account-table .action-cell { grid-column: 1 / -1; }
   .account-table .action-cell button { width: 100%; }
  }
  @media (max-width: 380px) {
   .control-center .avatar { display: none; }
  }

  .control-heading { position:relative; isolation:isolate; display:flex!important; align-items:center; min-height:220px; padding:32px 40px; overflow:hidden; border:1px solid hsl(var(--border)); border-radius:18px; background:hsl(var(--card)); }
  :global(.dark) .control-heading { background:radial-gradient(ellipse at 80% 65%,#073a30,#071b17 48%,#041512); }
  .control-heading-copy { position:relative; z-index:2; max-width:68%; }
  .control-title { font-size:clamp(32px,3.4vw,48px); line-height:1.12; font-weight:750; }
  .control-title-accent { color:var(--shapeos-brand); }
  .control-heading-copy>p:first-child { font-size:11px; letter-spacing:.16em; margin-bottom:14px; }
  .control-heading-copy>p:last-child { font-size:15px; line-height:1.6; margin-top:13px; }
  .control-heading-art { position:absolute!important; width:390px!important; right:28px; top:50%; transform:translateY(-50%); margin:0!important; opacity:.7; pointer-events:none; }
  .control-heading { margin-bottom:0!important; }
  .control-export-row { display:flex; justify-content:flex-end; padding-top:0; border-top:0; margin-top:20px!important; }
  .control-export-row .control-export { margin:0!important; align-self:auto!important; }
  @media(max-width:1000px) { .control-heading-copy { max-width:85%; } .control-heading-art { right:-100px; opacity:.25; } }
  @media(max-width:639px) { .control-heading { padding:27px 22px; min-height:210px; } .control-heading-copy { max-width:100%; } .control-heading-art { width:290px!important; right:-150px; opacity:.15; } .control-title { font-size:32px; } .control-export-row .control-export { min-height:44px; font-size:12px; } }

  /* Match the Users table's light layout while preserving account controls. */
  :global(html:not(.dark)) .account-table {
    border:1px solid #d7ded3; border-radius:14px; background:#fcfdf9;
    box-shadow:none;
  }
  :global(html:not(.dark)) .account-table table { font-size:12px; background:#fcfdf9; }
  :global(html:not(.dark)) .account-table thead { height:auto; background:#fcfdf9; color:#5f6f68; }
  :global(html:not(.dark)) .account-table tr { height:auto; border-color:#d7ded3; }
  :global(html:not(.dark)) .account-table th { padding:15px 14px; font-size:11px; font-weight:500; color:#5f6f68; }
  :global(html:not(.dark)) .account-table th:first-child { border-top-left-radius:14px; }
  :global(html:not(.dark)) .account-table th:last-child { border-top-right-radius:14px; }
  :global(html:not(.dark)) .account-table td { padding:15px 14px; border-color:#d7ded3; }
  :global(html:not(.dark)) .account-table .avatar { width:36px; height:36px; font-weight:700; }
  :global(html:not(.dark)) .account-table .user-cell p:first-child { font-size:12px; font-weight:600; color:#162623; }
  :global(html:not(.dark)) .account-table .email-cell { margin-top:4px; font-size:11px; color:#5f6f68!important; }
  :global(html:not(.dark)) .account-table .action-cell > div { justify-content:flex-end; gap:8px; }
  :global(html:not(.dark)) .account-table .action-cell > div > button {
    min-height:32px; padding:6px 9px; font-size:11px; border-radius:8px;
    border-color:#d7ded3; background:#fcfdf9; box-shadow:none;
  }
  :global(html:not(.dark)) .account-table .account-menu summary {
    width:32px; height:32px; border:1px solid #d7ded3; border-radius:8px;
    color:#5f6f68; background:#fcfdf9;
  }
  :global(html:not(.dark)) .account-table .account-menu > div { background:#fcfdf9; border-color:#d7ded3; }
  @media(max-width:767px) {
    :global(html:not(.dark)) .account-table { border:0; background:transparent; }
    :global(html:not(.dark)) .account-table table { background:transparent; }
    :global(html:not(.dark)) .account-table tbody tr {
      padding:18px; margin-bottom:12px; border:1px solid #d7ded3;
      border-radius:14px; background:#fcfdf9; gap:12px;
    }
    :global(html:not(.dark)) .account-table td { padding:0; }
    :global(html:not(.dark)) .account-table .action-cell > div { justify-content:flex-start; }
    :global(html:not(.dark)) .account-table .action-cell > div > button { min-height:40px; font-size:12px; }
    :global(html:not(.dark)) .account-table .account-menu summary { width:40px; height:40px; }
  }
 
  /* Light desktop table: rounded cell surfaces keep action menus unclipped. */
  @media(min-width:768px) {
    :global(html:not(.dark)) .account-table table {
      border-collapse:separate; border-spacing:0; background:transparent; border-radius:14px;
    }
    :global(html:not(.dark)) .account-table thead { background:transparent; }
    :global(html:not(.dark)) .account-table tr { background:transparent; border:0; }
    :global(html:not(.dark)) .account-table th,
    :global(html:not(.dark)) .account-table td { background:#fcfdf9; }
    :global(html:not(.dark)) .account-table tbody td { border-top:1px solid #d7ded3; }
    :global(html:not(.dark)) .account-table tbody tr:last-child td:first-child { border-bottom-left-radius:13px; }
    :global(html:not(.dark)) .account-table tbody tr:last-child td:last-child { border-bottom-right-radius:13px; }
    :global(html:not(.dark)) .account-table th:last-child,
    :global(html:not(.dark)) .account-table .action-cell { width:180px; }
    :global(html:not(.dark)) .account-table th:last-child { text-align:center; }
    :global(html:not(.dark)) .account-table .action-cell > div { justify-content:center; }
  }

  /* Mirror the light table geometry using the canonical dark palette. */
  :global(html.dark) .account-table {
    border:1px solid #1c4037; border-radius:14px; background:#091c18;
    box-shadow:none;
  }
  :global(html.dark) .account-table table { font-size:12px; background:#091c18; }
  :global(html.dark) .account-table thead { height:auto; background:#091c18; color:#a3becd; }
  :global(html.dark) .account-table tr { height:auto; border-color:#1c4037; }
  :global(html.dark) .account-table th { padding:15px 14px; font-size:11px; font-weight:500; color:#a3becd; }
  :global(html.dark) .account-table th:first-child { border-top-left-radius:14px; }
  :global(html.dark) .account-table th:last-child { border-top-right-radius:14px; }
  :global(html.dark) .account-table td { padding:15px 14px; border-color:#1c4037; }
  :global(html.dark) .account-table .avatar { width:36px; height:36px; font-weight:700; }
  :global(html.dark) .account-table .user-cell p:first-child { font-size:12px; font-weight:600; color:#f5faf9; }
  :global(html.dark) .account-table .email-cell { margin-top:4px; font-size:11px; color:#a3becd!important; }
  :global(html.dark) .account-table .action-cell > div { justify-content:flex-end; gap:8px; }
  :global(html.dark) .account-table .action-cell > div > button {
    min-height:32px; padding:6px 9px; font-size:11px; border-radius:8px;
    border-color:#1c4037; background:#091c18; box-shadow:none;
  }
  :global(html.dark) .account-table .account-menu summary {
    width:32px; height:32px; border:1px solid #1c4037; border-radius:8px;
    color:#a3becd; background:#091c18;
  }
  :global(html.dark) .account-table .account-menu > div { background:#091c18; border-color:#1c4037; }
  @media(max-width:767px) {
    :global(html.dark) .account-table { border:0; background:transparent; }
    :global(html.dark) .account-table table { background:transparent; }
    :global(html.dark) .account-table tbody tr {
      padding:18px; margin-bottom:12px; border:1px solid #1c4037;
      border-radius:14px; background:#091c18; gap:12px;
    }
    :global(html.dark) .account-table td { padding:0; }
    :global(html.dark) .account-table .action-cell > div { justify-content:flex-start; }
    :global(html.dark) .account-table .action-cell > div > button { min-height:40px; font-size:12px; }
    :global(html.dark) .account-table .account-menu summary { width:40px; height:40px; }
  }
 
  /* Dark desktop table: rounded cell surfaces keep action menus unclipped. */
  @media(min-width:768px) {
    :global(html.dark) .account-table table {
      border-collapse:separate; border-spacing:0; background:transparent; border-radius:14px;
    }
    :global(html.dark) .account-table thead { background:transparent; }
    :global(html.dark) .account-table tr { background:transparent; border:0; }
    :global(html.dark) .account-table th,
    :global(html.dark) .account-table td { background:#091c18; }
    :global(html.dark) .account-table tbody td { border-top:1px solid #1c4037; }
    :global(html.dark) .account-table tbody tr:last-child td:first-child { border-bottom-left-radius:13px; }
    :global(html.dark) .account-table tbody tr:last-child td:last-child { border-bottom-right-radius:13px; }
    :global(html.dark) .account-table th:last-child,
    :global(html.dark) .account-table .action-cell { width:180px; }
    :global(html.dark) .account-table th:last-child { text-align:center; }
    :global(html.dark) .account-table .action-cell > div { justify-content:center; }
  }

  /* Reference table: one frame, independent email column and compact status pills. */
  .control-center .account-table { border-radius:18px; }
  .control-center .account-table .avatar { width:36px; height:36px; background:linear-gradient(145deg,#6f86b6,#4f678f)!important; color:#fff!important; }
  .control-center .account-table .user-cell p { margin:0!important; color:hsl(var(--foreground))!important; font-size:12px; font-weight:600; }
  .control-center .account-table .email-cell { font-size:11px; color:hsl(var(--muted-foreground))!important; margin:0; overflow-wrap:anywhere; }
  .control-center .account-status { display:inline-flex; align-items:center; gap:7px; white-space:nowrap; border-radius:999px; padding:7px 12px; font-size:11px; font-weight:500; background:hsl(var(--muted)); color:hsl(var(--muted-foreground)); }
  .control-center .account-status[data-account-status="ATIVO"] { background:#e4f3eb; color:#0d7e70; }
  .control-center .account-status[data-account-status="PENDENTE"] { background:#fff3d4; color:#8a5b0b; }
  .control-center .account-status[data-account-status="BLOQUEADO"] { background:#fce6e8; color:#a52b3d; }
  :global(html.dark) .control-center .account-status[data-account-status="ATIVO"] { background:#123b31; color:#00e9df; }
  :global(html.dark) .control-center .account-status[data-account-status="PENDENTE"] { background:#302709; color:#ffd52d; }
  :global(html.dark) .control-center .account-status[data-account-status="BLOQUEADO"] { background:#3b1d26; color:#ff8f9b; }
  .control-center .account-pagination { padding:16px 20px; border-top:1px solid hsl(var(--border)); border-radius:0 0 18px 18px; background:hsl(var(--card)); }
  .control-center .account-pagination button { min-height:32px; min-width:32px; height:32px; padding:0 9px!important; border-radius:9px; font-size:11px; }
  .control-center .account-pagination button[aria-current="page"] { background:hsl(var(--primary))!important; color:hsl(var(--primary-foreground))!important; border-color:hsl(var(--primary))!important; }
  @media(min-width:768px) {
    .control-center .account-table table { table-layout:fixed; border-radius:18px 18px 0 0; }
    .control-center .account-table th { padding:14px 16px; font-size:10px; letter-spacing:.09em; text-transform:uppercase; }
    .control-center .account-table td { padding:7px 16px; height:50px; }
    .control-center .account-table th:first-child { width:50px; border-top-left-radius:17px; }
    .control-center .account-table th:nth-child(2) { width:26%; }
    .control-center .account-table th:nth-child(3) { width:32%; }
    .control-center .account-table th:nth-child(4) { width:105px; }
    .control-center .account-table th:nth-child(5) { width:120px; }
    .control-center .account-table th:last-child { border-top-right-radius:17px; }
    .control-center .account-table .user-cell p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .control-center .account-table tbody tr:last-child td:first-child,
    .control-center .account-table tbody tr:last-child td:last-child { border-radius:0; }
    .control-center .account-table .action-cell > div > button { min-height:34px; height:34px; border-radius:9px; }
    .control-center .account-table .account-menu summary { width:34px; height:34px; border-radius:9px; }
  }
  @media(min-width:768px) and (max-width:1100px) {
    .control-center .account-table table { table-layout:auto; }
    .control-center .account-table th:nth-child(2),
    .control-center .account-table th:nth-child(3) { width:auto; }
    .control-center .account-table td,.control-center .account-table th { padding-left:8px; padding-right:8px; }
    .control-center .account-table .user-cell p { white-space:normal; overflow-wrap:anywhere; }
    .control-center .account-table .user-cell > div { gap:8px; }
  }
  @media(max-width:767px) {
    .control-center .account-table .email-cell { grid-column:1/-1; grid-row:2; border:0; }
    .control-center .account-table .profile-cell { grid-column:1; grid-row:3; }
    .control-center .account-table .status-cell { grid-column:2; grid-row:3; }
    .control-center .account-table .action-cell { grid-row:4; }
    .control-center .account-pagination { padding:14px 12px; border:1px solid hsl(var(--border)); border-radius:14px; gap:12px; }
  }

  /* Shared quiet hover for the requested command-center controls only. */
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is([data-admin-search],.control-export,.control-filter-trigger)) {
    border-width:1px!important; border-radius:13px!important;
    transition:background-color 150ms ease,border-color 150ms ease!important;
  }
  @media(hover:hover) and (pointer:fine) {
    :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is([data-admin-search],.control-export,.control-filter-trigger):not(:disabled):not([aria-disabled="true"]):not(:has(input:disabled)):hover) {
      background:hsl(var(--primary) / .07)!important;
      border-color:hsl(var(--primary) / .4)!important;
    }
  }

  /* These controls keep only the approved color hover treatment. */
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is([data-admin-search],.control-export,.control-filter-trigger)) {
    box-shadow:none!important; outline:none!important; transform:none!important;
    translate:none!important; scale:none!important; filter:none!important;
    animation:none!important;
  }
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is([data-admin-search],.control-export,.control-filter-trigger):is(:focus,:focus-visible,:focus-within,:active):not(:hover)) {
    border-color:hsl(var(--border))!important;
    background:hsl(var(--card))!important;
    box-shadow:none!important; outline:none!important;
  }
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is([data-admin-search],.control-export,.control-filter-trigger) > input:is(:focus,:focus-visible,:active)) {
    box-shadow:none!important; outline:none!important;
  }

  /* Custom icon selectors inherit the route palette, including the floating list. */
  :global(.control-center .control-filter) { display:flex; align-items:center; min-width:0; gap:8px; }
  :global(.control-center .control-filter-label) { font-size:12px; color:hsl(var(--muted-foreground)); }
  :global(.control-center .control-filter-field) { position:relative; min-width:0; flex:1; }
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-filter-trigger) {
   display:flex; align-items:center; gap:9px; width:100%; min-height:48px; padding:0 12px;
   border:1px solid hsl(var(--border)); border-radius:13px; background:hsl(var(--card)); color:hsl(var(--foreground));
   font-family:inherit; font-size:13px; cursor:pointer; text-align:left;
  }
  :global(.control-center .control-filter-trigger span) { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  :global(.control-center .control-filter-trigger svg) { flex-shrink:0; }
  :global(.control-center .control-filter-menu) {
   position:absolute; z-index:50; top:calc(100% + 8px); left:0; width:100%; min-width:0;
   padding:4px; border:1px solid hsl(var(--border)); border-radius:13px; outline:none;
   background:#fcfdf9; color:#162623; box-shadow:0 8px 20px rgba(22,38,35,.12);
  }
  :global(html.dark .control-center .control-filter-menu) { background:#091c18; color:#f5faf9; box-shadow:0 8px 20px rgba(0,0,0,.25); }
  :global(.control-center .control-filter-option) {
   display:flex; align-items:center; gap:10px; min-height:44px; padding:8px 10px; border-radius:9px;
   font-size:13px; cursor:pointer; transition:background-color 150ms ease;
  }
  :global(.control-center .control-filter-option span) { flex:1; min-width:0; }
  :global(.control-center .control-filter-option svg) { flex-shrink:0; }
  :global(.control-center .control-filter-option[aria-selected="true"]) { background:#e4f3eb; color:#0d7e70; font-weight:600; }
  :global(html.dark .control-center .control-filter-option[aria-selected="true"]) { background:#0a302b; color:#00e9df; }
  :global(.control-center .control-filter-option[data-active="true"]:not([aria-selected="true"])) { background:hsl(var(--primary) / .07); }
  :global(.control-center .control-filter-option[data-active="true"]) { outline:1px solid hsl(var(--primary) / .4); outline-offset:-1px; }
  @media(min-width:1024px) { :global(.control-center .control-filter-field) { width:176px; } }
  @media(max-width:639px) { :global(.control-center .control-filter-label) { display:none; } :global(.control-center .control-filter-option) { padding:8px; gap:7px; } }


  /* Account management uses a modal in the browser top layer. */
  :global(.control-center .control-manage-dialog) {
   width:min(560px,calc(100vw - 32px)); max-width:560px; max-height:calc(100dvh - 32px);
   margin:auto; padding:24px; overflow-y:auto; overscroll-behavior:contain;
   border:1px solid #d7ded3!important; border-radius:24px; background:#fcfdf9!important;
   color:#162623!important; box-shadow:0 20px 60px rgba(0,0,0,.2);
  }
  :global(.control-center .control-manage-dialog::backdrop) { background:rgba(2,12,10,.45); backdrop-filter:blur(2px); }
  :global(html.dark .control-center .control-manage-dialog) { border-color:#1c4037!important; background:#091c18!important; color:#f5faf9!important; }
  :global(.control-manage-header) { display:flex; align-items:center; gap:14px; margin-bottom:24px; }
  :global(.control-manage-avatar) { display:grid; place-items:center; width:48px; height:48px; flex-shrink:0; border-radius:50%; background:linear-gradient(145deg,#6f86b6,#4f678f); color:#fff; font-size:14px; font-weight:600; }
  :global(.control-manage-identity) { min-width:0; flex:1; }
  :global(.control-manage-identity h2) { margin:0; color:inherit; font-size:18px; font-weight:700; }
  :global(.control-manage-identity p) { margin:4px 0 0; font-size:13px; color:#5f6f68; overflow-wrap:anywhere; }
  :global(html.dark .control-manage-identity p) { color:#a3becd; }
  :global(.control-manage-close) { display:grid; place-items:center; width:36px; height:36px; flex-shrink:0; border:1px solid hsl(var(--border)); border-radius:11px; background:transparent; color:inherit; }
  :global(.control-manage-fields) { display:grid; gap:18px; padding:18px; border:1px solid hsl(var(--border)); border-radius:16px; }
  :global(.control-manage-fields label) { display:grid; gap:8px; min-width:0; font-size:13px; font-weight:500; }
  :global(.control-manage-fields :is(input,select)) { min-height:44px; border-radius:13px; color:inherit; background:#fcfdf9!important; border:1px solid #d7ded3!important; font:inherit; padding:10px 12px; }
  :global(html.dark .control-manage-fields :is(input,select)) { background:#091c18!important; border-color:#1c4037!important; }
  :global(.control-manage-grid) { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  :global(.control-manage-note) { display:flex; align-items:flex-start; gap:9px; margin:16px 0 0; font-size:12px; line-height:1.65; color:#5f6f68; }
  :global(.control-manage-note svg) { flex-shrink:0; margin-top:2px; }
  :global(html.dark .control-manage-note) { color:#a3becd; }
  :global(.control-manage-feedback) { margin-top:16px; padding:12px; border:1px solid hsl(var(--border)); border-radius:13px; font-size:13px; }
  :global(.control-manage-footer) { display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:24px; padding-top:18px; border-top:1px solid hsl(var(--border)); }
  :global(.control-manage-footer > div) { display:flex; gap:10px; flex-wrap:wrap; }
  :global(.control-manage-footer button) { min-height:44px; border-radius:13px; font-size:12px; }
  :global(.control-manage-footer .control-manage-save) { background:hsl(var(--primary))!important; color:hsl(var(--primary-foreground))!important; border-color:hsl(var(--primary))!important; }
  @media(max-width:520px) {
   :global(.control-center .control-manage-dialog) { padding:20px 16px; border-radius:20px; }
   :global(.control-manage-fields) { padding:14px; }
   :global(.control-manage-grid) { grid-template-columns:1fr; }
   :global(.control-manage-footer > button),:global(.control-manage-footer > div) { width:100%; }
   :global(.control-manage-footer > div > button) { flex:1; }
  }


  /* Table rows remain still; account management has the approved quiet hover. */
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .account-table .control-manage-trigger) {
    border-width:1px!important; border-radius:13px!important;
    transition:background-color 150ms ease,border-color 150ms ease!important;
    transform:none!important; translate:none!important; scale:none!important;
  }
  @media(hover:hover) and (pointer:fine) {
    :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .account-table .control-manage-trigger:hover:enabled) {
      background:hsl(var(--primary) / .07)!important;
      border-color:hsl(var(--primary) / .4)!important;
    }
  }
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .account-table .control-manage-trigger:disabled:hover) {
    background:hsl(var(--card))!important; border-color:hsl(var(--border))!important;
  }


  /* Keep modal colors above the shared admin surface rules. */
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-save) {
    background:#129b89!important; border-color:#129b89!important; color:#fff!important;
  }
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-save:hover:enabled) {
    background:#0d7e70!important; border-color:#0d7e70!important; color:#fff!important;
  }
  :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-save) {
    background:#00e9df!important; border-color:#00e9df!important; color:#002a26!important;
  }
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-fields select) {
    border-width:1px!important; border-radius:13px!important;
    transition:background-color 150ms ease,border-color 150ms ease!important;
    transform:none!important; translate:none!important; scale:none!important;
  }
  @media(hover:hover) and (pointer:fine) {
    :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-fields select:hover:enabled) {
      background:hsl(var(--primary) / .07)!important;
      border-color:hsl(var(--primary) / .4)!important;
    }
  }
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog :is(.control-manage-fields,.control-manage-footer,.control-manage-close,.control-manage-feedback)) {
    border-color:#d7ded3!important;
  }
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-fields select:disabled:hover) {
    background:#fcfdf9!important; border-color:#d7ded3!important;
  }
  :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-fields select:disabled:hover) {
    background:#091c18!important; border-color:#1c4037!important;
  }


  /* Edit selectors reuse the icon menu without offering the all-values filter. */
  :global(.control-center .control-manage-fields .control-filter-edit) { display:grid; gap:8px; align-items:stretch; }
  :global(.control-center .control-manage-fields .control-filter-label) { display:block; color:inherit; font-size:13px; font-weight:500; }
  :global(.control-center .control-manage-fields .control-filter-field) { width:100%; min-width:0; }
  :global(.control-center .control-manage-fields .control-filter-trigger) { min-height:44px; }
  :global(.control-center .control-manage-fields .control-filter-menu) { font-weight:400; }
  /* All requested fields keep only the approved color treatment. */
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is(.control-export,.control-filter-trigger,#control-manage-name,.control-manage-footer button)) {
    border-width:1px!important; border-radius:13px!important;
    transition:background-color 150ms ease,border-color 150ms ease!important;
    box-shadow:none!important; outline:none!important; transform:none!important;
    translate:none!important; scale:none!important; filter:none!important; animation:none!important;
  }
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer button:not(.control-manage-save)),
  :global(html.light [data-admin-route] [data-admin-content] .control-center :is(.control-export,.control-filter-trigger,#control-manage-name)) {
    background:#fcfdf9!important; border-color:#d7ded3!important; color:#162623!important;
  }
  :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer button:not(.control-manage-save)),
  :global(html.dark [data-admin-route] [data-admin-content] .control-center :is(.control-export,.control-filter-trigger,#control-manage-name)) {
    background:#091c18!important; border-color:#1c4037!important; color:#f5faf9!important;
  }
  @media(hover:hover) and (pointer:fine) {
    :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center :is(.control-export,.control-filter-trigger,#control-manage-name,.control-manage-footer button:not(.control-manage-save)):hover:enabled),
    :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer button:not(.control-manage-save):hover:enabled) {
      background:hsl(var(--primary) / .07)!important;
      border-color:hsl(var(--primary) / .4)!important;
    }
  }


  /* Restore the filled save action while retaining its approved hover state. */
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer .control-manage-save) {
    background:#129b89!important; border-color:#129b89!important; color:#fff!important;
  }
  :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer .control-manage-save) {
    background:#00e9df!important; border-color:#00e9df!important; color:#002a26!important;
  }
  @media(hover:hover) and (pointer:fine) {
    :global(html.light [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer .control-manage-save:hover:enabled) {
      background:#0d7e70!important; border-color:#0d7e70!important; color:#fff!important;
    }
    :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-manage-dialog .control-manage-footer .control-manage-save:hover:enabled) {
      background:#6df0dc!important; border-color:#6df0dc!important; color:#002a26!important;
    }
  }


  /* Explicit dark hover colors keep the controls aligned with the dark palette. */
  @media(hover:hover) and (pointer:fine) {
    :global(html.dark [data-admin-route] [data-admin-content] .control-center :is(.control-export,.control-filter-trigger,#control-manage-name,.control-manage-footer button:not(.control-manage-save)):hover:enabled) {
      background:rgba(0,233,223,.07)!important;
      border-color:rgba(0,233,223,.4)!important;
    }
  }


  /* Selection actions use only the approved theme-aware color hover. */
  :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-selection-action) {
    border-width:1px!important; border-radius:13px!important;
    transition:background-color 150ms ease,border-color 150ms ease!important;
    box-shadow:none!important; outline:none!important; transform:none!important;
    translate:none!important; scale:none!important; filter:none!important; animation:none!important;
  }
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-selection-action) {
    background:#fcfdf9!important; border-color:#d7ded3!important; color:#162623!important;
  }
  :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-selection-action) {
    background:#091c18!important; border-color:#1c4037!important; color:#f5faf9!important;
  }
  @media(hover:hover) and (pointer:fine) {
    :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-selection-action:hover:enabled) {
      background:hsl(var(--primary) / .07)!important; border-color:hsl(var(--primary) / .4)!important;
    }
  }


  /* The selection summary is a neutral surface in each theme. */
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-selection-bar) {
    background:#fcfdf9!important; border-color:#d7ded3!important; color:#162623!important;
  }
  :global(html.dark [data-admin-route] [data-admin-content] .control-center .control-selection-bar) {
    background:#091c18!important; border-color:#1c4037!important; color:#f5faf9!important;
  }


  /* Light module tabs remain readable when hovered. */
  @media(hover:hover) and (pointer:fine) {
    :global(html.light [data-admin-route] [data-admin-content] .control-center .control-tabs button[aria-pressed="false"]:hover) {
      color:#162623!important;
    }
  }


  /* Light hero mirrors the dark gradient placement with softer green tones. */
  :global(html.light [data-admin-route] [data-admin-content] .control-center .control-heading) {
    background:radial-gradient(ellipse at 84% 60%,#e4f3eb 0%,#f2f8f1 43%,#fcfdf9 100%)!important;
    border-color:#d7ded3!important;
  }


  /* Mobile layouts keep readable controls and menus inside the available space. */
  :global(.control-center .control-filter-menu) { overflow-y:auto; overscroll-behavior:contain; }
  :global(.control-center .control-filter-menu[data-above="true"]) { top:auto; bottom:calc(100% + 8px); }
  @media(max-width:767px) {
   .control-center { width:100%; min-width:0; }
   .control-heading { padding:24px 20px; min-height:200px; }
   .control-heading-copy { min-width:0; }
   .control-heading-copy > p:last-child { overflow-wrap:anywhere; }
   .control-export-row .control-export { width:100%; min-height:44px; white-space:normal; }
   :global(.control-center .control-selection-bar) { gap:12px; padding:14px; }
   :global(.control-center .control-selection-buttons) { width:100%; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
   :global(.control-center .control-selection-action) { min-height:44px; min-width:0; padding:10px 8px; white-space:normal; font-size:12px; }
   :global(html:is(.light,.dark) [data-admin-route] [data-admin-content] .control-center .control-filter-trigger) { font-size:16px; min-height:48px; }
   :global(.control-center .control-filter-option) { font-size:16px; min-height:44px; }
   :global(.control-center .control-manage-fields #control-manage-name) { font-size:16px!important; width:100%; min-width:0; }
   :global(.control-center .control-manage-dialog) { width:calc(100% - 24px); max-height:calc(100dvh - 24px); }
   :global(.control-center .control-manage-close) { width:44px; height:44px; }
   :global(.control-center .control-manage-footer button) { min-height:44px; }
   :global(.control-center .control-manage-footer > div) { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
   :global(.control-center .control-manage-footer > div button) { min-width:0; padding:10px 8px; white-space:normal; }
   .control-center .account-pagination nav { flex-wrap:wrap; gap:6px; }
   .control-center .account-pagination button { min-height:44px; height:44px; min-width:44px; }
   .control-center .account-table .user-cell p { overflow-wrap:anywhere; }
  }
  @media(max-width:520px) {
   :global(.control-center .control-toolbar .control-filter-group) { grid-template-columns:minmax(0,1fr); width:100%; }
   :global(.control-center .control-toolbar .control-filter) { display:grid; gap:6px; }
   :global(.control-center .control-toolbar .control-filter-label) { display:block; }
   :global(.control-center .control-filter-field) { width:100%; }
  }
  @media(max-width:359px) {
   :global(.control-center .control-selection-buttons) { grid-template-columns:minmax(0,1fr); }
   :global(.control-center .control-manage-footer > div) { grid-template-columns:minmax(0,1fr); }
   :global(.control-center .control-manage-avatar) { width:40px; height:40px; }
   :global(.control-center .control-manage-header) { gap:10px; }
  }


  /* Both themes use the same column anchors on the desktop table. */
  @media(min-width:768px) {
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center .account-table th),
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center .account-table td) { text-align:left!important; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center .account-table th:last-child),
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center .account-table .action-cell),
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center .account-table .selection-cell) { text-align:center!important; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center .account-table .action-cell > div) { justify-content:center!important; }
  }


  /* One width definition prevents theme rules from stretching columns differently. */
  @media(min-width:768px) {
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table table) { table-layout:fixed!important; width:100%; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table th), :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table td) { width:auto!important; padding-left:16px!important; padding-right:16px!important; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-selection) { width:48px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-user) { width:calc((100% - 538px) * .42); }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-email) { width:calc((100% - 538px) * .58); }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-profile) { width:150px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-status) { width:160px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-action) { width:180px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .email-cell) { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .user-cell p) { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .control-manage-trigger) { white-space:nowrap; }
  }
  @media(min-width:768px) and (max-width:1100px) {
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table th), :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table td) { padding-left:10px!important; padding-right:10px!important; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-selection) { width:40px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-user) { width:calc((100% - 404px) * .42); }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-email) { width:calc((100% - 404px) * .58); }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-profile) { width:108px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-status) { width:120px; }
    :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table col.control-col-action) { width:136px; }
  }
  @media(max-width:767px) { :global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table colgroup) { display:none; } }


/* Approved mobile account cards and overview hierarchy. */
@media(max-width:767px){
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center){display:flex;flex-direction:column;gap:20px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center > *){margin-top:0!important;margin-bottom:0!important;order:5;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center > .control-heading){order:0;min-height:190px;padding:24px 20px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-heading-art){width:290px!important;right:-105px;top:50%;opacity:.24;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center > .control-metrics){order:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-metric){min-height:90px;padding:14px 12px;gap:10px;border-radius:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-metric > span){width:40px;height:40px;border-radius:999px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-metric > span svg){width:24px;height:24px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-metric > div > p:first-child){font-size:12px;line-height:1.5;overflow-wrap:anywhere;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center > .control-export-row){order:2;width:100%;padding:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-export){width:100%;min-height:48px;font-size:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center > .control-tabs){order:3;min-height:44px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-tabs button){min-height:44px;padding:10px 14px;font-size:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center > .control-toolbar){order:4;display:flex;flex-direction:column;gap:12px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar [data-admin-search]){width:100%;min-height:48px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar [data-admin-search] input){height:48px;font-size:16px!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar .control-filter-group){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar .control-filter){display:grid;gap:6px;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar .control-filter-label){display:block;font-size:12px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar .control-filter-field){width:100%;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-toolbar .control-filter-trigger){width:100%;min-width:0;padding:10px;font-size:13px!important;min-height:48px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table){border:0!important;background:transparent!important;overflow:visible;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table table){display:block;width:100%;background:transparent!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table tbody){display:block;width:100%;background:transparent!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table tbody tr){display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:16px;margin-bottom:12px;border:1px solid #d7ded3!important;border-radius:13px;background:#fcfdf9!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table td){padding:0!important;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .avatar){display:flex;width:40px;height:40px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .user-cell){grid-column:1;grid-row:1;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .selection-cell){grid-column:2;grid-row:1;min-width:44px;min-height:44px;display:grid;place-items:center;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .selection-cell input){width:18px;height:18px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .email-cell){grid-column:1/-1;grid-row:2;font-size:13px;white-space:normal;overflow-wrap:anywhere;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .profile-cell){grid-column:1;grid-row:3;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .status-cell){grid-column:2;grid-row:3;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .action-cell){grid-column:1/-1;grid-row:4;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table .control-manage-trigger){width:100%;min-height:44px;justify-content:center;border-radius:13px;font-size:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-pagination){padding:16px;border:1px solid #d7ded3;border-radius:13px;flex-direction:column;align-items:flex-start;}
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-table tbody tr){border-color:#1c4037!important;background:#091c18!important;}
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .account-pagination){border-color:#1c4037;}
}

/* Vínculos uses the shared table and mobile card hierarchy. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds){--bond-bg:#fcfdf9;--bond-line:#d7ded3;--bond-muted:#5f6f68;--bond-text:#162623;--bond-brand:#129b89;--bond-danger:#b42336;display:grid;gap:16px;color:var(--bond-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create){padding:20px;border:1px solid var(--bond-line);border-radius:13px;background:var(--bond-bg);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds h2){font-size:20px;font-weight:650;line-height:1.4;margin:0;color:var(--bond-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create > p){font-size:13px;line-height:1.6;color:var(--bond-muted);margin:6px 0 16px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create form){display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(200px,.65fr);align-items:end;gap:12px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-filter){min-width:0;display:grid;gap:6px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-filter-label){display:block;font-size:12px;color:var(--bond-muted);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-filter-field){width:100%;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-filter-trigger){min-height:48px;width:100%;font-size:14px;border:1px solid var(--bond-line)!important;border-radius:13px!important;background:var(--bond-bg)!important;color:var(--bond-text)!important;box-shadow:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-filter-trigger > span){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create-action){min-height:48px;font-size:13px;color:var(--bond-brand);border:1px solid var(--bond-line);border-radius:13px;background:var(--bond-bg);padding:10px 16px;font-weight:600;transition:background-color 150ms ease,border-color 150ms ease;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list){border:1px solid var(--bond-line);border-radius:13px;background:var(--bond-bg);overflow:hidden;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list > header){padding:20px;border-bottom:1px solid var(--bond-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list > header p){font-size:12px;color:var(--bond-muted);margin:6px 0 0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds table){width:100%;table-layout:fixed;border-collapse:collapse;font-size:14px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds col:nth-child(1)){width:30%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds col:nth-child(2)){width:30%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds col:nth-child(3)){width:16%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds col:nth-child(4)){width:24%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds th){padding:14px 20px;font-size:12px;font-weight:500;text-align:left;color:var(--bond-muted);background:color-mix(in srgb,var(--bond-brand) 4%,var(--bond-bg));border-bottom:1px solid var(--bond-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds td){padding:16px 20px;border-bottom:1px solid var(--bond-line);vertical-align:middle;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds tbody tr:last-child td){border-bottom:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-person){display:flex;align-items:center;gap:12px;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-person > span:last-child){min-width:0;overflow-wrap:anywhere;line-height:1.5;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-person small){display:none;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-avatar){display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;border-radius:999px;background:color-mix(in srgb,var(--bond-brand) 10%,transparent);color:var(--bond-brand);font-size:12px;font-weight:600;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds th:last-child){text-align:center;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action){text-align:center;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action button){min-height:44px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--bond-danger) 25%,var(--bond-line));border-radius:13px;background:transparent;color:var(--bond-danger);font-size:12px;line-height:1.5;transition:background-color 150ms ease,border-color 150ms ease;box-shadow:none;transform:none;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds button:disabled){opacity:.45;cursor:not-allowed;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds button:focus-visible){outline:2px solid var(--bond-brand);outline-offset:3px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action button:focus-visible){outline-color:var(--bond-danger);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-empty){display:grid;justify-items:center;gap:12px;padding:32px 20px;font-size:14px;color:var(--bond-muted);text-align:center;}
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds){--bond-bg:#091c18;--bond-line:#1c4037;--bond-muted:#a3becd;--bond-text:#f5faf9;--bond-brand:#00e9df;--bond-danger:#ff8f9b;}
@media(max-width:767px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create){padding:16px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create form){grid-template-columns:minmax(0,1fr);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create-action){width:100%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list){background:transparent;border:0;overflow:visible;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list > header){padding:0 0 16px;border:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds table){display:block;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds colgroup){display:none;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds thead){display:none;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds tbody){display:grid;gap:12px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds tbody tr){display:grid;grid-template-columns:minmax(0,1fr);padding:16px;gap:14px;border:1px solid var(--bond-line);border-radius:13px;background:var(--bond-bg);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds td){display:block;padding:0;border:0!important;min-width:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-person small){display:block;font-size:12px;color:var(--bond-muted);margin-bottom:2px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action button){width:100%;min-height:44px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-status){padding-top:12px;border-top:1px solid var(--bond-line)!important;}}
@media(hover:hover) and (pointer:fine){
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-filter-trigger:hover:enabled),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-create-action:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent)!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action button:hover:enabled){background:color-mix(in srgb,var(--bond-danger) 7%,transparent);border-color:color-mix(in srgb,var(--bond-danger) 40%,transparent);}
}

/* Match the Contas table visual language without changing bond actions. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-avatar){background:linear-gradient(145deg,#6f86b6,#4f678f);color:#fff;font-weight:700;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-person > span:last-child){font-size:12px;font-weight:600;color:var(--bond-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list){border-radius:15px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds th){font-size:11px;font-weight:500;letter-spacing:.09em;text-transform:uppercase;background:var(--bond-bg);color:var(--bond-muted);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action button){display:inline-flex;align-items:center;justify-content:center;gap:8px;border-color:var(--bond-line);font-weight:600;}
@media(min-width:768px){
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-list > header){position:absolute;width:1px;height:1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds th){padding:15px 16px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds td){padding:7px 16px;height:50px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-avatar){width:36px;height:36px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-person > span:last-child){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-action button){min-height:34px;padding:6px 12px;font-size:12px;}
}

@media(max-width:767px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-bonds .control-bond-avatar){width:40px;height:40px;}}

/* Treinos shares the Vínculos table and mobile cards. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-icon){display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;border-radius:9px;background:color-mix(in srgb,var(--bond-brand) 7%,transparent);color:var(--bond-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-bond-action .control-workout-action){color:var(--bond-brand);border-color:var(--bond-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts col:nth-child(1)){width:27%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts col:nth-child(2)),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts col:nth-child(3)){width:23%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts col:nth-child(4)){width:11%;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts col:nth-child(5)){width:16%;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-bond-action .control-workout-action:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 7%,transparent);border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent);}}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-bond-action .control-workout-action:focus-visible){outline-color:var(--bond-brand);}
@media(min-width:768px) and (max-width:1199px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts td),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts th){padding-left:10px;padding-right:10px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-bond-person){gap:8px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-bond-action .control-workout-action){white-space:normal;}}
@media(max-width:767px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-icon){width:40px;height:40px;}}

/* Responsive workout editor. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor){padding:24px;border:1px solid var(--bond-line);border-radius:13px;background:var(--bond-bg);display:grid;gap:20px;color:var(--bond-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading){display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:1px solid var(--bond-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading > div){min-width:0;flex:1;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading h2){font-size:20px;font-weight:650;line-height:1.4;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading p, .workout-editor-status p){font-size:13px;line-height:1.6;color:var(--bond-muted);margin:5px 0 0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading .control-workout-icon){width:48px;height:48px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-close){display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border:1px solid transparent;border-radius:13px;color:var(--bond-muted);background:transparent;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-student){display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--bond-line);border-radius:13px;font-size:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-student > span:first-child){color:var(--bond-muted);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-student strong){font-weight:500;min-width:0;overflow-wrap:anywhere;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields > label){display:grid;gap:8px;min-width:0;font-size:13px;font-weight:600;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields input, .workout-editor-select){width:100%;min-width:0;height:48px;border:1px solid var(--bond-line);border-radius:13px;background:var(--bond-bg);color:var(--bond-text);font-size:14px;font-weight:400;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields input){padding:0 14px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-select){display:flex;align-items:center;gap:10px;padding:0 14px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-select > svg){flex-shrink:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-select select){min-width:0;width:100%;height:100%;appearance:none;border:0;background:transparent;color:inherit;font-size:inherit;outline:none;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-select option){background:var(--bond-bg);color:var(--bond-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status){display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border:1px solid var(--bond-line);border-radius:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status strong){font-size:13px;font-weight:600;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status-control){display:flex;align-items:center;gap:10px;color:var(--bond-brand);font-size:13px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status-control input){appearance:none;width:44px;height:26px;margin:0;flex-shrink:0;border:1px solid var(--bond-line);border-radius:999px;background:var(--bond-line);cursor:pointer;position:relative;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status-control input::before){content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:var(--bond-bg);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status-control input:checked){background:var(--bond-brand);border-color:var(--bond-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status-control input:checked::before){left:21px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-note){display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1px solid var(--bond-line);border-radius:13px;font-size:12px;line-height:1.7;color:var(--bond-muted);margin:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-note svg){flex-shrink:0;color:var(--bond-brand);margin-top:1px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer){display:flex;justify-content:flex-end;gap:12px;padding-top:20px;border-top:1px solid var(--bond-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer button){min-height:44px;padding:10px 20px;border:1px solid var(--bond-line);border-radius:13px;background:transparent;color:var(--bond-text);font-size:13px;font-weight:600;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save){background:var(--bond-brand);border-color:var(--bond-brand);color:#fff;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor button){cursor:pointer;transition:background-color 150ms ease,border-color 150ms ease;transform:none;box-shadow:none;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor :is(input,select,button):disabled){opacity:.45;cursor:not-allowed;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor :is(input,button):focus-visible, .workout-editor-select:focus-within){outline:2px solid var(--bond-brand);outline-offset:3px;}
:global(html.dark .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save){color:#091c18;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer button:not(.workout-editor-save):hover:enabled),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-close:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 7%,transparent);border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent);}}
@media(max-width:767px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor){padding:16px;gap:18px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields){grid-template-columns:minmax(0,1fr);gap:18px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields input),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-select select){font-size:16px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading){gap:10px;align-items:flex-start;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading h2){font-size:17px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-heading .control-workout-icon){width:36px;height:36px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-student){flex-wrap:wrap;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-status){flex-wrap:wrap;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer){flex-direction:column-reverse;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer button){width:100%;min-height:48px;}}

/* Keep editor controls aligned and isolate primary button contrast from shared overrides. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter){display:grid;gap:8px;align-content:start;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter-label){font-size:13px!important;font-weight:600!important;color:var(--bond-text)!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter-trigger){height:48px!important;padding:0 14px!important;border:1px solid var(--bond-line)!important;border-radius:13px!important;background:var(--bond-bg)!important;color:var(--bond-text)!important;font-size:14px!important;font-weight:400!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter-menu){background:var(--bond-bg)!important;border:1px solid var(--bond-line)!important;color:var(--bond-text)!important;border-radius:13px!important;z-index:60;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter-option){min-height:44px;color:var(--bond-text)!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save.workout-editor-save){min-height:48px;background:var(--bond-brand)!important;border:1px solid var(--bond-brand)!important;color:#fff!important;line-height:1.5;white-space:nowrap;}
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save.workout-editor-save){color:#091c18!important;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter-trigger:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent)!important;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save.workout-editor-save:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 90%,var(--bond-bg))!important;}}
@media(max-width:767px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-fields .control-filter-trigger){font-size:16px!important;}}

/* Title input uses the established hover without additional effects. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor .workout-editor-fields > label > input){border:1px solid var(--bond-line)!important;border-radius:13px!important;background:var(--bond-bg)!important;color:var(--bond-text)!important;box-shadow:none!important;filter:none!important;transform:none!important;outline:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor .workout-editor-fields > label > input:focus),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor .workout-editor-fields > label > input:active){box-shadow:none!important;outline:none!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor .workout-editor-fields > label > input:focus-visible){outline:none!important;outline-offset:0!important;box-shadow:none!important;border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent)!important;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor .workout-editor-fields > label > input:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent)!important;}}
@media(prefers-reduced-motion:reduce){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .control-workout-editor .workout-editor-fields > label > input){transition:none!important;}}

/* Registration configuration follows the approved light/dark layout. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config){--config-bg:#fcfdf9;--config-line:#d7ded3;--config-text:#162623;--config-muted:#5f6f68;--config-brand:#129b89;max-width:760px;width:100%;display:grid;gap:24px;padding:28px;border:1px solid var(--config-line);border-radius:13px;background:var(--config-bg);color:var(--config-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-heading){display:flex;align-items:center;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--config-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-icon){display:grid;place-items:center;width:64px;height:64px;flex-shrink:0;border-radius:13px;background:color-mix(in srgb,var(--config-brand) 10%,transparent);color:var(--config-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config h2){font-size:22px;font-weight:650;line-height:1.4;color:var(--config-text);margin:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config p){font-size:14px;line-height:1.6;color:var(--config-muted);margin:6px 0 0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-registration){display:flex;align-items:center;justify-content:space-between;gap:24px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-registration > div:first-child){min-width:0;flex:1;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config label){font-size:16px;font-weight:600;color:var(--config-text);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state){display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input){appearance:none;width:58px;height:32px;margin:0;position:relative;border:1px solid var(--config-line);border-radius:999px;background:var(--config-line);cursor:pointer;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input::before){content:"";position:absolute;width:24px;height:24px;border-radius:50%;left:3px;top:3px;background:#fff;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input:checked){border-color:var(--config-brand);background:var(--config-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input:checked::before){left:29px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-badge){font-size:12px;font-weight:600;border-radius:999px;padding:7px 12px;background:color-mix(in srgb,var(--config-muted) 10%,transparent);color:var(--config-muted);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-badge[data-open="true"]){background:color-mix(in srgb,var(--config-brand) 12%,transparent);color:var(--config-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-notice){display:flex;align-items:center;gap:20px;padding:20px;border:1px solid var(--config-line);border-radius:13px;background:color-mix(in srgb,var(--config-brand) 4%,var(--config-bg));margin:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-notice svg){flex-shrink:0;color:var(--config-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-notice span){padding-left:20px;border-left:1px solid var(--config-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-note){display:grid;gap:8px;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-note p){margin:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config textarea){display:block;width:100%;min-height:130px;padding:14px 16px;border:1px solid var(--config-line)!important;border-radius:13px!important;background:var(--config-bg)!important;color:var(--config-text)!important;font-size:14px;line-height:1.6;resize:vertical;outline:none!important;box-shadow:none!important;transition:background-color 150ms ease,border-color 150ms ease;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config textarea::placeholder){color:var(--config-muted);opacity:.8;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config textarea:focus-visible){border-color:color-mix(in srgb,var(--config-brand) 40%,transparent)!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-note > span){justify-self:end;font-size:12px;color:var(--config-muted);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer){display:flex;justify-content:flex-end;padding-top:20px;border-top:1px solid var(--config-line);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer button){display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;padding:12px 20px;border:1px solid var(--config-brand)!important;border-radius:13px!important;background:transparent!important;color:var(--config-brand)!important;font-size:14px;font-weight:600;box-shadow:none!important;transform:none!important;cursor:pointer;transition:background-color 150ms ease,border-color 150ms ease;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config :is(button,input,textarea):disabled){opacity:.45;cursor:not-allowed;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config :is(button,input):focus-visible){outline:2px solid var(--config-brand);outline-offset:3px;}
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config){--config-bg:#091c18;--config-line:#1c4037;--config-text:#f5faf9;--config-muted:#a3becd;--config-brand:#00e9df;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config textarea:hover:enabled),:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer button:hover:enabled){background:color-mix(in srgb,var(--config-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--config-brand) 40%,transparent)!important;}}
@media(max-width:767px){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config){padding:18px;gap:20px;max-width:none;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-heading){gap:12px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-icon){width:48px;height:48px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config h2){font-size:19px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-registration){align-items:flex-start;flex-wrap:wrap;gap:16px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-registration > div:first-child){flex-basis:200px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state){align-items:flex-start;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-notice){gap:12px;padding:16px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-notice span){padding-left:12px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config textarea){font-size:16px;}:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer button){width:100%;}}

/* Approved switch, status pill and standard save hover. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input){width:44px!important;height:26px!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input::before){width:18px!important;height:18px!important;top:3px!important;left:3px!important;background:var(--config-bg)!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-state input:checked::before){left:21px!important;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-badge){display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:30px;padding:6px 12px;border:0;border-radius:999px;font-size:12px;font-weight:500;line-height:1.5;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-badge[data-open="true"]){background:color-mix(in srgb,var(--config-brand) 12%,transparent);color:var(--config-brand);}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config .config-badge svg){flex-shrink:0;}
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer button){border:1px solid var(--config-line)!important;border-radius:13px!important;background:transparent!important;box-shadow:none!important;filter:none!important;transform:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer button:hover:enabled){background:color-mix(in srgb,var(--config-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--config-brand) 40%,transparent)!important;color:var(--config-brand)!important;}}
@media(prefers-reduced-motion:reduce){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config footer button){transition:none!important;}}

/* Note grows and shrinks with content instead of showing an internal scrollbar. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-config textarea){resize:none!important;overflow-y:hidden!important;max-height:none!important;box-sizing:border-box;}

/* Save changes matches the configuration outline command, without an icon. */
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save.workout-editor-save){display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border:1px solid var(--bond-line)!important;border-radius:13px!important;background:transparent!important;color:var(--bond-brand)!important;font-size:14px;font-weight:600;box-shadow:none!important;filter:none!important;transform:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save.workout-editor-save){color:var(--bond-brand)!important;}
@media(hover:hover) and (pointer:fine){:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-workouts .workout-editor-footer .workout-editor-save.workout-editor-save:hover:enabled){background:color-mix(in srgb,var(--bond-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--bond-brand) 40%,transparent)!important;}}

:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-export-row .control-export) { color:#129b89!important; font-weight:500!important; }
:global(html.dark :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-export-row .control-export) { color:#00e9df!important; }
:global(html:is(.light,.dark) :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"]) [data-admin-content] .control-center.control-center .control-export-row .control-export svg) { color:inherit!important; }

:global(html:is(.light,.dark) body :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"])[data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .control-center.control-center .control-export-row button.control-export.control-export) { --export-brand:#129b89; color:var(--export-brand)!important; font-weight:500!important; background:#fcfdf9!important; border:1px solid #d7ded3!important; border-radius:13px!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
:global(html.dark body :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"])[data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .control-center.control-center .control-export-row button.control-export.control-export) { --export-brand:#00e9df; color:var(--export-brand)!important; background:#091c18!important; border-color:#1c4037!important; }
:global(html:is(.light,.dark) body :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"])[data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .control-center.control-center .control-export-row button.control-export.control-export svg) { color:var(--export-brand)!important; }
@media(hover:hover) and (pointer:fine) { :global(html:is(.light,.dark) body :is([data-admin-route="/admin"],[data-admin-route="/admin/controle"])[data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .control-center.control-center .control-export-row button.control-export.control-export:hover:enabled) { background:color-mix(in srgb,var(--export-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--export-brand) 40%,transparent)!important; } }
`}</style>
 </div>
}
