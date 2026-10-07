 'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Shield, Download, Search, Users, UserRound, Link2, Dumbbell, Settings2, ChevronLeft, ChevronRight, ChevronsUpDown, MoreHorizontal } from 'lucide-react'
type User = { id: string; nome: string; email: string; tipo: string; status_conta: string }
type Workout = { id: string; titulo: string; aluno_id: string; personal_id: string; ativo: boolean }
type Bond = { id: string; aluno_id: string; personal_id: string; status: string }
const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40'

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
 const [tab, setTab] = useState('Contas')
 const [search, setSearch] = useState('')
 const [profileFilter, setProfileFilter] = useState('')
 const [statusFilter, setStatusFilter] = useState('')
 const [page, setPage] = useState(1)
 const [checkedIds, setCheckedIds] = useState<string[]>([])
 const [sortKey, setSortKey] = useState<'nome' | 'tipo'>('nome')
 const [sortAsc, setSortAsc] = useState(true)
 const [selected, setSelected] = useState<User | null>(null)
 const [busy, setBusy] = useState(false)
 const [feedback, setFeedback] = useState('')
 const [aluno, setAluno] = useState('')
 const [personal, setPersonal] = useState('')
 const [workout, setWorkout] = useState<Workout | null>(null)
 const [open, setOpen] = useState(true)
 const [message, setMessage] = useState('')
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
  <nav className="control-tabs flex gap-1 overflow-x-auto border-b border-border" aria-label="Módulos da central">{['Contas', 'Vínculos', 'Treinos', 'Configurações'].map(t => <button key={t} className={`shrink-0 border-b-2 px-4 py-3 text-sm transition-colors sm:px-6 ${tab === t ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`} aria-pressed={tab === t} onClick={() => { setTab(t); setSearch(''); setPage(1); if (t === 'Configurações' && data?.config) { setOpen(data.config.cadastro_aberto); setMessage(data.config.mensagem_publica) } }}>{t}</button>)}</nav>
  {tab !== 'Configurações' && <div className="control-toolbar flex flex-col gap-3 lg:flex-row lg:items-center">
   <label data-admin-search className="relative min-w-0 flex-1"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input className={`${input} min-h-11 pl-10`} aria-label="Buscar registros" placeholder="Buscar por nome, e-mail ou título" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label>
   {tab === 'Contas' && <div className="grid grid-cols-2 gap-3 lg:w-auto">
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">Perfil</span><select aria-label="Filtrar por perfil" className={`${input} min-h-11 lg:w-44`} value={profileFilter} onChange={e => { setProfileFilter(e.target.value); setPage(1) }}><option value="">Todos os perfis</option>{['ADMIN','ALUNO','PERSONAL'].map(v => <option key={v}>{v}</option>)}</select></label>
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">Status</span><select aria-label="Filtrar por status" className={`${input} min-h-11 lg:w-44`} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}><option value="">Todos os status</option>{['ATIVO','PENDENTE','BLOQUEADO'].map(v => <option key={v}>{v}</option>)}</select></label>
   </div>}
  </div>}
  {tab === 'Contas' && <section aria-label="Contas da plataforma" className="space-y-4">
   {checkedIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2 text-sm"><span>{checkedIds.length} conta(s) selecionada(s)</span><div className="flex gap-2"><button className={button} onClick={() => exportData(checkedIds)}>Exportar seleção</button><button className={button} onClick={() => setCheckedIds([])}>Limpar seleção</button></div></div>}
   <div className="account-table overflow-hidden rounded-xl border border-border bg-card/30"><table className="w-full text-left text-sm"><thead className="bg-card text-xs text-muted-foreground"><tr><th scope="col" className="selection-cell w-14 px-5 py-4"><input type="checkbox" aria-label="Selecionar contas desta página" checked={allVisibleChecked} onChange={() => setCheckedIds(ids => allVisibleChecked ? ids.filter(id => !visibleUsers.some(u => u.id === id)) : [...new Set([...ids, ...visibleUsers.map(u => u.id)])])}/></th><th scope="col" aria-sort={sortKey === 'nome' ? sortAsc ? 'ascending' : 'descending' : 'none'} className="px-5 py-4 font-medium"><button className="inline-flex items-center gap-2" onClick={() => sortAccounts('nome')}>Usuário<ChevronsUpDown size={13}/></button></th><th scope="col" className="px-5 py-4 font-medium"><button className="inline-flex items-center gap-2" onClick={() => sortAccounts('tipo')}>Perfil<ChevronsUpDown size={13}/></button></th><th scope="col" className="px-5 py-4 font-medium">Status</th><th scope="col" className="px-5 py-4 font-medium">Controle</th></tr></thead><tbody>{visibleUsers.map(u => <tr key={u.id} className="border-t border-border transition-colors hover:bg-primary/5">
    <td className="selection-cell px-5 py-4"><input type="checkbox" aria-label={`Selecionar ${u.nome}`} checked={checkedIds.includes(u.id)} onChange={() => toggleChecked(u.id)}/></td><td className="user-cell px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className={`avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${u.tipo === 'ADMIN' ? 'bg-primary/15 text-primary' : u.tipo === 'ALUNO' ? 'bg-info/15 text-info' : 'personal-avatar'}`}>{initials(u.nome)}</span><div className="min-w-0"><p className="font-medium">{u.nome}</p><p className="mt-1 break-all text-xs text-muted-foreground">{u.email}</p></div></div></td>
    <td className="profile-cell px-5 py-4"><span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold ${u.tipo === 'ADMIN' ? 'border-primary/25 bg-primary/10 text-primary' : u.tipo === 'ALUNO' ? 'border-info/25 bg-info/10 text-info' : 'personal-badge'}`}>{u.tipo}</span></td>
    <td className="status-cell px-5 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${u.status_conta === 'ATIVO' ? 'bg-success' : u.status_conta === 'PENDENTE' ? 'bg-warning' : 'bg-destructive'}`}/>{u.status_conta === 'ATIVO' ? 'Ativo' : u.status_conta === 'PENDENTE' ? 'Pendente' : u.status_conta === 'BLOQUEADO' ? 'Bloqueado' : u.status_conta}</span></td>
    <td className="action-cell px-5 py-4"><div className="flex items-center justify-between gap-3"><button className={button} aria-label={`Gerenciar ${u.nome}`} disabled={!data?.ready || busy} onClick={() => setSelected({...u})}><Settings2 size={17}/>Gerenciar</button><details className="account-menu relative"><summary aria-label={`Mais ações para ${u.nome}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10"><MoreHorizontal size={18}/></summary><div className="absolute bottom-full right-0 z-20 mb-1 w-44 rounded-lg border border-border bg-card p-1 shadow-lg"><button className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-primary/10" disabled={!data?.ready || busy} onClick={e => { setSelected({...u}); e.currentTarget.closest('details')?.removeAttribute('open') }}>Editar conta</button><button className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-primary/10" onClick={e => { exportData([u.id]); e.currentTarget.closest('details')?.removeAttribute('open') }}>Exportar conta</button></div></details></div></td>
   </tr>)}</tbody></table>
   {!isLoading && !error && filteredUsers.length === 0 && <div className="p-10 text-center"><Users size={28} className="mx-auto mb-3 text-muted-foreground"/><p className="font-medium">Nenhuma conta encontrada</p><p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou ajuste os filtros.</p>{(search || profileFilter || statusFilter) && <button className={`${button} mt-4`} onClick={() => { setSearch(''); setProfileFilter(''); setStatusFilter(''); setPage(1) }}>Limpar filtros</button>}</div>}
   </div>
   <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p aria-live="polite">{filteredUsers.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredUsers.length)} de ${filteredUsers.length} contas` : '0 contas'}</p><nav aria-label="Paginação de contas" className="flex items-center gap-2"><button className={`${button} !px-3`} aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button>{Array.from({length: pageCount}, (_, i) => i + 1).filter(n => n === 1 || n === pageCount || Math.abs(n - currentPage) <= 1).map((n, i, pages) => <span key={n} className="flex items-center gap-2">{i > 0 && n - pages[i - 1] > 1 && <span>…</span>}<button aria-label={`Página ${n}`} aria-current={currentPage === n ? 'page' : undefined} className={`${button} !px-3 ${currentPage === n ? '!border-primary bg-primary/10 text-primary' : ''}`} onClick={() => setPage(n)}>{n}</button></span>)}<button className={`${button} !px-3`} aria-label="Próxima página" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></nav></footer>
  </section>}
  {selected && tab === 'Contas' && <form className="space-y-4 rounded-xl border border-primary/40 bg-card p-5" onSubmit={e => { e.preventDefault(); void act('EDITAR_USUARIO', selected.id, selected) }}><h2 className="font-semibold">Editar {selected.email}</h2><label className="block text-sm">Nome<input required minLength={2} maxLength={120} className={input} value={selected.nome} onChange={e => setSelected({...selected, nome:e.target.value})}/></label><label className="block text-sm">Perfil<select className={input} value={selected.tipo} onChange={e => setSelected({...selected,tipo:e.target.value})}>{['ALUNO','PERSONAL','ADMIN'].map(v => <option key={v}>{v}</option>)}</select></label><label className="block text-sm">Status<select className={input} value={selected.status_conta} onChange={e => setSelected({...selected,status_conta:e.target.value})}>{['ATIVO','PENDENTE','BLOQUEADO'].map(v => <option key={v}>{v}</option>)}</select></label><p className="text-xs text-muted-foreground">Promover a ADMIN concede acesso global. O servidor impede remover seu próprio acesso e alterar perfis com relações existentes.</p><button disabled={busy} className={button}>Confirmar alteração</button> <button type="button" className={button} onClick={() => setSelected(null)}>Cancelar</button></form>}
  {tab === 'Vínculos' && <div className="space-y-4"><form className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3" onSubmit={e => { e.preventDefault(); void act('VINCULAR', aluno, {personal_id:personal}) }}><select required aria-label="Aluno" className={input} value={aluno} onChange={e => setAluno(e.target.value)}><option value="">Escolha o aluno</option>{data?.users.filter(u => u.tipo === 'ALUNO' && u.status_conta === 'ATIVO').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><select required aria-label="Personal" className={input} value={personal} onChange={e => setPersonal(e.target.value)}><option value="">Escolha o personal</option>{personals.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><button className={button} disabled={!data?.ready || busy}>Criar / reativar vínculo</button></form>{data?.bonds.filter(v => `${name(v.aluno_id)} ${name(v.personal_id)}`.toLowerCase().includes(search.toLowerCase())).map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div>{name(v.aluno_id)} → {name(v.personal_id)}<p className="text-xs text-muted-foreground">{v.status}</p></div><button className={button} disabled={!data.ready || busy || v.status !== 'ATIVO'} onClick={() => void act('DESATIVAR_VINCULO',v.id,{})}>Desativar vínculo</button></div>)}</div>}
  {tab === 'Treinos' && <div className="space-y-3">{data?.workouts.filter(t => `${t.titulo} ${name(t.aluno_id)}`.toLowerCase().includes(search.toLowerCase())).map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div>{t.titulo}<p className="text-xs text-muted-foreground">{name(t.aluno_id)} · {name(t.personal_id)} · {t.ativo ? 'Ativo' : 'Arquivado'}</p></div><button className={button} disabled={!data.ready || busy} onClick={() => setWorkout({...t})}>Editar / transferir</button></div>)}{workout && <form className="space-y-3 rounded-xl border border-primary/40 bg-card p-4" onSubmit={e => { e.preventDefault(); void act('EDITAR_TREINO',workout.id,workout) }}><label className="block text-sm">Título<input required minLength={2} maxLength={150} className={input} value={workout.titulo} onChange={e => setWorkout({...workout,titulo:e.target.value})}/></label><label className="block text-sm">Responsável<select className={input} value={workout.personal_id} onChange={e => setWorkout({...workout,personal_id:e.target.value})}>{personals.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={workout.ativo} onChange={e => setWorkout({...workout,ativo:e.target.checked})}/>Treino ativo</label><p className="text-xs text-muted-foreground">Transferências exigem vínculo ativo com o aluno. Séries e histórico são preservados.</p><button disabled={busy} className={button}>Salvar treino</button> <button className={button} type="button" onClick={() => setWorkout(null)}>Cancelar</button></form>}</div>}
  {tab === 'Configurações' && <form className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); void act('CONFIGURAR',null,{cadastro_aberto:open,mensagem_publica:message}) }}><h2 className="font-semibold">Controle de cadastros</h2><label className="flex gap-3"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)}/>Permitir novas contas</label><p className="text-sm text-muted-foreground">O bloqueio é aplicado no banco, inclusive para cadastros feitos diretamente pela API de autenticação.</p><label className="block text-sm">Nota administrativa<textarea maxLength={500} className={input} value={message} onChange={e => setMessage(e.target.value)}/></label><button className={button} disabled={!data?.ready || busy}>Salvar configuração</button></form>}
 <style jsx>{`

  .control-center { --primary: 172.12 79.19% 33.92%; --info: 200 90% 34%; --success: 163 87% 30%; }
  :global(.dark) .control-center { --background: 164 46% 5%; --card: 164 40% 8%; --foreground: 180 20% 96%; --muted-foreground: 182 21% 72%; --primary: 177 100% 50%; --border: 168 30% 17%; --info: 197 100% 57%; --success: 166 100% 49%; color: hsl(var(--foreground)); }
  :global(.dark [data-admin-route="/admin"]), :global(.dark [data-admin-route="/admin/controle"]) { --shapeos-bg: #06120f; --shapeos-surface: #091814; --shapeos-brand: #00fff0; --shapeos-text: #f1f8f7; --shapeos-muted: #abcac9; --border: 168 30% 17%; background: radial-gradient(ellipse at 70% 12%, #0b2923 0%, transparent 45%), #06120f; }
  :global(.dark [data-admin-route="/admin"] .shapeos-navigation), :global(.dark [data-admin-route="/admin/controle"] .shapeos-navigation) { --shapeos-surface: #071511; --shapeos-brand: #00fff0; --shapeos-text: #f1f8f7; --shapeos-muted: #abcac9; }
  :global([data-admin-route="/admin"] .shapeos-navigation a[aria-current="page"]), :global([data-admin-route="/admin/controle"] .shapeos-navigation a[aria-current="page"]) { color: var(--shapeos-brand) !important; border-color: hsl(var(--primary) / .28) !important; background: hsl(var(--primary) / .08) !important; }
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
  :global(html:not(.dark)) .account-table .user-cell p:last-child { margin-top:4px; font-size:11px; color:#5f6f68!important; }
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
    :global(html:not(.dark)) .account-table tbody tr:hover td { background:#f0f7f2; }
    :global(html:not(.dark)) .account-table tbody tr:last-child td:first-child { border-bottom-left-radius:13px; }
    :global(html:not(.dark)) .account-table tbody tr:last-child td:last-child { border-bottom-right-radius:13px; }
    :global(html:not(.dark)) .account-table th:last-child,
    :global(html:not(.dark)) .account-table .action-cell { width:180px; }
    :global(html:not(.dark)) .account-table th:last-child { text-align:center; }
    :global(html:not(.dark)) .account-table .action-cell > div { justify-content:center; }
  }
`}</style>
 </div>
}
