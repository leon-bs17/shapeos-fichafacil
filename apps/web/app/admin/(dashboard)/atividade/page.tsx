'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Activity, CircleCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, FileText, RefreshCw, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react'

type Usuario = { id: string; nome: string; email: string; tipo: string; criado_em: string }
type Auditoria = { id: string; acao: string; detalhes: Record<string, unknown>; criado_em: string }
type Evento = { id: string; tipo: 'cadastro' | 'admin'; titulo: string; descricao: string; data: string }
type Filtro = 'todos' | 'cadastro' | 'admin'
const POR_PAGINA = 6
const texto = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const formatarData = (v: string) => new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
function iniciais(v: string) { return v.split(' · ')[0].trim().split(/\s+/).slice(0,2).map(p => p[0]).join('').toUpperCase() || 'AD' }

export default function AdminAtividadePage() {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [periodo, setPeriodo] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [selecionado, setSelecionado] = useState<Evento | null>(null)
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['admin-atividade'],
    queryFn: async () => {
      const supabase = createClient()
      const [usuariosR, auditoriaR] = await Promise.all([
        supabase.from('usuarios').select('id, nome, email, tipo, criado_em').order('criado_em', { ascending: false }).limit(30),
        supabase.from('admin_auditoria').select('id, acao, detalhes, criado_em').order('criado_em', { ascending: false }).limit(30),
      ])
      if (usuariosR.error) throw usuariosR.error
      if (auditoriaR.error) throw auditoriaR.error

      const usuarios = (usuariosR.data ?? []) as Usuario[]
      const auditoria = (auditoriaR.data ?? []) as Auditoria[]

      const eventos: Evento[] = [
        ...usuarios.map((u) => ({
          id: `u-${u.id}`,
          tipo: 'cadastro' as const,
          titulo: `Novo ${u.tipo.toLowerCase()} cadastrado`,
          descricao: `${u.nome} · ${u.email}`,
          data: u.criado_em,
        })),
        ...auditoria.map((a) => ({
          id: `a-${a.id}`,
          tipo: 'admin' as const,
          titulo: a.acao.replaceAll('_', ' '),
          descricao: String(a.detalhes?.nome ?? a.detalhes?.email ?? 'Ação administrativa registrada'),
          data: a.criado_em,
        })),
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 40)

      const agora = Date.now()
      const umDia = 24 * 60 * 60 * 1000
      const seteDias = 7 * umDia
      return {
        eventos,
        cadastros24h: usuarios.filter((u) => agora - new Date(u.criado_em).getTime() <= umDia).length,
        cadastros7d: usuarios.filter((u) => agora - new Date(u.criado_em).getTime() <= seteDias).length,
        acoesAdmin: auditoria.length,
      }
    },
  })

  useEffect(() => { setPagina(1) }, [busca, filtro, periodo])
  useEffect(() => {
    const fechar = (event: KeyboardEvent) => { if(event.key === 'Escape') setSelecionado(null) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [])
  const eventos = useMemo(() => (data?.eventos ?? []).filter(e => {
    if (filtro !== 'todos' && e.tipo !== filtro) return false
    if (periodo === 'hoje' && new Date(e.data).toLocaleDateString('pt-BR', { timeZone:'America/Fortaleza' }) !== new Date().toLocaleDateString('pt-BR', { timeZone:'America/Fortaleza' })) return false
    if (periodo === '7dias' && Date.now() - new Date(e.data).getTime() > 7*86400000) return false
    return texto(e.descricao + ' ' + e.titulo).includes(texto(busca.trim()))
  }), [data, busca, filtro, periodo])
  const paginas = Math.max(1, Math.ceil(eventos.length / POR_PAGINA))
  const atual = Math.min(pagina, paginas)
  const inicio = (atual - 1) * POR_PAGINA

  return (
    <div className="activity-workspace">
      <section className="activity-hero">
        <div className="hero-copy">
          <p className="eyebrow"><Activity size={15} /> Monitoramento</p>
          <h1>Atividade da <span>plataforma</span></h1>
          <p>Acompanhe cadastros e ações recentes em um só lugar.</p>
        </div>
        <svg className="wireframe" viewBox="0 0 520 320" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth=".65">
            {Array.from({length:26}, (_, i) => <ellipse key={'a'+i} cx="275" cy="175" rx={100+i*3.6} ry={145-i*2.8} transform={`rotate(${i*7} 275 175)`} />)}
            {Array.from({length:16}, (_, i) => <ellipse key={'b'+i} cx="275" cy="175" rx="235" ry={30+i*3} transform={`rotate(-25 275 175)`} />)}
          </g>
        </svg>
      </section>

      <div className="metrics">
        {([
          ['Cadastros 24h', data?.cadastros24h, UserPlus],
          ['Cadastros 7 dias', data?.cadastros7d, Users],
          ['Ações administrativas', data?.acoesAdmin, FileText],
        ] as const).map(([label, value, Icon]) => (
          <section className="metric" key={label}>
            <div className="metric-icon"><Icon size={27} strokeWidth={1.7} /></div>
            <div><p>{label}</p><strong>{isLoading ? '—' : value ?? 0}</strong></div>
          </section>
        ))}
      </div>

      <section className="toolbar" aria-label="Busca e filtros de atividade">
        <label data-admin-search className="search"><Search size={19} />
          <input aria-label="Buscar usuário ou ação" placeholder="Buscar usuário ou ação..." value={busca} onChange={e => setBusca(e.target.value)} />
          {busca && <button aria-label="Limpar busca" onClick={() => setBusca('')}><X size={16} /></button>}
        </label>
        <div className="segments" aria-label="Tipo de evento">
          {([['todos','Todos'],['cadastro','Cadastros'],['admin','Ações admin.']] as const).map(([value,label]) => <button key={value} aria-pressed={filtro === value} onClick={() => setFiltro(value)}>{label}</button>)}
        </div>
        <label className="period"><CalendarDays size={17} /><select aria-label="Filtrar período" value={periodo} onChange={e => setPeriodo(e.target.value)}><option value="todos">Todo período</option><option value="hoje">Hoje</option><option value="7dias">Últimos 7 dias</option></select></label>
        <button className="refresh" aria-label="Atualizar atividade" title="Atualizar atividade" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} /></button>
      </section>

      {error ? <div className="empty" role="alert">Não foi possível carregar a atividade. <button onClick={() => refetch()}>Tentar novamente</button></div> : isLoading ? <div className="empty" role="status">Carregando atividade...</div> : (
        <section className="events">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Usuário / referência</th><th>Ação</th><th>Data e hora</th><th>Status</th><th>Detalhes</th></tr></thead>
              <tbody>{eventos.slice(inicio,inicio+POR_PAGINA).map(e => (
                <tr key={e.id}>
                  <td><div className="identity"><span className="avatar">{iniciais(e.descricao)}</span><span title={e.descricao}>{e.descricao.split(' · ')[0]}</span></div></td>
                  <td><div className="action">{e.tipo === 'cadastro' ? <UserPlus size={19} /> : <ShieldCheck size={19} />}<span>{e.titulo.toLowerCase()}</span></div></td>
                  <td className="date">{formatarData(e.data)}</td>
                  <td><span className="status"><CircleCheck size={15} aria-hidden="true" />Registrado</span></td>
                  <td><button className="detail" aria-label={`Ver detalhes: ${e.titulo}`} onClick={() => setSelecionado(e)}><Eye size={16} aria-hidden="true" /><span>Ver</span></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!eventos.length && <div className="empty"><Clock3 size={28} /><p>Nenhuma atividade encontrada.</p>{(busca || filtro !== 'todos' || periodo !== 'todos') && <button onClick={() => {setBusca('');setFiltro('todos');setPeriodo('todos')}}>Limpar filtros</button>}</div>}
          <footer>
            <span aria-live="polite">{eventos.length ? inicio+1 : 0}–{Math.min(inicio+POR_PAGINA,eventos.length)} de {eventos.length} eventos</span>
            <nav aria-label="Paginação da atividade">
              <button aria-label="Página anterior" disabled={atual===1} onClick={() => setPagina(atual-1)}><ChevronLeft size={17} /></button>
              {Array.from({length:paginas}, (_,i)=>i+1).map(n=><button key={n} aria-label={`Página ${n}`} aria-current={atual===n ? 'page' : undefined} onClick={()=>setPagina(n)}>{n}</button>)}
              <button aria-label="Próxima página" disabled={atual===paginas} onClick={() => setPagina(atual+1)}><ChevronRight size={17} /></button>
            </nav>
          </footer>
        </section>
      )}
      <p className="scope-note">Resumo dos últimos cadastros e registros administrativos disponíveis.</p>
      {selecionado && <div className="overlay" onMouseDown={() => setSelecionado(null)}>
        <section className="dialog" role="dialog" aria-modal="true" aria-label="Detalhes da atividade" onMouseDown={e => e.stopPropagation()}>
          <div className="dialog-heading"><h2>Detalhes da atividade</h2><button autoFocus aria-label="Fechar detalhes" onClick={() => setSelecionado(null)}><X size={20} /></button></div>
          <dl><dt>Referência</dt><dd>{selecionado.descricao}</dd><dt>Ação</dt><dd className="capitalize">{selecionado.titulo.toLowerCase()}</dd><dt>Data e hora</dt><dd>{formatarData(selecionado.data)}</dd><dt>Origem</dt><dd>{selecionado.tipo === 'cadastro' ? 'Cadastro de usuário' : 'Auditoria administrativa'}</dd></dl>
        </section>
      </div>}
      <style jsx>{`
        .activity-workspace { --surface:#fcfdf9; --border:#d7ded3; --muted:#5f6f68; --accent:#129b89; --text:#162623; display:grid; gap:20px; padding-bottom:24px; }
        :global(.dark) .activity-workspace { --surface:#091c18; --border:#1c4037; --muted:#a3becd; --accent:#00e9df; --text:#f5faf9; }
        :global(.dark [data-admin-route="/admin/atividade"]) { background:#041512!important; --shapeos-brand:#00e9df; }
        .activity-hero { position:relative; isolation:isolate; overflow:hidden; min-height:224px; display:flex; align-items:center; padding:35px 40px; border:1px solid var(--border); border-radius:17px; background:var(--surface); }
        :global(.dark) .activity-hero { background:radial-gradient(ellipse at 84% 60%,#073d32 0%,#071d18 43%,#041512 100%); }
        .hero-copy { position:relative; z-index:2; max-width:70%; }
        .eyebrow { display:flex; gap:8px; align-items:center; text-transform:uppercase; letter-spacing:.18em; font-size:11px!important; font-weight:700; color:var(--accent)!important; margin-bottom:14px; }
        h1 { font-size:clamp(28px,3.1vw,46px); line-height:1.12; letter-spacing:-.045em; font-weight:800; color:var(--text); }
        h1 span { color:var(--accent); }
        .hero-copy>p:last-child { color:var(--muted); font-size:16px; line-height:1.6; margin-top:13px; }
        .wireframe { position:absolute; z-index:1; width:360px; height:auto; aspect-ratio:520 / 320; top:50%; right:40px; transform:translateY(-50%); color:var(--accent); opacity:.4; pointer-events:none; }
        .metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .metric { display:flex; align-items:center; gap:20px; background:var(--surface); border:1px solid var(--border); border-radius:15px; padding:19px; min-height:102px; }
        .metric-icon { display:grid; place-items:center; width:60px; height:60px; flex-shrink:0; color:var(--accent); background:color-mix(in srgb,var(--accent) 9%,transparent); border-radius:13px; }
        .metric p { font-size:13px; color:var(--muted); margin-bottom:2px; }
        .metric strong { font-size:30px; line-height:1.15; color:var(--text); letter-spacing:-.04em; }
        .toolbar { display:flex; align-items:center; gap:15px; }
        .search,.period { display:flex; align-items:center; height:48px; gap:13px; color:var(--muted); border:1px solid var(--border); background:var(--surface); border-radius:11px; padding:0 16px; }
        .search { flex:1; min-width:160px; }
        .search input { width:100%; min-width:0; outline:none; color:var(--text); font-size:13px; background:transparent; }
        .search input::placeholder { color:var(--muted); }
        .search:focus-within { border-color:var(--accent); }
        button { cursor:pointer; }
        button:disabled { cursor:default; opacity:.35; }
        button:focus-visible,select:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
        .segments { display:flex; border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .segments button { height:47px; padding:0 19px; color:var(--text); font-size:13px; border-right:1px solid var(--border); }
        .segments button:last-child { border-right:0; }
        .segments button[aria-pressed="true"] { background:var(--accent); color:#002a26; }
        .period select { max-width:145px; background:transparent; color:var(--text); outline:none; font-size:13px; }
        .period option { background:var(--surface); color:var(--text); }
        .refresh { display:grid; place-items:center; height:48px; width:42px; color:var(--muted); border:1px solid var(--border); border-radius:11px; }
        .events { background:var(--surface); border:1px solid var(--border); border-radius:17px; overflow:hidden; }
        .table-scroll { overflow-x:auto; }
        table { width:100%; min-width:790px; border-collapse:collapse; text-align:left; table-layout:fixed; }
        th { padding:15px 20px; font-size:10px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); font-weight:600; }
        th:nth-child(1) { width:25%; } th:nth-child(2) { width:30%; } th:nth-child(3) { width:20%; } th:nth-child(4) { width:15%; } th:nth-child(5) { width:10%; text-align:center; }
        td { padding:8px 20px; border-top:1px solid var(--border); color:var(--text); font-size:12px; height:57px; }
        .identity,.action { display:flex; align-items:center; gap:14px; min-width:0; }
        .identity>span:last-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .avatar { display:grid; place-items:center; flex-shrink:0; width:39px; height:39px; border-radius:50%; background:linear-gradient(145deg,#009bf0,#0073c8); color:white; font-size:12px; font-weight:600; }
        .action { gap:14px; } .action> :global(svg) { color:var(--accent); flex-shrink:0; } .action>span { text-transform:capitalize; }
        .date { color:var(--muted); font-size:11px; }
        .status { display:inline-flex; align-items:center; gap:7px; color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 35%,transparent); background:color-mix(in srgb,var(--accent) 6%,transparent); border-radius:12px; padding:7px 10px; font-size:10px; }
        .status>span { height:6px; width:6px; border-radius:50%; background:var(--accent); }
        .detail { display:grid; place-items:center; width:46px; height:36px; margin:auto; border:1px solid var(--border); border-radius:9px; color:var(--muted); }
        .detail:hover,.refresh:hover { color:var(--accent); border-color:var(--accent); }
        footer { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-top:1px solid var(--border); font-size:12px; color:var(--muted); }
        nav { display:flex; gap:9px; align-items:center; } nav button,nav>span { display:grid; place-items:center; height:35px; width:35px; border:1px solid var(--border); border-radius:9px; } nav>span { border-color:var(--accent); color:var(--accent); }
        .empty { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; padding:55px 20px; color:var(--muted); background:var(--surface); border-radius:15px; }
        .empty button { color:var(--accent); }
        .scope-note { font-size:10px; color:var(--muted); opacity:.75; }
        .overlay { position:fixed; inset:0; z-index:60; display:flex; justify-content:center; align-items:center; padding:20px; background:#0009; backdrop-filter:blur(3px); }
        .dialog { width:100%; max-width:500px; max-height:85vh; overflow:auto; padding:26px; border-radius:20px; border:1px solid var(--border); background:var(--surface); color:var(--text); }
        .dialog-heading { display:flex; justify-content:space-between; align-items:center; gap:20px; } h2 { font-size:19px; font-weight:700; }
        dl { margin-top:24px; } dt { font-size:11px; color:var(--muted); margin-top:15px; } dd { margin-top:5px; font-size:14px; overflow-wrap:anywhere; }
        @media(max-width:1200px) { .toolbar { flex-wrap:wrap; } .search { flex-basis:100%; } .hero-copy { max-width:80%; } .wireframe { width:300px; right:16px; opacity:.25; } }
        @media(max-width:640px) { .activity-hero { min-height:230px; padding:27px 23px; } .hero-copy { max-width:100%; } .wireframe { width:260px; right:-70px; opacity:.16; } .metrics { grid-template-columns:1fr; gap:10px; } .metric { min-height:86px; padding:15px; } .metric-icon { width:48px; height:48px; } .segments { flex:1; } .segments button { flex:1; padding:0 12px; font-size:12px; } .period { flex:1; } footer { padding:12px; gap:10px; } }
      
        :global(html:not(.dark)) .segments button[aria-pressed="true"] {
          background:#e4f3eb; color:#0d7e70;
        }
        :global(html:not(.dark)) .wireframe { color:#008d85; }
        :global(html:not(.dark)) .search input::placeholder { color:#7b8983; }

        /* Reference activity table, with theme-aware surfaces and compact rows. */
        .events { border-radius:18px; }
        th { padding:14px 20px; font-size:10px; letter-spacing:.09em; }
        th:nth-child(1) { width:27%; } th:nth-child(2) { width:27%; }
        th:nth-child(3) { width:19%; } th:nth-child(4) { width:15%; }
        th:nth-child(5) { width:12%; }
        td { height:50px; padding:7px 20px; }
        .identity { gap:13px; }
        .identity>span:last-child { font-weight:600; }
        .avatar { width:36px; height:36px; background:linear-gradient(145deg,#6f86b6,#4f678f); color:#fff; }
        .action { gap:12px; }
        .status { gap:7px; padding:7px 12px; border:0; border-radius:999px; font-size:11px; font-weight:500; background:#e4f3eb; color:#0d7e70; }
        :global(html.dark) .status { background:#123b31; color:#00e9df; }
        .detail { display:flex; align-items:center; justify-content:center; gap:8px; width:88px; height:34px; border-radius:10px; color:var(--text); font-size:12px; background:var(--surface); }
        .detail> :global(svg) { color:var(--accent); flex-shrink:0; }
        footer { padding:16px 20px; }
        nav { gap:7px; }
        nav button { width:32px; height:32px; border-radius:9px; background:var(--surface); color:var(--muted); }
        nav button[aria-current="page"] { border-color:var(--accent); background:var(--accent); color:#fff; }
        :global(html.dark) nav button[aria-current="page"] { color:#002a26; }
        @media(max-width:640px) {
          footer { padding:14px 12px; flex-wrap:wrap; }
          nav { flex-wrap:wrap; }
        }
`}</style>
    </div>
  )
}
