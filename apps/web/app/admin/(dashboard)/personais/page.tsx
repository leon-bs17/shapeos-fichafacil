'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Search, Users, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Eye, X, Calendar, Dumbbell, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarData } from '@/lib/utils'

interface PersonalComAlunos {
  id: string; nome: string; email: string; criado_em: string; total_alunos: number; total_treinos: number
  alunos: { id: string; nome: string; email: string; status: string; vinculo_desde: string }[]
}
type PersonalRecord = { id: string; nome: string; email: string; criado_em: string }
type Vinculo = { aluno_id: string; status: string; criado_em: string }
type PersonalTreino = { id: string; titulo: string; aluno_id: string; ativo: boolean; criado_em: string }
type UserFilterOption = { value: string; label: string }
const SORT_OPTIONS: UserFilterOption[] = [
  { value: 'NOME', label: 'Nome' }, { value: 'ALUNOS', label: 'Mais alunos' },
  { value: 'TREINOS', label: 'Mais treinos' }, { value: 'RECENTES', label: 'Mais recentes' },
]
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : words[0]?.slice(0,2).toUpperCase() || '?'
}
export default function AdminPersonaisPage() {
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('NOME')
  const [pagina, setPagina] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'ALUNOS' | 'TREINOS'>('ALUNOS')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const { data: personais, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-personais'],
    queryFn: async () => {
      const supabase = createClient()

      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome, email, criado_em')
        .eq('tipo', 'PERSONAL')
        .order('criado_em', { ascending: false })

      if (usuariosError) throw usuariosError
      if (!usuarios) return []

      const result: PersonalComAlunos[] = []

      for (const u of usuarios as PersonalRecord[]) {
        const { data: vinculosData, error: vinculosError } = await supabase
          .from('personal_alunos')
          .select('aluno_id, status, criado_em')
          .eq('personal_id', u.id)

        if (vinculosError) throw vinculosError
        const vinculos = (vinculosData ?? []) as Vinculo[]
        const alunoIds = vinculos.map((v) => v.aluno_id)

        let alunos: PersonalComAlunos['alunos'] = []
        if (alunoIds.length > 0) {
          const { data: alunosData, error: alunosError } = await supabase
            .from('usuarios')
            .select('id, nome, email')
            .in('id', alunoIds)

          if (alunosError) throw alunosError
          alunos = ((alunosData ?? []) as PersonalRecord[]).map((a) => {
            const vinculo = vinculos?.find((v) => v.aluno_id === a.id)
            return {
              id: a.id,
              nome: a.nome,
              email: a.email,
              status: vinculo?.status ?? 'ATIVO',
              vinculo_desde: vinculo?.criado_em ?? '',
            }
          })
        }

        const { count: totalTreinos, error: treinosError } = await supabase
          .from('treinos')
          .select('id', { count: 'exact', head: true })
          .eq('personal_id', u.id)

        if (treinosError) throw treinosError
        result.push({
          id: u.id,
          nome: u.nome,
          email: u.email,
          criado_em: u.criado_em,
          total_alunos: alunos.length,
          total_treinos: totalTreinos ?? 0,
          alunos,
        })
      }

      return result
    },
  })

  const selected = personais?.find(personal => personal.id === selectedId)
  const { data: treinos, isLoading: loadingTreinos, error: errorTreinos, refetch: retryTreinos, isFetching: fetchingTreinos } = useQuery({
    queryKey: ['admin-personal-treinos', selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      if (!selectedId) return []
      const supabase = createClient()
      const { data, error } = await supabase.from('treinos')
        .select('id, titulo, aluno_id, ativo, criado_em')
        .eq('personal_id', selectedId).order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as PersonalTreino[]
    },
  })
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const filtrados = (personais ?? []).filter(personal => !termo ||
    personal.nome.toLocaleLowerCase('pt-BR').includes(termo) || personal.email.toLocaleLowerCase('pt-BR').includes(termo))
    .sort((a,b) => {
      const name = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity:'base' })
      if (ordem === 'ALUNOS') return b.total_alunos - a.total_alunos || name
      if (ordem === 'TREINOS') return b.total_treinos - a.total_treinos || name
      if (ordem === 'RECENTES') return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime() || name
      return name
    })
  const total = filtrados.length
  const pages = Math.max(1, Math.ceil(total / 5))
  const current = Math.min(pagina, pages)
  const start = (current - 1) * 5
  const rows = filtrados.slice(start, start + 5)
  useEffect(() => { setPagina(1) }, [busca, ordem])
  useEffect(() => {
    if (!selectedId) return
    const dialog = dialogRef.current
    const focused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; focused?.focus() }
  }, [selectedId])
  useEffect(() => {
    const html = document.documentElement
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Tab') html.setAttribute('data-personals-search-keyboard', 'true') }
    const pointer = () => html.removeAttribute('data-personals-search-keyboard')
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    let previous = html.classList.contains('dark')
    let frame = 0
    let style: HTMLStyleElement | null = null
    const restore = () => { style?.remove(); style = null }
    const observer = new MutationObserver(() => {
      const next = html.classList.contains('dark')
      if (next === previous) return
      previous = next; cancelAnimationFrame(frame); restore()
      style = document.createElement('style')
      style.textContent = '.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace.personals-workspace * { transition:none!important; }'
      document.head.appendChild(style)
      const root = document.querySelector('.personals-workspace')
      if (root) window.getComputedStyle(root).backgroundColor
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(restore) })
    })
    observer.observe(html, { attributes:true, attributeFilter:['class'] })
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame); restore()
      document.removeEventListener('keydown', keyboard, true); document.removeEventListener('pointerdown', pointer, true)
      html.removeAttribute('data-personals-search-keyboard')
    }
  }, [])
  function openDetails(id: string) { setTab('ALUNOS'); setSelectedId(id) }
  const workoutList = (list: PersonalTreino[]) => <ul className="personal-workouts">{list.map(treino => <li key={treino.id}>
    <Dumbbell size={17}/><div><strong>{treino.titulo}</strong>
      <p>{selected?.alunos.find(aluno => aluno.id === treino.aluno_id)?.nome ?? 'Aluno fora dos vínculos atuais'} · {formatarData(treino.criado_em)}</p></div>
    <span className="personal-status" data-active={treino.ativo}>{treino.ativo ? 'Ativo' : 'Inativo'}</span>
  </li>)}</ul>
  return <div className="personals-workspace space-y-5">
      <header className="personals-hero">
        <div className="personals-hero-copy"><p className="eyebrow">Gestão</p>
        <h1>Gestão de <span>personais</span></h1>
        <p className="personals-subtitle">
          Personal trainers e seus respectivos alunos.
        </p></div>
        <PersonalWireframe />
      </header>

      <div className="personals-stats grid grid-cols-3 gap-3">
        <Card className="personals-stat">
          <CardContent className="p-4"><div className="personals-stat-icon"><UserCheck size={20} /></div><div>
            <p className="text-2xl font-bold">{isLoading || error ? '—' : personais?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Personais cadastrados</p>
          </div></CardContent>
        </Card>
        <Card className="personals-stat">
          <CardContent className="p-4"><div className="personals-stat-icon"><Users size={20} /></div><div>
            <p className="text-2xl font-bold">{isLoading || error ? '—' : new Set((personais ?? []).flatMap(p => p.alunos.map(a => a.id))).size}</p>
            <p className="text-xs text-muted-foreground">Total de alunos</p>
          </div></CardContent>
        </Card>
        <Card className="personals-stat">
          <CardContent className="p-4"><div className="personals-stat-icon"><Dumbbell size={20} /></div><div>
            <p className="text-2xl font-bold">{isLoading || error ? '—' : personais?.reduce((acc, p) => acc + p.total_treinos, 0) ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de treinos</p>
          </div></CardContent>
        </Card>
      </div>

    <section className="personals-toolbar" aria-label="Busca e ordenação de personais">
      <div data-admin-search className="personals-search"><Search size={19} aria-hidden="true"/>
        <Input aria-label="Buscar personal por nome ou e-mail" placeholder="Buscar personal por nome ou e-mail..." value={busca} onChange={event => setBusca(event.target.value)} />
      </div><PersonalSort label="Ordenar" value={ordem} onChange={setOrdem} options={SORT_OPTIONS} />
    </section>
    {error ? <section className="personals-message" role="alert"><p>Não foi possível carregar os personais.</p><button type="button" className="personal-button" disabled={isFetching} onClick={() => refetch()}>{isFetching ? 'Carregando...' : 'Tentar novamente'}</button></section> :
      isLoading ? <div role="status" aria-label="Carregando personais" className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-20 rounded-xl skeleton"/>)}</div> :
      !total ? <section className="personals-message"><UserCheck size={32}/><h2>Nenhum personal encontrado</h2><p>{busca ? 'Tente ajustar a busca.' : 'Os personais cadastrados aparecerão aqui.'}</p></section> :
      <section className="personals-table-card">
        <div className="personals-table-heading"><h2>Personais cadastrados</h2><span>{total} {total === 1 ? 'personal' : 'personais'}</span></div>
        <table className="personals-table"><caption className="sr-only">Personais, alunos e treinos cadastrados</caption>
          <colgroup><col className="personal-col-name"/><col className="personal-col-email"/><col className="personal-col-number"/><col className="personal-col-number"/><col className="personal-col-action"/></colgroup>
          <thead><tr>{['Personal','E-mail','Alunos','Treinos','Ações'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{rows.map(personal => <tr key={personal.id}>
            <td data-label="Personal"><div className="personal-person"><span className="personal-table-avatar" aria-hidden="true">{initials(personal.nome)}</span><strong>{personal.nome}</strong></div></td>
            <td data-label="E-mail"><span className="personal-email">{personal.email}</span></td>
            <td data-label="Alunos">{personal.total_alunos}</td><td data-label="Treinos">{personal.total_treinos}</td>
            <td data-label="Ações"><button type="button" className="personal-button" aria-label={'Ver alunos e treinos de ' + personal.nome} onClick={() => openDetails(personal.id)}><Eye size={15}/>Ver</button></td>
          </tr>)}</tbody>
        </table>
        <footer className="personals-pagination"><span>{start + 1}–{Math.min(start + 5,total)} de {total} personais</span><nav aria-label="Paginação dos personais">
          <button type="button" className="personal-button" aria-label="Página anterior" disabled={current === 1} onClick={() => setPagina(current - 1)}><ChevronLeft size={16}/></button>
          <span aria-current="page" className="personal-current">{current}</span>
          <button type="button" className="personal-button" aria-label="Próxima página" disabled={current === pages} onClick={() => setPagina(current + 1)}><ChevronRight size={16}/></button>
        </nav></footer>
      </section>}
    <dialog ref={dialogRef} className="personal-dialog" aria-labelledby={headingId} onCancel={event => { event.preventDefault(); setSelectedId(null) }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSelectedId(null)
    }}>
      {selected && <><header className="personal-dialog-heading"><div><p>Gestão de personais</p><h2 id={headingId}>Detalhes do personal</h2></div><button type="button" autoFocus className="personal-button" aria-label="Fechar detalhes" onClick={() => setSelectedId(null)}><X size={20}/></button></header>
        <section className="personal-profile"><span className="personal-table-avatar" aria-hidden="true">{initials(selected.nome)}</span><div><h3>{selected.nome}</h3><p><Mail size={14}/>{selected.email}</p><p><Calendar size={14}/>Cadastro em {formatarData(selected.criado_em)}</p></div></section>
        <div className="personal-detail-counts"><div><Users size={18}/><span><strong>{selected.total_alunos}</strong> alunos vinculados</span></div><div><Dumbbell size={18}/><span><strong>{selected.total_treinos}</strong> treinos</span></div></div>
        <div className="personal-tabs" role="group" aria-label="Informações do personal"><button type="button" className="personal-button" aria-pressed={tab === 'ALUNOS'} onClick={() => setTab('ALUNOS')}>Alunos</button><button type="button" className="personal-button" aria-pressed={tab === 'TREINOS'} onClick={() => setTab('TREINOS')}>Treinos</button></div>
        <section className="personal-detail-content" aria-label={tab === 'ALUNOS' ? 'Alunos vinculados' : 'Treinos do personal'}>
          {errorTreinos && <div className="personal-query-error" role="alert"><p>Não foi possível consultar os treinos.</p><button type="button" className="personal-button" disabled={fetchingTreinos} onClick={() => retryTreinos()}>{fetchingTreinos ? 'Carregando...' : 'Tentar novamente'}</button></div>}
          {tab === 'ALUNOS' ? selected.alunos.length ? <ul className="personal-students">{selected.alunos.map(aluno => {
            const assigned = (treinos ?? []).filter(treino => treino.aluno_id === aluno.id)
            return <li key={aluno.id}><div className="personal-student-top"><span className="personal-table-avatar" aria-hidden="true">{initials(aluno.nome)}</span><div><h3>{aluno.nome}</h3><p>{aluno.email}</p></div><span className="personal-status" data-active={aluno.status === 'ATIVO'}>{aluno.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</span></div>
              <p className="personal-linked"><Calendar size={14}/>Vínculo desde {aluno.vinculo_desde ? formatarData(aluno.vinculo_desde) : 'não informado'}</p>
              {loadingTreinos ? <p className="personal-empty" role="status">Carregando treinos...</p> : !errorTreinos && (assigned.length ? <details className="personal-student-workouts"><summary>{assigned.length} {assigned.length === 1 ? 'treino vinculado' : 'treinos vinculados'}</summary>{workoutList(assigned)}</details> : <p className="personal-empty">Nenhum treino deste personal para o aluno.</p>)}
            </li>
          })}</ul> : <p className="personal-empty">Nenhum aluno vinculado.</p> :
            loadingTreinos ? <p className="personal-empty" role="status">Carregando treinos...</p> : !errorTreinos && (treinos?.length ? workoutList(treinos) : <p className="personal-empty">Nenhum treino cadastrado.</p>)}
        </section><footer><button type="button" className="personal-button" onClick={() => setSelectedId(null)}>Fechar</button></footer>
      </>}
    </dialog>
    <style jsx global>{`
        .personals-workspace { --personal-surface:#fcfdf9; --personal-border:#d7ded3; --personal-muted:#5f6f68; --personal-ink:#162623; --personal-brand:#129b89; font-family:'Sora',sans-serif; min-width:0; }
        html.dark .personals-workspace { --personal-surface:#091c18; --personal-border:#1c4037; --personal-muted:#A3BECD; --personal-ink:#F5FAF9; --personal-brand:#00E9DF; }
        .personals-workspace .personals-hero { position:relative; isolation:isolate; overflow:hidden; border:1px solid var(--personal-border); border-radius:18px; min-height:224px; padding:32px 40px; background:radial-gradient(ellipse at 90% 50%,#e4f3eb,transparent 65%),#fcfdf9; }
        html.dark .personals-workspace .personals-hero { background:radial-gradient(ellipse at 84% 60%,#073d32,#071d18 48%,#041512); }
        .personals-workspace .personals-hero-copy { position:relative; z-index:1; max-width:70%; }
        .personals-workspace .eyebrow { display:inline-flex; border:1px solid var(--personal-brand); border-radius:999px; padding:6px 16px; margin-bottom:17px; color:var(--personal-brand); font-size:10px; font-weight:650; letter-spacing:.1em; text-transform:uppercase; }
        .personals-workspace .personals-hero h1 { color:var(--personal-ink); font-size:46px; font-weight:800; line-height:1.12; letter-spacing:-.045em; }
        .personals-workspace .personals-hero h1 span { color:var(--personal-brand); }
        .personals-workspace .personals-subtitle { color:var(--personal-muted)!important; -webkit-text-fill-color:currentColor; font-size:16px; font-weight:400; line-height:1.6; margin-top:13px; }
        .personals-workspace .personal-wireframe { position:absolute; right:-12px; top:50%; transform:translateY(-50%); width:37%; max-width:470px; height:auto; color:var(--personal-brand); pointer-events:none; }
        .personals-workspace .personals-stat { border:1px solid var(--personal-border); border-radius:14px; background:var(--personal-surface); box-shadow:none; }
        .personals-workspace .personals-stat > div { display:flex; align-items:center; gap:14px; padding:19px 20px; }
        .personals-workspace .personals-stat-icon { width:42px; height:42px; display:grid; place-items:center; flex-shrink:0; border-radius:12px; color:var(--personal-brand); background:rgba(0,141,133,.1); }
        .personals-workspace .personals-stat p:first-child { color:var(--personal-ink); font-size:26px; font-weight:750; }
        .personals-workspace .personals-stat p:last-child { color:var(--personal-muted); line-height:1.5; }

      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace { color:var(--personal-ink); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 230px; align-items:start; gap:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-search { border-radius:13px!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-search:focus-within { border-color:var(--personal-border)!important; outline:none!important; box-shadow:none!important; }
      html:is(.light,.dark)[data-personals-search-keyboard="true"] [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-search:has(input:focus-visible) { outline:2px solid var(--personal-brand)!important; outline-offset:3px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort { position:relative; min-width:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-trigger, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-button { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:44px; padding:0 14px; border:1px solid var(--personal-border); border-radius:13px; background:var(--personal-surface); color:var(--personal-ink); font-size:12px; cursor:pointer; transition:background-color 150ms ease,border-color 150ms ease!important; box-shadow:none; transform:none; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-trigger { display:flex; width:100%; height:48px; justify-content:space-between; color:var(--personal-muted); font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-trigger strong { color:var(--personal-ink); font-weight:600; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-trigger svg, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-button svg { color:inherit; flex-shrink:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-menu { position:absolute; z-index:40; top:calc(100% + 8px); right:0; width:260px; max-width:calc(100vw - 32px); overflow-y:auto; padding:6px; background:var(--personal-surface); color:var(--personal-ink); border:1px solid var(--personal-border); border-radius:13px; box-shadow:0 8px 24px rgba(0,0,0,.12); outline:none; overscroll-behavior:contain; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-menu[data-above="true"] { top:auto; bottom:calc(100% + 8px); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-option { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:44px; padding:8px 10px; border:1px solid transparent; border-radius:13px; font-size:13px; cursor:pointer; transition:background-color 150ms ease,border-color 150ms ease; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-option + .personal-sort-option { margin-top:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-option[aria-selected="true"], html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-tabs [aria-pressed="true"] { background:color-mix(in srgb,var(--personal-brand) 7%,transparent); color:var(--personal-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-menu:focus .personal-sort-option[data-active="true"] { border-color:color-mix(in srgb,var(--personal-brand) 40%,transparent); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace button:focus-visible, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace summary:focus-visible { outline:2px solid var(--personal-brand); outline-offset:3px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace button:disabled { opacity:.4; cursor:default; }
      @media(hover:hover) and (pointer:fine) {
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-search:hover, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-search:focus-within:hover,
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace :is(.personal-sort-trigger,.personal-button):hover:enabled, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-option:hover,
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-workouts summary:hover { background:color-mix(in srgb,var(--personal-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--personal-brand) 40%,transparent)!important; }
      }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table-card { border:1px solid var(--personal-border); border-radius:14px; overflow:hidden; background:var(--personal-surface); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:18px 20px; border-bottom:1px solid var(--personal-border); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace h2 { font-size:15px; font-weight:650; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table-heading span { color:var(--personal-muted); font-size:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table { width:100%; table-layout:fixed; border-collapse:collapse; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-col-name { width:29%; } html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-col-email { width:37%; } html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-col-number { width:10%; } html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-col-action { width:14%; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table th { padding:14px 18px; font-size:10px; text-align:left; text-transform:uppercase; letter-spacing:.05em; font-weight:650; color:var(--personal-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td { border-top:1px solid var(--personal-border); padding:14px 18px; vertical-align:middle; font-size:12px; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table th:nth-child(3), html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table th:nth-child(4), html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:nth-child(3), html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:nth-child(4) { text-align:right; font-variant-numeric:tabular-nums; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table th:last-child, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:last-child { text-align:center; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:last-child .personal-button { min-height:36px; min-width:78px; padding:0 12px; white-space:nowrap; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-person { display:flex; align-items:center; gap:12px; min-width:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-person strong { font-weight:650; line-height:1.5; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-table-avatar { display:grid; place-items:center; width:36px; height:36px; flex-shrink:0; border-radius:50%; background:linear-gradient(145deg,#6f86b6,#4f678f); color:#fff; font-size:12px; font-weight:700; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-email { color:var(--personal-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-pagination { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:16px 20px; border-top:1px solid var(--personal-border); font-size:12px; color:var(--personal-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-pagination nav { display:flex; align-items:center; gap:6px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-pagination .personal-button { width:36px; min-height:36px; padding:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-current { display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:var(--personal-brand); color:#fff; }
      html.dark [data-admin-route="/admin/personais"] .personals-workspace .personal-current { color:#002a26; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-message { display:grid; justify-items:center; gap:12px; padding:36px 20px; text-align:center; border:1px solid var(--personal-border); border-radius:13px; background:var(--personal-surface); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-message p { color:var(--personal-muted); font-size:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog { width:min(720px,calc(100vw - 32px)); padding:24px; border:1px solid var(--personal-border); border-radius:18px; background:var(--personal-surface); color:var(--personal-ink); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog-heading p { color:var(--personal-muted); text-transform:uppercase; letter-spacing:.06em; font-size:10px; margin-bottom:4px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog-heading h2 { font-size:22px; font-weight:700; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog-heading .personal-button { width:44px; padding:0; flex-shrink:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile { display:flex; align-items:center; gap:18px; padding:18px; border:1px solid var(--personal-border); border-radius:13px; margin-top:20px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile .personal-table-avatar { width:60px; height:60px; font-size:20px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile > div { min-width:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile h3 { font-size:18px; font-weight:700; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile p { display:flex; align-items:center; gap:6px; margin-top:5px; color:var(--personal-muted); font-size:12px; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile p svg { flex-shrink:0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-detail-counts { display:flex; flex-wrap:wrap; gap:12px 24px; padding:18px 0; font-size:12px; color:var(--personal-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-detail-counts > div { display:flex; align-items:center; gap:9px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-detail-counts svg { color:var(--personal-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-detail-counts strong { color:var(--personal-ink); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-tabs { display:flex; gap:8px; padding-bottom:18px; border-bottom:1px solid var(--personal-border); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-tabs button { min-width:100px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-detail-content { margin-top:18px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-students { display:grid; gap:12px; list-style:none; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-students > li { padding:16px; border:1px solid var(--personal-border); border-radius:13px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-top { display:flex; align-items:center; gap:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-top > div { min-width:0; flex:1; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-top h3 { font-size:14px; font-weight:650; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-top p { color:var(--personal-muted); font-size:11px; overflow-wrap:anywhere; margin-top:3px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-status { display:inline-flex; flex-shrink:0; padding:6px 10px; border-radius:999px; font-size:10px; color:var(--personal-muted); background:color-mix(in srgb,var(--personal-muted) 7%,transparent); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-status[data-active="true"] { background:#e4f3eb; color:#0d7e70; }
      html.dark [data-admin-route="/admin/personais"] .personals-workspace .personal-status[data-active="true"] { background:#123b31; color:#00e9df; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-linked { display:flex; align-items:center; gap:7px; color:var(--personal-muted); font-size:11px; margin-top:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-workouts { margin-top:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-workouts summary { padding:10px 12px; border:1px solid var(--personal-border); border-radius:13px; font-size:12px; cursor:pointer; transition:background-color 150ms ease,border-color 150ms ease!important; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts { list-style:none; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts li { display:flex; align-items:center; gap:12px; padding:14px 0; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts li + li { border-top:1px solid var(--personal-border); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts li > svg { flex-shrink:0; color:var(--personal-brand); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts li > div { min-width:0; flex:1; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts strong { font-size:13px; font-weight:650; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-workouts p { color:var(--personal-muted); font-size:11px; line-height:1.6; margin-top:3px; overflow-wrap:anywhere; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-empty { color:var(--personal-muted); font-size:12px; line-height:1.6; margin-top:12px; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-query-error { display:grid; gap:10px; padding:14px; border:1px solid var(--personal-border); border-radius:13px; margin-bottom:16px; font-size:12px; color:var(--personal-muted); }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-query-error button { justify-self:start; }
      html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog footer { display:flex; justify-content:flex-end; margin-top:20px; padding-top:16px; border-top:1px solid var(--personal-border); }
      @media(min-width:768px) and (max-width:1199px) {
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table th, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td { padding-left:10px; padding-right:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-person { gap:8px; }
      }
      @media(max-width:767px) {
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-hero { min-height:220px; padding:27px 22px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-hero-copy { max-width:100%; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-hero h1 { font-size:32px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-subtitle { font-size:14px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-wireframe { width:290px; right:-120px; opacity:.16; z-index:-1; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stat:last-child { grid-column:1/-1; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stat > div { padding:16px; gap:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stat-icon { width:34px; height:34px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stat p:first-child { font-size:22px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stat p:last-child { font-size:11px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-toolbar { grid-template-columns:minmax(0,1fr); }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-trigger, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-option { font-size:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-sort-menu { width:100%; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table tbody { display:block; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table colgroup, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table thead { display:none; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table tr { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px 14px; padding:18px 16px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table tr + tr { border-top:1px solid var(--personal-border); }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td { display:block; padding:0; border:0; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td[data-label="Personal"], html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td[data-label="E-mail"], html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td[data-label="Ações"] { grid-column:1/-1; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:nth-child(3), html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:nth-child(4), html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:last-child { text-align:left; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td[data-label="Alunos"]::before, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td[data-label="Treinos"]::before { content:attr(data-label); display:block; margin-bottom:5px; color:var(--personal-muted); font-size:10px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table td:last-child .personal-button { width:100%; min-height:44px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-table-heading, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-pagination { padding:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-pagination .personal-button, html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-current { width:44px; height:44px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog { width:calc(100vw - 24px); padding:20px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-dialog-heading h2 { font-size:20px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile { padding:16px; gap:12px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile .personal-table-avatar { width:48px; height:48px; font-size:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile h3 { font-size:16px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-profile p { font-size:11px; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-top { flex-wrap:wrap; }
        html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personal-student-top .personal-status { margin-left:48px; }
      }
      @media(max-width:359px) { html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace .personals-stats { grid-template-columns:minmax(0,1fr); } }
      @media(prefers-reduced-motion:reduce) { html:is(.light,.dark) [data-admin-route="/admin/personais"] [data-admin-content] .personals-workspace.personals-workspace :is(.personals-search,.personal-sort-trigger,.personal-sort-option,.personal-button,.personal-student-workouts summary) { transition:none!important; } }
    `}</style>
  </div>
}
function PersonalSort({ label: fieldLabel, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: UserFilterOption[]
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [above, setAbove] = useState(false)
  const [menuHeight, setMenuHeight] = useState(260)
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
        const top = rect.top - 16
        const showAbove = below < 220 && top > below
        setAbove(showAbove)
        setMenuHeight(Math.max(80, Math.min(260, showAbove ? top : below)))
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
  }, [open])

  useEffect(() => { if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" }) }, [open, active])

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div ref={rootRef} className="personal-sort" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="personal-sort-trigger"
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
    {open && <div ref={listRef} id={id} role="listbox" tabIndex={-1} className="personal-sort-menu"
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
        className="personal-sort-option"
        onPointerDown={(event) => event.preventDefault()}
        onPointerMove={() => setActive(index)}
        onClick={() => choose(index)}>
        <span>{label}</span>
        {value === optionValue && <Check size={17} strokeWidth={2} />}
      </div>)}
    </div>}
  </div>
}



function PersonalWireframe() {
  const curve = (offset: number) => Array.from({ length: 65 }, (_, i) => {
    const x = 12 + i * 7
    const wave = Math.sin(i / 64 * Math.PI * 2.5 + offset)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(120 + wave * 63).toFixed(1)}`
  }).join(' ')
  return (
    <svg className="personal-wireframe" viewBox="0 0 480 240" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth=".7" opacity=".27">
        {Array.from({ length: 20 }, (_, i) => <path key={i} d={curve(i * .075)} />)}
        {Array.from({ length: 25 }, (_, i) => {
          const x = 12 + i * 18
          const phase = i / 25 * Math.PI * 2.5
          return <path key={i} d={`M${x} ${120 + Math.sin(phase) * 63}Q${x + 8} 120 ${x} ${120 + Math.sin(phase + 1.425) * 63}`} />
        })}
      </g>
      <path d={curve(0)} stroke="currentColor" strokeWidth="1" opacity=".55" />
      <path d={curve(1.425)} stroke="currentColor" strokeWidth="1" opacity=".45" />
      {[{x:40,y:150},{x:110,y:62},{x:204,y:125},{x:295,y:169},{x:397,y:85}].map((p,i) => (
        <g key={i}><circle cx={p.x} cy={p.y} r="7" fill="var(--personal-surface)" stroke="currentColor" strokeOpacity=".5" /><circle cx={p.x} cy={p.y} r="3" fill="currentColor" opacity=".65" /></g>
      ))}
    </svg>
  )
}

