 'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Shield, Download, Search } from 'lucide-react'
type User = { id: string; nome: string; email: string; tipo: string; status_conta: string }
type Workout = { id: string; titulo: string; aluno_id: string; personal_id: string; ativo: boolean }
type Bond = { id: string; aluno_id: string; personal_id: string; status: string }
const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
const button = 'rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-primary disabled:opacity-40'
export default function ControlPage() {
 const cache = useQueryClient()
 const [tab, setTab] = useState('Contas')
 const [search, setSearch] = useState('')
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
 return <div className="space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-primary"><Shield size={15}/> Administração global</p><h1 className="text-3xl font-semibold">Central de controle</h1><p className="mt-2 text-sm text-muted-foreground">Contas, relações e treinos. Cada mudança fica registrada.</p></div><button className={button} disabled={!data} onClick={exportData}><Download className="mr-2 inline" size={16}/>Exportar dados carregados</button></header>
  {isLoading && <p role="status">Carregando a plataforma…</p>}
  {error && <p role="alert" className="rounded-xl border border-destructive p-4">{error.message}</p>}
  {data && !data.ready && <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm"><strong>Configuração do banco necessária.</strong><p className="mt-1">Os controles aguardam a migração 0013_admin_control_center.sql no Supabase. As consultas continuam disponíveis.</p><p className="mt-1 text-muted-foreground">{data.configError}</p></div>}
  {feedback && <p role="status" className="rounded-xl border border-primary/40 p-4 text-sm">{feedback}</p>}
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Contas', data?.users.length], ['Personais', personals.length], ['Vínculos ativos', data?.bonds.filter(v => v.status === 'ATIVO').length], ['Treinos ativos', data?.workouts.filter(t => t.ativo).length]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value ?? '—'}</p></div>)}</div>
  <nav className="flex flex-wrap gap-2" aria-label="Módulos da central">{['Contas', 'Vínculos', 'Treinos', 'Configurações'].map(t => <button key={t} className={button} aria-pressed={tab === t} onClick={() => { setTab(t); setSearch(''); if (t === 'Configurações' && data?.config) { setOpen(data.config.cadastro_aberto); setMessage(data.config.mensagem_publica) } }} style={{ borderColor: tab === t ? 'hsl(var(--primary))' : undefined }}>{t}</button>)}</nav>
  {tab !== 'Configurações' && <label className="flex items-center gap-2"><Search size={18}/><input className={input} aria-label="Buscar registros" placeholder="Buscar por nome, e-mail ou título" value={search} onChange={e => setSearch(e.target.value)}/></label>}
  {tab === 'Contas' && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-card text-muted-foreground"><tr>{['Usuário', 'Perfil', 'Status', 'Controle'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{data?.users.filter(u => `${u.nome} ${u.email}`.toLowerCase().includes(search.toLowerCase())).map(u => <tr key={u.id} className="border-t border-border"><td className="p-4">{u.nome}<p className="text-xs text-muted-foreground">{u.email}</p></td><td className="p-4">{u.tipo}</td><td className="p-4">{u.status_conta}</td><td className="p-4"><button className={button} disabled={!data.ready || busy} onClick={() => setSelected({...u})}>Gerenciar</button></td></tr>)}</tbody></table></div>}
  {selected && tab === 'Contas' && <form className="space-y-4 rounded-xl border border-primary/40 bg-card p-5" onSubmit={e => { e.preventDefault(); void act('EDITAR_USUARIO', selected.id, selected) }}><h2 className="font-semibold">Editar {selected.email}</h2><label className="block text-sm">Nome<input required minLength={2} maxLength={120} className={input} value={selected.nome} onChange={e => setSelected({...selected, nome:e.target.value})}/></label><label className="block text-sm">Perfil<select className={input} value={selected.tipo} onChange={e => setSelected({...selected,tipo:e.target.value})}>{['ALUNO','PERSONAL','ADMIN'].map(v => <option key={v}>{v}</option>)}</select></label><label className="block text-sm">Status<select className={input} value={selected.status_conta} onChange={e => setSelected({...selected,status_conta:e.target.value})}>{['ATIVO','PENDENTE','BLOQUEADO'].map(v => <option key={v}>{v}</option>)}</select></label><p className="text-xs text-muted-foreground">Promover a ADMIN concede acesso global. O servidor impede remover seu próprio acesso e alterar perfis com relações existentes.</p><button disabled={busy} className={button}>Confirmar alteração</button> <button type="button" className={button} onClick={() => setSelected(null)}>Cancelar</button></form>}
  {tab === 'Vínculos' && <div className="space-y-4"><form className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3" onSubmit={e => { e.preventDefault(); void act('VINCULAR', aluno, {personal_id:personal}) }}><select required aria-label="Aluno" className={input} value={aluno} onChange={e => setAluno(e.target.value)}><option value="">Escolha o aluno</option>{data?.users.filter(u => u.tipo === 'ALUNO' && u.status_conta === 'ATIVO').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><select required aria-label="Personal" className={input} value={personal} onChange={e => setPersonal(e.target.value)}><option value="">Escolha o personal</option>{personals.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><button className={button} disabled={!data?.ready || busy}>Criar / reativar vínculo</button></form>{data?.bonds.filter(v => `${name(v.aluno_id)} ${name(v.personal_id)}`.toLowerCase().includes(search.toLowerCase())).map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div>{name(v.aluno_id)} → {name(v.personal_id)}<p className="text-xs text-muted-foreground">{v.status}</p></div><button className={button} disabled={!data.ready || busy || v.status !== 'ATIVO'} onClick={() => void act('DESATIVAR_VINCULO',v.id,{})}>Desativar vínculo</button></div>)}</div>}
  {tab === 'Treinos' && <div className="space-y-3">{data?.workouts.filter(t => `${t.titulo} ${name(t.aluno_id)}`.toLowerCase().includes(search.toLowerCase())).map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div>{t.titulo}<p className="text-xs text-muted-foreground">{name(t.aluno_id)} · {name(t.personal_id)} · {t.ativo ? 'Ativo' : 'Arquivado'}</p></div><button className={button} disabled={!data.ready || busy} onClick={() => setWorkout({...t})}>Editar / transferir</button></div>)}{workout && <form className="space-y-3 rounded-xl border border-primary/40 bg-card p-4" onSubmit={e => { e.preventDefault(); void act('EDITAR_TREINO',workout.id,workout) }}><label className="block text-sm">Título<input required minLength={2} maxLength={150} className={input} value={workout.titulo} onChange={e => setWorkout({...workout,titulo:e.target.value})}/></label><label className="block text-sm">Responsável<select className={input} value={workout.personal_id} onChange={e => setWorkout({...workout,personal_id:e.target.value})}>{personals.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={workout.ativo} onChange={e => setWorkout({...workout,ativo:e.target.checked})}/>Treino ativo</label><p className="text-xs text-muted-foreground">Transferências exigem vínculo ativo com o aluno. Séries e histórico são preservados.</p><button disabled={busy} className={button}>Salvar treino</button> <button className={button} type="button" onClick={() => setWorkout(null)}>Cancelar</button></form>}</div>}
  {tab === 'Configurações' && <form className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); void act('CONFIGURAR',null,{cadastro_aberto:open,mensagem_publica:message}) }}><h2 className="font-semibold">Controle de cadastros</h2><label className="flex gap-3"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)}/>Permitir novas contas</label><p className="text-sm text-muted-foreground">O bloqueio é aplicado no banco, inclusive para cadastros feitos diretamente pela API de autenticação.</p><label className="block text-sm">Nota administrativa<textarea maxLength={500} className={input} value={message} onChange={e => setMessage(e.target.value)}/></label><button className={button} disabled={!data?.ready || busy}>Salvar configuração</button></form>}
 </div>
}
