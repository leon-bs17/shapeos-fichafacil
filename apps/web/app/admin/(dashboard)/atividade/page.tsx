'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronDown, ChevronUp, Activity, CircleCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, FileText, Network, RefreshCw, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react'

type Usuario = { id: string; nome: string; email: string; tipo: string; criado_em: string }
type Auditoria = { id: string; acao: string; detalhes: Record<string, unknown>; criado_em: string }
type Evento = { id: string; tipo: 'cadastro' | 'admin'; titulo: string; descricao: string; data: string }
type Periodo = 'todos' | 'hoje' | '24h' | '7dias'
type Filtro = 'todos' | 'cadastro' | 'admin'
const POR_PAGINA = 6
const texto = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const formatarData = (v: string) => new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
function iniciais(v: string) { return v.split(' · ')[0].trim().split(/\s+/).slice(0,2).map(p => p[0]).join('').toUpperCase() || 'AD' }

export default function AdminAtividadePage() {
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
   suppression.textContent = '.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace.activity-workspace * { transition: none !important; }'
   document.head.appendChild(suppression)
   // Flush the final palette while transitions are suppressed.
   const control = document.querySelector('.activity-workspace')
   if (control) window.getComputedStyle(control).backgroundColor
   frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(restore)
   })
  })
  observer.observe(html, { attributes: true, attributeFilter: ['class'] })
  return () => { observer.disconnect(); cancelAnimationFrame(frame); restore() }
 }, [])



  const detailsRef = useRef<HTMLDialogElement>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [periodo, setPeriodo] = useState<Periodo>('todos')
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
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

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
    if (!selecionado) return
    const dialog = detailsRef.current
    const focused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      focused?.focus()
    }
  }, [selecionado])
  const eventos = useMemo(() => (data?.eventos ?? []).filter(e => {
    if (filtro !== 'todos' && e.tipo !== filtro) return false
    if (periodo === 'hoje' && new Date(e.data).toLocaleDateString('pt-BR', { timeZone:'America/Fortaleza' }) !== new Date().toLocaleDateString('pt-BR', { timeZone:'America/Fortaleza' })) return false
    if (periodo === '24h' && Date.now() - new Date(e.data).getTime() > 86400000) return false
    if (periodo === '7dias' && Date.now() - new Date(e.data).getTime() > 7*86400000) return false
    return texto(e.descricao + ' ' + e.titulo).includes(texto(busca.trim()))
  }), [data, busca, filtro, periodo])
  const paginas = Math.max(1, Math.ceil(eventos.length / POR_PAGINA))
  const atual = Math.min(pagina, paginas)
  const inicio = (atual - 1) * POR_PAGINA

  return (
    <div data-activity-refined className="activity-workspace">
      <section className="activity-hero">
        <div className="hero-copy">
          <p className="eyebrow"><Activity size={15} /> Monitoramento</p>
          <h2 className="activity-banner-title">Atividade da <span>plataforma</span></h2>
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
          ['Cadastros 24h', data?.cadastros24h, UserPlus, 'cadastro', '24h', 'Mostrar cadastros das últimas 24 horas'],
          ['Cadastros 7 dias', data?.cadastros7d, Users, 'cadastro', '7dias', 'Mostrar cadastros dos últimos 7 dias'],
          ['Ações administrativas', data?.acoesAdmin, FileText, 'admin', 'todos', 'Mostrar ações administrativas'],
        ] as const).map(([label, value, Icon, kind, range, tooltip]) => (
          <button type="button" data-admin-metric-action data-shapeos-tooltip={tooltip} aria-controls="activity-results" aria-pressed={!busca && filtro === kind && periodo === range} onClick={() => { setBusca(''); setFiltro(kind); setPeriodo(range); setPagina(1); requestAnimationFrame(() => { const heading = document.querySelector<HTMLElement>('#activity-results'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start', behavior: 'auto' }) }) }} className="metric" key={label}>
            <div data-admin-metric-icon aria-hidden="true" className="metric-icon"><Icon size={27} strokeWidth={1.7} /></div>
            <div><p>{label}</p><strong>{isLoading ? '—' : value ?? 0}</strong></div>
          </button>
        ))}
      </div>

      <section className="activity-management" aria-label="Atividades recentes">
      <h2 id="activity-results" tabIndex={-1} className="activity-management-title">Atividades recentes</h2>
      <section className="toolbar" aria-label="Busca e filtros de atividade">
        <label data-admin-search className="search"><Search size={19} />
          <input aria-label="Buscar usuário ou ação" placeholder="Buscar usuário ou ação..." value={busca} onChange={e => setBusca(e.target.value)} />
          {busca && <button aria-label="Limpar busca" data-shapeos-tooltip="Limpar busca" onClick={() => setBusca('')}><X size={16} /></button>}
        </label>
        <div className="segments" aria-label="Tipo de evento">
          {([['todos','Todos'],['cadastro','Cadastros'],['admin','Ações admin.']] as const).map(([value,label]) => <button key={value} aria-pressed={filtro === value} onClick={() => setFiltro(value)}>{label}</button>)}
        </div>
        <ActivityPeriod value={periodo} onChange={setPeriodo} />
        <button className="refresh" aria-label="Atualizar atividade" data-shapeos-tooltip="Atualizar atividade" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} /></button>
      </section>

      {error ? <div className="empty" role="alert">Não foi possível carregar a atividade. <button onClick={() => refetch()}>Tentar novamente</button></div> : isLoading ? <div className="empty" role="status">Carregando atividade...</div> : (
        <section className="events">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Usuário / referência</th><th>Data e hora</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>{eventos.slice(inicio,inicio+POR_PAGINA).map(e => (
                <tr key={e.id}>
                  <td><div className="identity"><span className="avatar">{iniciais(e.descricao)}</span><span data-shapeos-tooltip={e.descricao}><span>{e.descricao.split(' · ')[0]}</span><span className="action event-identity-action">{e.tipo === 'cadastro' ? <UserPlus size={14} /> : <ShieldCheck size={14} />}<span>{e.titulo.toLowerCase()}</span></span></span></div></td>
                  <td className="date">{formatarData(e.data)}</td>
                  <td><span className="status"><CircleCheck size={15} aria-hidden="true" />Registrado</span></td>
                  <td><button data-admin-view className="detail" aria-label={`Ver detalhes: ${e.titulo}`} onClick={() => setSelecionado(e)}><Eye size={16} aria-hidden="true" /><span>Ver</span></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!eventos.length && <div className="empty"><Clock3 size={28} /><p>Nenhuma atividade encontrada.</p>{(busca || filtro !== 'todos' || periodo !== 'todos') && <button onClick={() => {setBusca('');setFiltro('todos');setPeriodo('todos')}}>Limpar filtros</button>}</div>}
          <footer>
            <span aria-live="polite">{eventos.length ? inicio+1 : 0}–{Math.min(inicio+POR_PAGINA,eventos.length)} de {eventos.length} eventos</span>
            <nav aria-label="Paginação da atividade">
              <button aria-label="Página anterior" data-shapeos-tooltip="Página anterior" disabled={atual===1} onClick={() => setPagina(atual-1)}><ChevronLeft size={17} /></button>
              {Array.from({length:paginas}, (_,i)=>i+1).map(n=><button key={n} aria-label={`Página ${n}`} aria-current={atual===n ? 'page' : undefined} onClick={()=>setPagina(n)}>{n}</button>)}
              <button aria-label="Próxima página" data-shapeos-tooltip="Próxima página" disabled={atual===paginas} onClick={() => setPagina(atual+1)}><ChevronRight size={17} /></button>
            </nav>
          </footer>
        </section>
      )}
      </section>
      <p className="scope-note">Resumo dos últimos cadastros e registros administrativos disponíveis.</p>
      <dialog ref={detailsRef} className="activity-details" aria-labelledby="activity-details-title"
        onCancel={(event) => { event.preventDefault(); setSelecionado(null) }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSelecionado(null)
        }}>
        {selecionado && <>
          <header className="details-heading">
            <div><h2 id="activity-details-title">Detalhes da atividade</h2><p>ATIVIDADE</p></div>
            <button type="button" className="details-close" autoFocus aria-label="Fechar detalhes" data-shapeos-tooltip="Fechar detalhes" onClick={() => setSelecionado(null)}><X size={22} /></button>
          </header>
          <section className="details-summary" aria-label="Ação registrada">
            <div className="details-icon">{selecionado.tipo === 'cadastro' ? <UserPlus size={29} strokeWidth={1.7} /> : <ShieldCheck size={29} strokeWidth={1.7} />}</div>
            <h3>{selecionado.titulo.toLowerCase()}</h3>
            <span className="details-badge"><CircleCheck size={14} aria-hidden="true"/>Registrado</span>
          </section>
          <dl className="details-reference"><dt>Referência</dt><dd>{selecionado.descricao}</dd></dl>
          <dl className="details-metadata">
            <div><CalendarDays size={25} strokeWidth={1.7} /><div><dt>Data e hora</dt><dd>{formatarData(selecionado.data)}</dd></div></div>
            <div><Network size={25} strokeWidth={1.7} /><div><dt>Origem</dt><dd>{selecionado.tipo === 'cadastro' ? 'Cadastro de usuário' : 'Auditoria administrativa'}</dd></div></div>
          </dl>
          <footer className="details-footer"><button type="button" onClick={() => setSelecionado(null)}>Fechar</button></footer>
        </>}
      </dialog>
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
        .wireframe { position:absolute; z-index:1; width:500px; height:310px; top:50%; right:40px; transform:translateY(-50%); color:var(--accent); opacity:.4; pointer-events:none; }
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
        .detail:hover { color:var(--accent); border-color:var(--accent); }
        footer { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-top:1px solid var(--border); font-size:12px; color:var(--muted); }
        nav { display:flex; gap:9px; align-items:center; } nav button,nav>span { display:grid; place-items:center; height:35px; width:35px; border:1px solid var(--border); border-radius:9px; } nav>span { border-color:var(--accent); color:var(--accent); }
        .empty { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; padding:55px 20px; color:var(--muted); background:var(--surface); border-radius:15px; }
        .empty button { color:var(--accent); }
        .scope-note { font-size:10px; color:var(--muted); opacity:.75; }
        .overlay { position:fixed; inset:0; z-index:60; display:flex; justify-content:center; align-items:center; padding:20px; background:#0009; backdrop-filter:blur(3px); }
        .dialog { width:100%; max-width:500px; max-height:85vh; overflow:auto; padding:26px; border-radius:20px; border:1px solid var(--border); background:var(--surface); color:var(--text); }
        .dialog-heading { display:flex; justify-content:space-between; align-items:center; gap:20px; } h2 { font-size:19px; font-weight:700; }
        dl { margin-top:24px; } dt { font-size:11px; color:var(--muted); margin-top:15px; } dd { margin-top:5px; font-size:14px; overflow-wrap:anywhere; }
        @media(max-width:1200px) { .toolbar { flex-wrap:wrap; } .search { flex-basis:100%; } .hero-copy { max-width:80%; } .wireframe { right:-140px; opacity:.25; } }
        @media(max-width:640px) { .activity-hero { min-height:230px; padding:27px 23px; } .hero-copy { max-width:100%; } .wireframe { right:-235px; opacity:.16; } .metrics { grid-template-columns:1fr; gap:10px; } .metric { min-height:86px; padding:15px; } .metric-icon { width:48px; height:48px; } .segments { flex:1; } .segments button { flex:1; padding:0 12px; font-size:12px; } .period { flex:1; } footer { padding:12px; gap:10px; } }
      
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

        .activity-details { width:min(600px,calc(100vw - 40px)); max-height:calc(100dvh - 40px); margin:auto; padding:26px; border:1px solid var(--border); border-radius:18px; background:var(--surface); color:var(--text); overflow-y:auto; overscroll-behavior:contain; }
        .activity-details::backdrop { background:rgba(0,12,9,.68); backdrop-filter:blur(3px); }
        .details-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
        .details-heading h2 { font-size:22px; line-height:1.3; font-weight:750; letter-spacing:-.025em; }
        .details-heading p { font-size:11px; color:var(--muted); margin-top:7px; letter-spacing:.06em; }
        .details-close { display:grid; place-items:center; width:40px; height:40px; flex-shrink:0; border-radius:13px; color:var(--text); }
        .details-summary { display:flex; align-items:center; gap:16px; padding:20px; margin-top:24px; border:1px solid var(--border); border-radius:13px; background:#e4f3eb; }
        :global(html.dark) .details-summary { background:rgba(0,233,223,.055); }
        .details-icon { display:grid; place-items:center; width:56px; height:56px; flex:0 0 56px; border-radius:13px; background:color-mix(in srgb,var(--accent) 14%,var(--surface)); color:var(--accent); }
        .details-summary h3 { font-size:22px; font-weight:700; line-height:1.35; letter-spacing:-.025em; text-transform:capitalize; overflow-wrap:anywhere; min-width:0; }
        .details-badge { display:inline-flex; align-items:center; margin-left:auto; flex-shrink:0; padding:7px 12px; border:0; border-radius:999px; background:#e4f3eb; color:#0d7e70; font-size:11px; font-weight:500; }
        :global(html.dark) .details-badge { background:#123b31; color:#00e9df; }
        .details-reference { margin:20px 0 0; padding:18px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .activity-details dt { color:var(--muted); font-size:12px; margin:0; }
        .activity-details dd { font-size:14px; line-height:1.6; margin-top:5px; overflow-wrap:anywhere; }
        .details-reference dd { font-size:16px; font-weight:500; }
        .details-metadata { display:grid; grid-template-columns:1fr 1fr; margin:20px 0 0; }
        .details-metadata > div { display:flex; align-items:flex-start; gap:13px; min-width:0; padding-right:16px; }
        .details-metadata > div + div { border-left:1px solid var(--border); padding-left:20px; padding-right:0; }
        .details-metadata > div > :global(svg) { color:var(--accent); flex-shrink:0; margin-top:3px; }
        .details-footer { display:flex; justify-content:flex-end; padding:0; margin-top:26px; border:0; }
        .details-footer button { min-height:40px; padding:0 22px; border:1px solid var(--accent); border-radius:13px; color:var(--accent); font-size:13px; font-weight:650; background:transparent; transition:background-color 150ms ease,border-color 150ms ease; }
        @media(hover:hover) and (pointer:fine) { .details-footer button:hover,.details-close:hover { background:color-mix(in srgb,var(--accent) 7%,transparent); } }
        @media(max-width:600px) {
          .activity-details { width:calc(100vw - 24px); max-height:calc(100dvh - 24px); padding:20px; }
          .details-heading h2 { font-size:20px; }
          .details-summary { flex-wrap:wrap; padding:16px; gap:12px; margin-top:20px; }
          .details-summary h3 { flex:1; font-size:20px; }
          .details-badge { margin-left:68px; }
          .details-metadata { grid-template-columns:1fr; gap:18px; }
          .details-metadata > div { padding:0; }
          .details-metadata > div + div { border-left:0; padding:0; }
          .details-footer button,.details-close { min-height:44px; }
        }

        /* Separate filters follow the Approvals reference. */
        .segments { gap:6px; border:0; border-radius:13px; overflow:visible; }
        .segments button,.segments button:last-child { height:48px; padding:0 20px; border:1px solid var(--border); border-radius:13px; background:transparent; color:var(--muted); font-size:13px; font-weight:400; white-space:nowrap; }
        .segments button[aria-pressed="true"] { background:color-mix(in srgb,var(--accent) 7%,transparent); color:var(--accent); }
        :global(html:not(.dark)) .segments button[aria-pressed="true"] { background:color-mix(in srgb,var(--accent) 7%,transparent); color:var(--accent); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace :is(.search,.segments button,.activity-period-trigger,.activity-period-option)) {
          border-width:1px!important; border-style:solid!important; border-radius:13px!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
          box-shadow:none!important; transform:none!important; translate:none!important; scale:none!important; filter:none!important; animation:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .search) { background:var(--surface)!important; border-color:var(--border)!important; color:var(--muted)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .search:focus-within) { border-color:var(--border)!important; box-shadow:none!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .search input) { background:transparent!important; box-shadow:none!important; outline:none!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .segments button) { background:transparent!important; border-color:var(--border)!important; color:var(--muted)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .segments button[aria-pressed="true"]) { background:color-mix(in srgb,var(--accent) 7%,transparent)!important; color:var(--accent)!important; }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .search:not(:has(input:disabled)):hover),
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .segments button:hover:enabled) {
            background:color-mix(in srgb,var(--accent) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;
          }
        }
        @media(max-width:640px) {
          .toolbar { gap:12px; }
          .segments { flex:1 1 100%; min-width:0; }
          .segments button { flex:1; min-width:0; padding:0 10px; font-size:12px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .search input) { font-size:16px!important; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period) { flex:1; width:auto; min-width:0; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-menu) { width:100%; }
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period) { position:relative; width:190px; flex-shrink:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-trigger) {
          display:flex; align-items:center; gap:10px; width:100%; height:48px!important;
          padding:0 14px!important; background:var(--surface)!important;
          border:1px solid var(--border)!important; border-radius:13px!important;
          color:var(--muted)!important; font-size:13px!important; font-weight:400!important;
          white-space:nowrap;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-trigger > svg) { flex-shrink:0; color:inherit; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-trigger > svg:last-child) { margin-left:auto; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-menu) {
          position:absolute; z-index:40; top:calc(100% + 8px); right:0;
          width:240px; max-width:calc(100vw - 32px); padding:6px;
          border:1px solid var(--border); border-radius:13px;
          background:var(--surface); color:var(--text);
          box-shadow:0 8px 24px rgba(0,0,0,.12); outline:none;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-menu[data-above="true"]) { top:auto; bottom:calc(100% + 8px); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option) {
          display:flex; align-items:center; gap:10px; min-height:44px; padding:0 10px;
          border:1px solid transparent; border-radius:13px; cursor:pointer;
          font-size:13px; font-weight:400; color:var(--text);
          transition:background-color 150ms ease,border-color 150ms ease;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option + .activity-period-option) { margin-top:4px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option > svg) { flex-shrink:0; color:inherit; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option > svg:last-child:not(:first-child)) { margin-left:auto; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option[aria-selected="true"]) {
          background:color-mix(in srgb,var(--accent) 7%,transparent);
          color:var(--accent);
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-menu:focus .activity-period-option[data-active="true"]) {
          border-color:color-mix(in srgb,var(--accent) 40%,transparent);
        }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-trigger:hover:enabled),
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option:hover) {
            background:color-mix(in srgb,var(--accent) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;
          }
        }
        @media(max-width:480px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period) { width:100%; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-menu) { width:100%; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-trigger),
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .activity-period-option) { font-size:16px!important; }
        }



        /* Refresh keeps the same quiet hover as the search and filters. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .refresh) {
          border:1px solid var(--border)!important; border-radius:13px!important;
          background:var(--surface)!important; color:var(--muted)!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
          box-shadow:none!important; filter:none!important; transform:none!important;
          translate:none!important; scale:none!important;
        }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/atividade"] [data-admin-content="/admin/atividade"] .activity-workspace.activity-workspace .refresh:hover:enabled) {
            background:color-mix(in srgb,var(--accent) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;
          }
        }


:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]) { display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:8px!important; width:auto!important; min-width:84px!important; height:36px!important; min-height:36px!important; padding:0 14px!important; border:1px solid var(--border)!important; border-radius:13px!important; background:transparent!important; background-image:none!important; color:var(--text,#162623)!important; font-size:12px!important; font-weight:600!important; line-height:1.5!important; white-space:nowrap!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] svg) { width:15px!important; height:15px!important; color:var(--accent)!important; flex-shrink:0!important; }
@media(hover:hover) and (pointer:fine) { :global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]:hover:enabled) { background:color-mix(in srgb,var(--accent) 7%,transparent)!important; border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important; } }
@media(max-width:640px) { :global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]) { height:44px!important; min-height:44px!important; } }
@media(prefers-reduced-motion:reduce) { :global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]) { transition:none!important; } }

.event-profile { display:none; }
@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace) { gap:16px!important;padding-bottom:0!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .activity-hero) { min-height:0!important;padding:22px 16px!important;border-radius:16px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .hero-copy) { max-width:100%!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .hero-copy h1) { font-size:30px!important;line-height:1.12!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .hero-copy>p:last-child) { font-size:13px!important;line-height:1.55!important;margin-top:12px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .wireframe) { width:280px!important;right:-170px!important;opacity:.15!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .metrics) { grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .metric) { flex-direction:column!important;justify-content:center!important;text-align:center!important;gap:7px!important;padding:12px 5px!important;min-height:104px!important;border-radius:13px!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .metric-icon) { width:32px!important;height:32px!important;background:transparent!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .metric-icon svg) { width:26px!important;height:26px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .metric p) { font-size:10px!important;line-height:1.35!important;min-height:27px!important;margin:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .metric strong) { font-size:28px!important;line-height:1.15!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .toolbar) { display:grid!important;grid-template-columns:minmax(0,1fr) 44px!important;gap:10px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .search) { grid-column:1/-1!important;width:100%!important;min-width:0!important;height:48px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .search input) { font-size:16px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .segments) { grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;width:100%!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .segments button) { height:44px!important;padding:0 5px!important;font-size:12px!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .activity-period) { width:100%!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .activity-period-trigger) { height:44px!important;font-size:14px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .refresh) { width:44px!important;height:44px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events) { background:transparent!important;border:0!important;overflow:visible!important;border-radius:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .table-scroll) { overflow:visible!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events table) { display:block!important;width:100%!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events thead) { display:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events tbody) { display:grid!important;gap:12px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events tbody tr) { display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;padding:16px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:var(--surface)!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events td) { display:block!important;padding:0!important;height:auto!important;border:0!important;min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events td:first-child) { grid-column:1!important;grid-row:1!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .identity) { align-items:center!important;gap:10px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .avatar) { width:36px!important;height:36px!important;background:linear-gradient(145deg,#6f86b6,#4f678f)!important;font-size:12px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .identity>span:last-child) { white-space:normal!important;overflow:visible!important;text-overflow:clip!important;font-size:13px!important;font-weight:600!important;overflow-wrap:anywhere!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .event-profile) { display:block!important;margin-top:3px!important;color:var(--muted)!important;font-size:11px!important;font-weight:400!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events td:nth-child(2)) { grid-column:1/-1!important;grid-row:2!important;padding-left:46px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .action) { gap:8px!important;align-items:flex-start!important;font-size:13px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events td:nth-child(3)) { grid-column:1/-1!important;grid-row:3!important;padding-left:46px!important;font-size:11px!important;color:var(--muted)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events td:nth-child(4)) { grid-column:2!important;grid-row:1!important;align-self:start!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .status) { padding:5px 8px!important;font-size:10px!important;border:0!important;border-radius:999px!important;background:color-mix(in srgb,var(--accent) 12%,var(--surface))!important;color:var(--accent)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .status svg) { display:block!important;width:15px!important;height:15px!important;flex-shrink:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events td:last-child) { grid-column:1/-1!important;grid-row:4!important;margin-top:3px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events [data-admin-view][data-admin-view]) { display:flex!important;justify-content:center!important;align-items:center!important;width:100%!important;min-width:0!important;height:44px!important;min-height:44px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:transparent!important;color:var(--text)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events>footer) { display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;gap:12px!important;margin-top:16px!important;padding:16px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:var(--surface)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events>footer nav) { display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:6px!important;width:100%!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .events>footer nav button) { width:44px!important;height:44px!important;min-width:44px!important;border-radius:13px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .scope-note) { font-size:11px!important;line-height:1.5!important;margin:0!important;color:var(--muted)!important; }
}

@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .activity-details) { box-sizing:border-box!important;width:calc(100vw - 24px)!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;padding:20px!important;overflow-x:hidden!important;overflow-y:auto!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-summary) { display:grid!important;grid-template-columns:48px minmax(0,1fr)!important;align-items:center!important;gap:10px 12px!important;padding:16px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-icon) { grid-column:1!important;grid-row:1!important;width:48px!important;height:48px!important;min-width:48px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-summary h3) { grid-column:2!important;grid-row:1!important;min-width:0!important;width:auto!important;font-size:20px!important;line-height:1.35!important;word-break:normal!important;overflow-wrap:break-word!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-badge) { grid-column:2!important;grid-row:2!important;justify-self:start!important;margin:0!important;max-width:100%!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-heading) { gap:12px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-heading h2) { font-size:20px!important;line-height:1.3!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-close) { width:44px!important;height:44px!important;min-width:44px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-metadata) { grid-template-columns:1fr!important;gap:18px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-metadata>div + div) { border-left:0!important;padding:0!important; }
}

:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .activity-details .details-summary) { background:var(--surface)!important; border-color:var(--border)!important; }

@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-summary) { grid-template-columns:36px minmax(0,1fr) auto!important;gap:8px!important;padding:12px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-icon) { width:36px!important;height:36px!important;min-width:36px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-icon svg) { width:24px!important;height:24px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-summary h3) { grid-column:2!important;grid-row:1!important;font-size:16px!important;line-height:1.35!important;word-break:normal!important;overflow-wrap:normal!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/atividade"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .activity-workspace.activity-workspace .details-badge) { grid-column:3!important;grid-row:1!important;align-self:center!important;justify-self:end!important;font-size:10px!important;padding:6px 8px!important;white-space:nowrap!important;margin:0!important; }
}

/* Compact activity page matching the management reference. */
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined])){display:grid!important;gap:18px!important;--surface:#fcfdf9;--border:#d7ded3;--muted:#5f6f68;--accent:#129b89;--text:#162623;}
:global(html.dark body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined])){--surface:#091c18;--border:#1c4037;--muted:#a3becd;--accent:#00e9df;--text:#f5faf9;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-hero){min-height:130px!important;padding:24px 28px!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-banner-title){font-size:28px!important;line-height:1.2!important;letter-spacing:-.035em!important;font-weight:700!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-banner-title span){color:var(--accent)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .eyebrow){font-size:9px!important;margin-bottom:8px!important;border:0!important;padding:0!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .hero-copy>p:last-child){font-size:13px!important;margin-top:8px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .wireframe){width:330px!important;right:20px!important;opacity:.32!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metrics){display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric){min-height:80px!important;padding:10px 18px!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;gap:14px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric+.metric){border-left:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric>div:last-child){display:flex!important;flex-direction:column-reverse!important;gap:3px!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric strong){font-size:24px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric p){font-size:12px!important;line-height:1.5!important;margin:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-management){display:grid!important;gap:14px!important;padding:18px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:var(--surface)!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-management-title){font-size:15px!important;font-weight:650!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .toolbar){display:flex!important;align-items:center!important;gap:10px!important;margin:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .search){flex:1!important;min-width:160px!important;height:44px!important;min-height:44px!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .search input){font-size:12px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .segments){display:flex!important;gap:4px!important;border:0!important;overflow:visible!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .segments button){height:44px!important;min-height:44px!important;padding:0 12px!important;border:1px solid transparent!important;border-radius:13px!important;font-size:12px!important;color:var(--text)!important;white-space:nowrap!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .segments button[aria-pressed="true"]){background:color-mix(in srgb,var(--accent) 7%,transparent)!important;border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;color:var(--accent)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-period-trigger){height:44px!important;min-height:44px!important;border-radius:13px!important;font-size:12px!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .refresh){width:44px!important;min-width:44px!important;height:44px!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events){border:1px solid var(--border)!important;border-radius:13px!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) th){font-size:10px!important;padding:12px 16px!important;color:var(--muted)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) td){height:56px!important;padding:8px 16px!important;font-size:12px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .avatar){width:32px!important;height:32px!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .identity){gap:10px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .identity>span:last-child){white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .identity>span:last-child>span){color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .date){color:var(--muted)!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .status){padding:6px 10px!important;font-size:10px!important;gap:6px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .detail){width:78px!important;min-width:78px!important;height:34px!important;min-height:34px!important;display:flex!important;gap:7px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:transparent!important;color:var(--text)!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .detail svg){color:var(--accent)!important;stroke:var(--accent)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events>footer){padding:14px 16px!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events nav button){width:36px!important;height:36px!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .empty){padding:26px 16px!important;min-height:160px!important;border-radius:13px!important;font-size:12px!important;}
@media(any-hover:hover){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-management button:hover:enabled){background:color-mix(in srgb,var(--accent) 7%,transparent)!important;border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;transform:none!important;box-shadow:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-management nav button[aria-current="page"]:hover){background:var(--accent)!important;border-color:var(--accent)!important;}
}
@media(min-width:768px) and (max-width:1199px){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .toolbar){flex-wrap:wrap!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .search){flex-basis:100%!important;}
}
@media(max-width:767px){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-hero){min-height:150px!important;padding:22px 18px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .hero-copy){max-width:100%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-banner-title){font-size:26px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .wireframe){right:-170px!important;opacity:.15!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric){padding:10px 8px!important;gap:8px!important;flex-direction:column!important;align-items:flex-start!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric p){font-size:10px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .metric strong){font-size:22px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-management){padding:14px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .toolbar){display:grid!important;grid-template-columns:minmax(0,1fr) 44px!important;gap:10px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .search){grid-column:1 / -1!important;width:100%!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .segments){grid-column:1 / -1!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .segments button){padding:0 6px!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-period-trigger){width:100%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .detail){width:100%!important;min-height:44px!important;height:44px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events>footer){flex-direction:column!important;justify-content:center!important;gap:12px!important;text-align:center!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events nav){justify-content:center!important;flex-wrap:wrap!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events nav button){width:44px!important;height:44px!important;}
}

/* Refined centered activity detail panel. */
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details){position:fixed!important;inset:0!important;margin:auto!important;width:min(520px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;height:fit-content!important;min-height:0!important;max-height:calc(100dvh - 32px)!important;overflow-y:auto!important;overflow-x:hidden!important;padding:24px!important;border:1px solid var(--border)!important;border-radius:18px!important;background:var(--surface)!important;color:var(--text)!important;box-shadow:none!important;transform:none!important;translate:none!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details:not([open])){display:none!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details[open]){display:block!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details::backdrop){background:rgba(0,0,0,.48)!important;backdrop-filter:blur(3px)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-heading){display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:14px!important;padding-bottom:18px!important;border-bottom:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-heading>div){display:flex!important;flex-direction:column-reverse!important;gap:6px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-heading h2){font-size:22px!important;line-height:1.3!important;font-weight:650!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-heading p){margin:0!important;font-size:10px!important;letter-spacing:.08em!important;color:var(--muted)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-close){width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;display:grid!important;place-items:center!important;border:1px solid var(--border)!important;border-radius:13px!important;background:transparent!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-summary){display:grid!important;grid-template-columns:40px minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;margin:0!important;padding:18px 0!important;border:0!important;border-bottom:1px solid var(--border)!important;border-radius:0!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-icon){grid-column:1!important;grid-row:1!important;width:40px!important;height:40px!important;min-width:40px!important;border-radius:13px!important;background:color-mix(in srgb,var(--accent) 7%,transparent)!important;color:var(--accent)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-icon svg){width:22px!important;height:22px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-summary h3){grid-column:2!important;grid-row:1!important;min-width:0!important;font-size:15px!important;line-height:1.5!important;font-weight:600!important;letter-spacing:normal!important;overflow-wrap:anywhere!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-badge){grid-column:3!important;grid-row:1!important;display:inline-flex!important;align-items:center!important;gap:6px!important;margin:0!important;padding:6px 9px!important;font-size:10px!important;white-space:nowrap!important;border:0!important;border-radius:999px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-reference){margin:0!important;padding:16px 0!important;border-top:0!important;border-bottom:1px solid var(--border)!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details dt){font-size:11px!important;margin:0!important;color:var(--muted)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details dd){font-size:13px!important;line-height:1.6!important;margin:5px 0 0!important;font-weight:400!important;color:var(--text)!important;overflow-wrap:anywhere!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-metadata){display:grid!important;grid-template-columns:1fr 1fr!important;margin:0!important;padding:18px 0!important;gap:16px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-metadata>div){padding:0!important;border:0!important;gap:10px!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-metadata svg){width:20px!important;height:20px!important;color:var(--muted)!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-footer){display:flex!important;justify-content:flex-end!important;margin:0!important;padding:16px 0 0!important;border-top:1px solid var(--border)!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-footer button){min-height:44px!important;padding:0 20px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:transparent!important;font-size:12px!important;font-weight:500!important;color:var(--text)!important;box-shadow:none!important;}
@media(any-hover:hover){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details button:hover:enabled){background:color-mix(in srgb,var(--accent) 7%,transparent)!important;border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;box-shadow:none!important;transform:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
}
@media(max-width:480px){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .activity-details){width:calc(100vw - 24px)!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;padding:18px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-heading h2){font-size:20px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-summary){grid-template-columns:40px minmax(0,1fr)!important;gap:8px 12px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-badge){grid-column:2!important;grid-row:2!important;justify-self:start!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-metadata){grid-template-columns:1fr!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .details-footer button){width:100%!important;}
}

/* Group event reference and action while preserving compact mobile cards. */
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .event-identity-action){display:flex!important;align-items:center!important;gap:6px!important;margin-top:4px!important;font-size:11px!important;line-height:1.5!important;color:var(--muted)!important;font-weight:400!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .event-identity-action svg){width:14px!important;height:14px!important;flex-shrink:0!important;color:var(--accent)!important;}
@media(min-width:768px){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events th:nth-child(1)){width:50%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events th:nth-child(2)){width:24%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events th:nth-child(3)){width:15%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events th:nth-child(4)){width:11%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table){min-width:0!important;width:100%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events td:nth-child(4)){text-align:center!important;}
}
@media(max-width:767px){:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events td:nth-child(1)){grid-column:1 / -1!important;grid-row:1!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events td:nth-child(2)){grid-column:1 / -1!important;grid-row:2!important;padding-left:42px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events td:nth-child(3)){grid-column:1 / -1!important;grid-row:3!important;padding-left:42px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events td:nth-child(4)){grid-column:1 / -1!important;grid-row:4!important;padding-left:0!important;align-self:stretch!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events td:nth-child(4) .detail){width:100%!important;}
}

/* Mobile cards use content height and independent metadata rows. */
@media(max-width:767px){
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table){display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table tbody){display:grid!important;gap:12px!important;width:100%!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table thead){display:none!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table tbody tr){display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:12px!important;height:auto!important;min-height:0!important;max-height:none!important;grid-template-rows:none!important;padding:14px!important;margin:0!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table tbody tr>td){display:block!important;position:static!important;inset:auto!important;transform:none!important;width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;grid-column:auto!important;grid-row:auto!important;align-self:stretch!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table tbody tr>td:before){position:static!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events .identity){align-items:flex-start!important;gap:10px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events .identity>span:last-child){flex:1!important;min-width:0!important;white-space:normal!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events .avatar){flex:0 0 32px!important;width:32px!important;height:32px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events .date){font-size:11px!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events .status){display:inline-flex!important;width:max-content!important;}
:global(html body [data-admin-route="/admin/atividade"] :is(#activity-refined,[data-activity-refined]) .events table tbody tr>td:last-child button){width:100%!important;min-width:0!important;height:44px!important;min-height:44px!important;margin:0!important;}
}
`}</style>
    </div>
  )
}

function ActivityPeriod({ value, onChange }: { value: Periodo; onChange: (value: Periodo) => void }) {
  const options = [
    { value: 'todos' as const, label: 'Todo período', Icon: CalendarDays },
    { value: 'hoje' as const, label: 'Hoje', Icon: CalendarDays },
    { value: '24h' as const, label: 'Últimas 24 horas', Icon: Clock3 },
    { value: '7dias' as const, label: 'Últimos 7 dias', Icon: Clock3 },
  ]
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [above, setAbove] = useState(false)
  const selected = options.findIndex((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setAbove(window.innerHeight - rect.bottom < 120 && rect.top > 120)
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

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div ref={rootRef} className="activity-period" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="activity-period-trigger"
      aria-label={`Filtrar por período: ${options[selected].label}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setActive(selected); setOpen(!open) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive(selected); setOpen(true)
        }
      }}>
      <CalendarDays size={17} strokeWidth={1.8} />
      <span>{options[selected].label}</span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div ref={listRef} id={id} role="listbox" tabIndex={-1} className="activity-period-menu"
      data-above={above} aria-label="Período da atividade" aria-activedescendant={`${id}-${active}`}
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
      {options.map(({ value: optionValue, label, Icon }, index) => <div
        key={optionValue} id={`${id}-${index}`} role="option"
        aria-selected={value === optionValue} data-active={active === index}
        className="activity-period-option"
        onPointerMove={() => setActive(index)}
        onClick={() => choose(index)}>
        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
        {value === optionValue && <Check size={17} strokeWidth={2} />}
      </div>)}
    </div>}
  </div>
}
