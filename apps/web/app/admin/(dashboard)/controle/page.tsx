 'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Shield, Download, Search, Users, UserRound, Link2, Dumbbell, Settings2, ChevronLeft, ChevronRight } from 'lucide-react'
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
 function exportData() {
  if (!data) return
  const blob = new Blob([JSON.stringify({ exportado_em: new Date().toISOString(), usuarios: data.users, vinculos: data.bonds, treinos: data.workouts }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'shapeos-administracao.json'; anchor.click(); URL.revokeObjectURL(url)
 }
 const personals = data?.users.filter(u => u.tipo === 'PERSONAL' && u.status_conta === 'ATIVO') ?? []
 const filteredUsers = data?.users.filter(u => `${u.nome} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()) && (!profileFilter || u.tipo === profileFilter) && (!statusFilter || u.status_conta === statusFilter)) ?? []
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
 return <div className="control-center min-w-0 space-y-6">
  <header className="control-heading"><div className="control-heading-copy"><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-primary"><Shield size={15}/> Administração global</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Central de controle</h1><p className="mt-2 text-sm text-muted-foreground">Contas, relações e treinos. Cada mudança fica registrada.</p></div><div className="control-heading-art"><ControlGlobe/></div><button className={`${button} control-export`} disabled={!data} onClick={exportData}><Download className="mr-2 inline" size={16}/>Exportar dados carregados</button></header>
  {isLoading && <p role="status">Carregando a plataforma…</p>}
  {error && <p role="alert" className="rounded-xl border border-destructive p-4">{error.message}</p>}
  {data && !data.ready && <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm"><strong>Configuração do banco necessária.</strong><p className="mt-1">Os controles aguardam a migração 0013_admin_control_center.sql no Supabase. As consultas continuam disponíveis.</p><p className="mt-1 text-muted-foreground">{data.configError}</p></div>}
  {feedback && <p role="status" className="rounded-xl border border-primary/40 p-4 text-sm">{feedback}</p>}
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(({label, value, icon: Icon}) => <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card/60 p-4 sm:gap-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={22} strokeWidth={1.6}/></span><div className="min-w-0"><p className="text-xs text-muted-foreground sm:text-sm">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? '—'}</p></div></div>)}</div>
  <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Módulos da central">{['Contas', 'Vínculos', 'Treinos', 'Configurações'].map(t => <button key={t} className={`shrink-0 border-b-2 px-4 py-3 text-sm transition-colors sm:px-6 ${tab === t ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`} aria-pressed={tab === t} onClick={() => { setTab(t); setSearch(''); setPage(1); if (t === 'Configurações' && data?.config) { setOpen(data.config.cadastro_aberto); setMessage(data.config.mensagem_publica) } }}>{t}</button>)}</nav>
  {tab !== 'Configurações' && <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
   <label className="relative min-w-0 flex-1"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input className={`${input} min-h-11 pl-10`} aria-label="Buscar registros" placeholder="Buscar por nome, e-mail ou título" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label>
   {tab === 'Contas' && <div className="grid grid-cols-2 gap-3 lg:w-auto">
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">Perfil</span><select aria-label="Filtrar por perfil" className={`${input} min-h-11 lg:w-44`} value={profileFilter} onChange={e => { setProfileFilter(e.target.value); setPage(1) }}><option value="">Todos os perfis</option>{['ADMIN','ALUNO','PERSONAL'].map(v => <option key={v}>{v}</option>)}</select></label>
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">Status</span><select aria-label="Filtrar por status" className={`${input} min-h-11 lg:w-44`} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}><option value="">Todos os status</option>{['ATIVO','PENDENTE','BLOQUEADO'].map(v => <option key={v}>{v}</option>)}</select></label>
   </div>}
  </div>}
  {tab === 'Contas' && <section aria-label="Contas da plataforma" className="space-y-4">
   <div className="account-table overflow-hidden rounded-xl border border-border bg-card/30"><table className="w-full text-left text-sm"><thead className="bg-card text-xs text-muted-foreground"><tr>{['Usuário', 'Perfil', 'Status', 'Controle'].map(h => <th key={h} scope="col" className="px-5 py-4 font-medium">{h}</th>)}</tr></thead><tbody>{visibleUsers.map(u => <tr key={u.id} className="border-t border-border transition-colors hover:bg-primary/5">
    <td className="user-cell px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className={`avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${u.tipo === 'ADMIN' ? 'bg-primary/15 text-primary' : u.tipo === 'ALUNO' ? 'bg-info/15 text-info' : 'bg-warning/15 text-warning'}`}>{initials(u.nome)}</span><div className="min-w-0"><p className="font-medium">{u.nome}</p><p className="mt-1 break-all text-xs text-muted-foreground">{u.email}</p></div></div></td>
    <td className="profile-cell px-5 py-4"><span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold ${u.tipo === 'ADMIN' ? 'border-primary/25 bg-primary/10 text-primary' : u.tipo === 'ALUNO' ? 'border-info/25 bg-info/10 text-info' : 'border-warning/25 bg-warning/10 text-warning'}`}>{u.tipo}</span></td>
    <td className="status-cell px-5 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${u.status_conta === 'ATIVO' ? 'bg-success' : u.status_conta === 'PENDENTE' ? 'bg-warning' : 'bg-destructive'}`}/>{u.status_conta === 'ATIVO' ? 'Ativo' : u.status_conta === 'PENDENTE' ? 'Pendente' : u.status_conta === 'BLOQUEADO' ? 'Bloqueado' : u.status_conta}</span></td>
    <td className="action-cell px-5 py-4"><button className={button} aria-label={`Gerenciar ${u.nome}`} disabled={!data?.ready || busy} onClick={() => setSelected({...u})}><Settings2 size={15}/>Gerenciar</button></td>
   </tr>)}</tbody></table>
   {!isLoading && !error && filteredUsers.length === 0 && <div className="p-10 text-center"><Users size={28} className="mx-auto mb-3 text-muted-foreground"/><p className="font-medium">Nenhuma conta encontrada</p><p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou ajuste os filtros.</p>{(search || profileFilter || statusFilter) && <button className={`${button} mt-4`} onClick={() => { setSearch(''); setProfileFilter(''); setStatusFilter(''); setPage(1) }}>Limpar filtros</button>}</div>}
   </div>
   <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p aria-live="polite">{filteredUsers.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredUsers.length)} de ${filteredUsers.length} contas` : '0 contas'}</p><nav aria-label="Paginação de contas" className="flex items-center gap-2"><button className={`${button} !px-3`} aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-medium text-primary">{currentPage} <span className="text-muted-foreground">/ {pageCount}</span></span><button className={`${button} !px-3`} aria-label="Próxima página" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></nav></footer>
  </section>}
  {selected && tab === 'Contas' && <form className="space-y-4 rounded-xl border border-primary/40 bg-card p-5" onSubmit={e => { e.preventDefault(); void act('EDITAR_USUARIO', selected.id, selected) }}><h2 className="font-semibold">Editar {selected.email}</h2><label className="block text-sm">Nome<input required minLength={2} maxLength={120} className={input} value={selected.nome} onChange={e => setSelected({...selected, nome:e.target.value})}/></label><label className="block text-sm">Perfil<select className={input} value={selected.tipo} onChange={e => setSelected({...selected,tipo:e.target.value})}>{['ALUNO','PERSONAL','ADMIN'].map(v => <option key={v}>{v}</option>)}</select></label><label className="block text-sm">Status<select className={input} value={selected.status_conta} onChange={e => setSelected({...selected,status_conta:e.target.value})}>{['ATIVO','PENDENTE','BLOQUEADO'].map(v => <option key={v}>{v}</option>)}</select></label><p className="text-xs text-muted-foreground">Promover a ADMIN concede acesso global. O servidor impede remover seu próprio acesso e alterar perfis com relações existentes.</p><button disabled={busy} className={button}>Confirmar alteração</button> <button type="button" className={button} onClick={() => setSelected(null)}>Cancelar</button></form>}
  {tab === 'Vínculos' && <div className="space-y-4"><form className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3" onSubmit={e => { e.preventDefault(); void act('VINCULAR', aluno, {personal_id:personal}) }}><select required aria-label="Aluno" className={input} value={aluno} onChange={e => setAluno(e.target.value)}><option value="">Escolha o aluno</option>{data?.users.filter(u => u.tipo === 'ALUNO' && u.status_conta === 'ATIVO').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><select required aria-label="Personal" className={input} value={personal} onChange={e => setPersonal(e.target.value)}><option value="">Escolha o personal</option>{personals.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><button className={button} disabled={!data?.ready || busy}>Criar / reativar vínculo</button></form>{data?.bonds.filter(v => `${name(v.aluno_id)} ${name(v.personal_id)}`.toLowerCase().includes(search.toLowerCase())).map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div>{name(v.aluno_id)} → {name(v.personal_id)}<p className="text-xs text-muted-foreground">{v.status}</p></div><button className={button} disabled={!data.ready || busy || v.status !== 'ATIVO'} onClick={() => void act('DESATIVAR_VINCULO',v.id,{})}>Desativar vínculo</button></div>)}</div>}
  {tab === 'Treinos' && <div className="space-y-3">{data?.workouts.filter(t => `${t.titulo} ${name(t.aluno_id)}`.toLowerCase().includes(search.toLowerCase())).map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div>{t.titulo}<p className="text-xs text-muted-foreground">{name(t.aluno_id)} · {name(t.personal_id)} · {t.ativo ? 'Ativo' : 'Arquivado'}</p></div><button className={button} disabled={!data.ready || busy} onClick={() => setWorkout({...t})}>Editar / transferir</button></div>)}{workout && <form className="space-y-3 rounded-xl border border-primary/40 bg-card p-4" onSubmit={e => { e.preventDefault(); void act('EDITAR_TREINO',workout.id,workout) }}><label className="block text-sm">Título<input required minLength={2} maxLength={150} className={input} value={workout.titulo} onChange={e => setWorkout({...workout,titulo:e.target.value})}/></label><label className="block text-sm">Responsável<select className={input} value={workout.personal_id} onChange={e => setWorkout({...workout,personal_id:e.target.value})}>{personals.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={workout.ativo} onChange={e => setWorkout({...workout,ativo:e.target.checked})}/>Treino ativo</label><p className="text-xs text-muted-foreground">Transferências exigem vínculo ativo com o aluno. Séries e histórico são preservados.</p><button disabled={busy} className={button}>Salvar treino</button> <button className={button} type="button" onClick={() => setWorkout(null)}>Cancelar</button></form>}</div>}
  {tab === 'Configurações' && <form className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); void act('CONFIGURAR',null,{cadastro_aberto:open,mensagem_publica:message}) }}><h2 className="font-semibold">Controle de cadastros</h2><label className="flex gap-3"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)}/>Permitir novas contas</label><p className="text-sm text-muted-foreground">O bloqueio é aplicado no banco, inclusive para cadastros feitos diretamente pela API de autenticação.</p><label className="block text-sm">Nota administrativa<textarea maxLength={500} className={input} value={message} onChange={e => setMessage(e.target.value)}/></label><button className={button} disabled={!data?.ready || busy}>Salvar configuração</button></form>}
 <style jsx>{`
  .control-heading { display: grid; grid-template-columns: minmax(0, 1fr) clamp(180px, 22vw, 290px); align-items: center; gap: 12px 24px; }
  .control-heading-copy { position: relative; z-index: 1; }
  .control-heading-art { color: hsl(var(--primary)); pointer-events: none; width: 100%; max-width: 290px; justify-self: end; }
  .control-heading-art :global(svg) { display: block; width: 100%; height: auto; }
  :global(.dark) .control-heading-art :global(svg) { filter: drop-shadow(0 0 7px hsl(var(--primary) / 0.28)); }
  .control-export { justify-self: start; }
  @media (min-width: 1280px) { .control-heading { grid-template-columns: minmax(0, 1fr) clamp(220px, 20vw, 290px) auto; } .control-export { justify-self: end; } }
  @media (max-width: 639px) { .control-heading { grid-template-columns: minmax(0, 1fr) 120px; gap: 4px 8px; } .control-heading-copy { grid-column: 1 / -1; } .control-heading-art { grid-column: 2; grid-row: 2; width: 120px; } .control-export { grid-column: 1; grid-row: 2; padding: 10px 12px; font-size: 12px; } }

  @media (max-width: 767px) {
   .account-table table, .account-table tbody { display: block; }
   .account-table thead { display: none; }
   .account-table tr { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 16px; }
   .account-table tr:first-child { border-top: 0; }
   .account-table td { display: block; padding: 0; min-width: 0; }
   .account-table .user-cell { grid-column: 1 / -1; }
   .account-table .profile-cell { align-self: center; }
   .account-table .status-cell { justify-self: end; align-self: center; }
   .account-table .action-cell { grid-column: 1 / -1; }
   .account-table .action-cell button { width: 100%; }
  }
  @media (max-width: 380px) {
   .control-center .avatar { display: none; }
  }
 `}</style>
 </div>
}
