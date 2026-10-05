'use client'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, CheckCircle2, FileText, GraduationCap, Info, Megaphone, PauseCircle, Search, Send, Trash2, UserRound, Users } from 'lucide-react'
type Publico = 'TODOS' | 'PERSONAL' | 'ALUNO'
type Comunicado = {
  id: string
  titulo: string
  mensagem: string
  publico: Publico
  ativa: boolean
  criado_em: string
}

export default function AdminComunicadosPage() {
  const queryClient = useQueryClient()
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [publico, setPublico] = useState<Publico>('TODOS')
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [soAtivos, setSoAtivos] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { data: comunicados, isLoading, error: erroConsulta } = useQuery({
    queryKey: ['admin-notificacoes'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('admin_notificacoes')
        .select('id, titulo, mensagem, publico, ativa, criado_em')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as Comunicado[]
    },
  })

  async function publicar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const tituloLimpo = titulo.trim()
    const mensagemLimpa = mensagem.trim()
    if (tituloLimpo.length < 3 || mensagemLimpa.length < 5) {
      setErro('Informe um título e uma mensagem válidos.')
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão administrativa expirada.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('admin_notificacoes').insert({
      titulo: tituloLimpo,
      mensagem: mensagemLimpa,
      publico,
      criado_por: user.id,
      ativa: true,
    })

    if (error) {
      setErro('Não foi possível publicar o comunicado.')
    } else {
      setTitulo('')
      setMensagem('')
      setPublico('TODOS')
      await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
    }
    setSalvando(false)
  }

  async function alternar(item: Comunicado) {
    const supabase = createClient()
    const { error } = await supabase.from('admin_notificacoes').update({ ativa: !item.ativa }).eq('id', item.id)
    if (!error) await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir este comunicado?')) return
    const supabase = createClient()
    const { error } = await supabase.from('admin_notificacoes').delete().eq('id', id)
    if (!error) await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
  }

  const ativos = comunicados?.filter((item) => item.ativa).length ?? 0

  const labelPublico = (p: Publico) => p === 'TODOS' ? 'Todos' : p === 'PERSONAL' ? 'Personais' : 'Alunos'
  const filtrados = (comunicados ?? []).filter(c => (!soAtivos || c.ativa) && (c.titulo+' '+c.mensagem).toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
  return (
    <div className="notices-workspace">
      <section className="hero"><div className="hero-copy"><p className="eyebrow">Comunicação</p><h1>Comunicados da <span>plataforma</span></h1><p>Publique avisos para alunos e personais e gerencie a comunicação da ShapeOS.</p></div>
        <svg className="wireframe" viewBox="0 0 500 300" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth=".65">{Array.from({length:32},(_,i)=><ellipse key={i} cx="265" cy="160" rx={105+i*2.9} ry={65+i*2.2} transform={`rotate(${-28+i*3.2} 265 160)`} />)}{Array.from({length:14},(_,i)=><ellipse key={'o'+i} cx="265" cy="160" rx="202" ry={25+i*6} transform="rotate(-28 265 160)" />)}</g></svg>
      </section>
      <div className="columns">
        <section className="panel editor"><h2><Megaphone size={23} />Novo comunicado</h2>
          <form onSubmit={publicar}>
            <label htmlFor="notice-title">Título</label><input id="notice-title" value={titulo} onChange={e=>setTitulo(e.target.value)} maxLength={120} placeholder="Ex.: Manutenção programada" />
            <label htmlFor="notice-message">Mensagem</label><textarea id="notice-message" value={mensagem} onChange={e=>setMensagem(e.target.value)} maxLength={1500} rows={7} placeholder="Escreva o comunicado..." />
            <fieldset><legend>Público</legend><div className="audiences">{(['TODOS','PERSONAL','ALUNO'] as Publico[]).map(p=><button type="button" key={p} aria-pressed={publico===p} onClick={()=>setPublico(p)}>{p==='TODOS'?<Users size={16}/>:p==='PERSONAL'?<UserRound size={16}/>:<GraduationCap size={16}/>} {labelPublico(p)}</button>)}</div></fieldset>
            {erro && <p role="alert" className="error">{erro}</p>}
            <button type="submit" className="publish" disabled={salvando}><Send size={18}/>{salvando?'Publicando...':'Publicar comunicado'}</button>
            <p className="helper"><Info size={14}/>O aviso será enviado ao público selecionado.</p>
          </form>
        </section>
        <section className="panel published">
          <header><h2><FileText size={23}/>Comunicados publicados</h2><span className="count">{ativos} {ativos===1?'ativo':'ativos'}</span></header>
          <div className="list-tools"><label className="search"><Search size={16}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar comunicado..." aria-label="Buscar comunicado"/></label><div className="filters"><button aria-pressed={!soAtivos} onClick={()=>setSoAtivos(false)}>Todos</button><button aria-pressed={soAtivos} onClick={()=>setSoAtivos(true)}>Ativos</button></div></div>
          {erroConsulta ? <p role="alert" className="empty">Não foi possível carregar os comunicados.</p> : isLoading ? <div className="h-48 rounded-2xl skeleton" role="status" aria-label="Carregando comunicados"/> : !filtrados.length ? <div className="empty"><Megaphone size={30}/><p>{comunicados?.length?'Nenhum comunicado encontrado.':'Nenhum comunicado publicado.'}</p></div> : <div className="notice-list">{filtrados.map(item=><article className="notice" key={item.id}>
            <div className="notice-icon"><Megaphone size={21}/></div>
            <div className="notice-body"><div className="notice-heading"><h3>{item.titulo}</h3><span className="audience-tag">{labelPublico(item.publico)}</span><span className={item.ativa?'state':'state paused'}><i/>{item.ativa?'Ativo':'Pausado'}</span></div>
              <p className="message">{item.mensagem}</p>
              <footer><span className="date"><CalendarDays size={15}/>{new Date(item.criado_em).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                <div className="actions"><button onClick={()=>alternar(item)}>{item.ativa?<PauseCircle size={15}/>:<CheckCircle2 size={15}/>} {item.ativa?'Desativar':'Reativar'}</button><button className="delete" onClick={()=>excluir(item.id)} aria-label={`Excluir comunicado: ${item.titulo}`} title="Excluir comunicado"><Trash2 size={15}/></button></div>
              </footer>
            </div>
          </article>)}</div>}
        </section>
      </div>
      <style jsx>{`
        .notices-workspace { --surface:#fff; --border:#d5e5e1; --text:#16322d; --muted:#587580; --accent:#008d85; display:grid; gap:20px; padding-bottom:24px; }
        :global(.dark) .notices-workspace { --surface:#071b17; --border:#1c4138; --text:#f1f8f5; --muted:#a5bdcc; --accent:#00e9df; }
        :global(.dark [data-admin-route="/admin/comunicados"]) { background:#041512!important; --shapeos-brand:#00e9df; }
        .hero { position:relative; overflow:hidden; min-height:225px; display:flex; align-items:center; padding:35px 36px; border:1px solid var(--border); border-radius:17px; background:var(--surface); }
        :global(.dark) .hero { background:radial-gradient(ellipse at 83% 60%,#07382e,#071b17 45%,#041512); }
        .hero-copy { position:relative; z-index:2; max-width:80%; } .eyebrow { font-size:11px!important; text-transform:uppercase; letter-spacing:.2em; font-weight:700; color:var(--accent)!important; margin-bottom:18px; }
        h1 { color:var(--text); font-size:clamp(29px,3.2vw,47px); line-height:1.15; font-weight:800; letter-spacing:-.04em; } h1 span { color:var(--accent); } .hero-copy>p:last-child { font-size:15px; line-height:1.6; color:var(--muted); margin-top:14px; } .wireframe { position:absolute; width:400px; height:280px; top:-12px; right:-15px; color:var(--accent); opacity:.45; pointer-events:none; }
        .columns { display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1.4fr); gap:20px; align-items:start; }
        .panel { border:1px solid var(--border); border-radius:15px; padding:23px; background:var(--surface); } h2 { display:flex; align-items:center; gap:12px; font-size:17px; font-weight:650; color:var(--text); } h2> :global(svg) { color:var(--accent); flex-shrink:0; }
        .editor h2 { padding-bottom:20px; border-bottom:1px solid var(--border); } form { display:grid; gap:10px; margin-top:23px; }
        form>label,legend { text-transform:uppercase; letter-spacing:.06em; color:var(--text); font-size:10px; font-weight:600; } form>label:not(:first-child) { margin-top:14px; }
        form input,textarea { border:1px solid var(--border); border-radius:10px; padding:12px 14px; background:transparent; color:var(--text); width:100%; font-size:12px; outline:none; } textarea { min-height:170px; resize:vertical; line-height:1.7; }
        input::placeholder,textarea::placeholder { color:var(--muted); } input:focus,textarea:focus { border-color:var(--accent); } fieldset { margin-top:15px; min-width:0; } legend { margin-bottom:11px; }
        button { cursor:pointer; } button:disabled { opacity:.55; cursor:default; } button:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
        .audiences { display:flex; border:1px solid var(--border); border-radius:11px; overflow:hidden; } .audiences button { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; min-height:43px; font-size:11px; color:var(--muted); border-right:1px solid var(--border); } .audiences button:last-child { border-right:0; } .audiences button[aria-pressed="true"] { color:var(--accent); background:color-mix(in srgb,var(--accent) 10%,transparent); box-shadow:inset 0 0 0 1px var(--accent); border-radius:9px; }
        .publish { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:10px; width:100%; min-height:49px; border-radius:12px; background:var(--accent); color:#002c27; font-weight:650; font-size:13px; } .helper { display:flex; gap:7px; align-items:center; color:var(--muted); font-size:10px; margin-top:5px; } .helper> :global(svg) { flex-shrink:0; } .error { font-size:12px; color:#c94d45; }
        .published { min-height:540px; } .published header { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding-bottom:18px; border-bottom:1px solid var(--border); }
        .count { font-size:10px; color:var(--accent); border:1px solid var(--accent); border-radius:99px; padding:4px 11px; white-space:nowrap; } .list-tools { display:flex; gap:12px; align-items:center; margin:15px 0; } .search { display:flex; align-items:center; gap:8px; min-width:0; flex:1; height:36px; border:1px solid var(--border); border-radius:9px; padding:0 10px; color:var(--muted); } .search input { background:transparent; color:var(--text); width:100%; min-width:0; font-size:11px; outline:none; } .search:focus-within { border-color:var(--accent); } .filters { display:flex; gap:5px; } .filters button { padding:8px 13px; border:1px solid var(--border); border-radius:9px; font-size:11px; color:var(--text); } .filters button[aria-pressed="true"] { background:var(--accent); color:#002c27; border-color:var(--accent); }
        .notice-list { display:grid; gap:12px; } .notice { display:flex; gap:15px; border:1px solid var(--border); border-radius:12px; padding:15px; }
        .notice-icon { display:grid; place-items:center; flex-shrink:0; width:42px; height:42px; color:var(--muted); border:1px solid var(--border); border-radius:11px; } .notice-body { flex:1; min-width:0; } .notice-heading { display:flex; gap:9px; flex-wrap:wrap; align-items:center; } h3 { color:var(--text); font-size:13px; font-weight:650; overflow-wrap:anywhere; } .audience-tag { font-size:9px; color:var(--muted); background:color-mix(in srgb,var(--muted) 12%,transparent); padding:4px 9px; border-radius:99px; } .state { display:flex; gap:6px; align-items:center; font-size:9px; color:var(--muted); margin-left:auto; } .state i { display:block; width:7px; height:7px; border-radius:50%; background:var(--accent); } .paused i { background:#7e9292; }
        .message { color:var(--muted); font-size:12px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; margin-top:12px; } footer { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-top:14px; padding-top:12px; border-top:1px solid var(--border); } .date { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:10px; } .actions { display:flex; gap:6px; } .actions button { display:flex; align-items:center; gap:7px; border:1px solid var(--border); border-radius:9px; color:var(--text); min-height:33px; padding:6px 10px; font-size:10px; } .actions button:hover { color:var(--accent); border-color:var(--accent); } .actions .delete:hover { color:#c94d45; border-color:#c94d45; } .empty { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:15px; min-height:330px; color:var(--muted); font-size:13px; text-align:center; }
        @media(max-width:1100px) { .columns { grid-template-columns:1fr; } .hero-copy { max-width:100%; } .wireframe { right:-140px; opacity:.18; } .published { min-height:350px; } }
        @media(max-width:600px) { .hero { padding:28px 22px; } .panel { padding:18px; } .wireframe { right:-230px; } .list-tools { flex-wrap:wrap; } .search { flex-basis:100%; } .notice { padding:12px; gap:10px; } .notice-icon { width:33px; height:33px; } .state { margin-left:0; } h2 { font-size:15px; } .audiences button { gap:5px; font-size:10px; } }
      `}</style>
    </div>
  )
}
