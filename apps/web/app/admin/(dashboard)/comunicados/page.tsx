'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { X, CalendarDays, CheckCircle2, FileText, GraduationCap, Info, Megaphone, PauseCircle, Search, Send, Trash2, UserRound, Users } from 'lucide-react'
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
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [selectedDelete, setSelectedDelete] = useState<Comunicado | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDelete) return
    const dialog = deleteDialog.current
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [selectedDelete])

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
      suppression.textContent = '.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace :is(#notice-title,#notice-message,*) { transition:none!important; }'
      document.head.appendChild(suppression)
      const workspace = document.querySelector('.notices-workspace')
      if (workspace) window.getComputedStyle(workspace).backgroundColor
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(restore) })
    })
    observer.observe(html, { attributes:true, attributeFilter:['class'] })
    return () => { observer.disconnect(); cancelAnimationFrame(frame); restore() }
  }, [])
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

  async function excluir() {
    if (!selectedDelete || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('admin_notificacoes').delete().eq('id', selectedDelete.id)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
      setSelectedDelete(null)
    } catch {
      setDeleteError('Não foi possível excluir o comunicado. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  function closeDelete() {
    if (!deleting) setSelectedDelete(null)
  }

  const ativos = comunicados?.filter((item) => item.ativa).length ?? 0

  const labelPublico = (p: Publico) => p === 'TODOS' ? 'Todos' : p === 'PERSONAL' ? 'Personais' : 'Alunos'
  const filtrados = (comunicados ?? []).filter(c => (!soAtivos || c.ativa) && (c.titulo+' '+c.mensagem).toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
  return (
    <div className="notices-workspace">
      <section className="hero"><div className="hero-copy"><p className="eyebrow">Comunicação</p><h1>Comunicados da <span>plataforma</span></h1><p>Publique avisos para alunos e personais e gerencie a comunicação da ShapeOS.</p></div>
        <svg className="wireframe" viewBox="0 0 500 300" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth=".7">
            {Array.from({ length: 25 }, (_, row) => {
              const points = Array.from({ length: 65 }, (_, col) => {
                const x = col * 8
                const y = 65 + row * 6 + Math.sin(col / 10 + row / 8) * 34 + Math.cos(col / 16 - row / 7) * 25
                return `${x},${y}`
              }).join(' ')
              return <polyline key={'row'+row} points={points} />
            })}
            {Array.from({ length: 33 }, (_, col) => {
              const points = Array.from({ length: 25 }, (_, row) => {
                const x = col * 16
                const y = 65 + row * 6 + Math.sin(col * 2 / 10 + row / 8) * 34 + Math.cos(col * 2 / 16 - row / 7) * 25
                return `${x},${y}`
              }).join(' ')
              return <polyline key={'col'+col} points={points} />
            })}
          </g>
        </svg>
      </section>
      <div className="columns">
        <section className="panel editor"><h2><Megaphone size={23} />Novo comunicado</h2>
          <form onSubmit={publicar}>
            <label htmlFor="notice-title">Título</label><input id="notice-title" disabled={salvando} value={titulo} onChange={e=>setTitulo(e.target.value)} maxLength={120} placeholder="Ex.: Manutenção programada" />
            <label htmlFor="notice-message">Mensagem</label><textarea id="notice-message" disabled={salvando} value={mensagem} onChange={e=>setMensagem(e.target.value)} maxLength={1500} rows={7} placeholder="Escreva o comunicado..." />
            <fieldset><legend>Público</legend><div className="audiences">{(['TODOS','PERSONAL','ALUNO'] as Publico[]).map(p=><button type="button" key={p} disabled={salvando} aria-pressed={publico===p} onClick={()=>setPublico(p)}>{p==='TODOS'?<Users size={16}/>:p==='PERSONAL'?<UserRound size={16}/>:<GraduationCap size={16}/>} {labelPublico(p)}</button>)}</div></fieldset>
            {erro && <p role="alert" className="error">{erro}</p>}
            <button type="submit" className="publish" disabled={salvando}><Send size={18}/>{salvando?'Publicando...':'Publicar comunicado'}</button>
            <p className="helper"><Info size={14}/>O aviso será enviado ao público selecionado.</p>
          </form>
        </section>
        <section className="panel published">
          <header><h2><FileText size={23}/>Comunicados publicados</h2><span className="count">{ativos} {ativos===1?'ativo':'ativos'}</span></header>
          <div className="list-tools"><label data-admin-search className="search"><Search size={16}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar comunicado..." aria-label="Buscar comunicado"/></label><div className="filters"><button aria-pressed={!soAtivos} onClick={()=>setSoAtivos(false)}>Todos</button><button aria-pressed={soAtivos} onClick={()=>setSoAtivos(true)}>Ativos</button></div></div>
          {erroConsulta ? <p role="alert" className="empty">Não foi possível carregar os comunicados.</p> : isLoading ? <div className="h-48 rounded-2xl skeleton" role="status" aria-label="Carregando comunicados"/> : !filtrados.length ? <div className="empty"><Megaphone size={30}/><p>{comunicados?.length?'Nenhum comunicado encontrado.':'Nenhum comunicado publicado.'}</p></div> : <div className="notice-list">{filtrados.map(item=><article className="notice" key={item.id}>
            <div className="notice-icon"><Megaphone size={21}/></div>
            <div className="notice-body"><div className="notice-heading"><h3>{item.titulo}</h3><span className="audience-tag">{labelPublico(item.publico)}</span><span className={item.ativa?'state':'state paused'}><i/>{item.ativa?'Ativo':'Pausado'}</span></div>
              <p className="message">{item.mensagem}</p>
              <footer><span className="date"><CalendarDays size={15}/>{new Date(item.criado_em).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                <div className="actions"><button onClick={()=>alternar(item)}>{item.ativa?<PauseCircle size={15}/>:<CheckCircle2 size={15}/>} {item.ativa?'Desativar':'Reativar'}</button><button className="delete" onClick={()=>{ setDeleteError(null); setSelectedDelete(item) }} aria-label={`Excluir comunicado: ${item.titulo}`} title="Excluir comunicado"><Trash2 size={15}/></button></div>
              </footer>
            </div>
          </article>)}</div>}
        </section>
      </div>

      <dialog ref={deleteDialog} className="notice-delete-dialog" aria-labelledby="notice-delete-title" aria-describedby="notice-delete-description"
        onCancel={event => { event.preventDefault(); closeDelete() }}
        onClick={event => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDelete()
        }}>
        {selectedDelete && <>
          <header className="notice-delete-heading"><h2 id="notice-delete-title">Excluir comunicado</h2><button type="button" className="notice-delete-close" autoFocus aria-label="Fechar confirmação" disabled={deleting} onClick={closeDelete}><X size={20}/></button></header>
          <p id="notice-delete-description">Deseja excluir o comunicado <strong>{selectedDelete.titulo}</strong>? Esta ação não pode ser desfeita.</p>
          {deleteError && <p className="error" role="alert">{deleteError}</p>}
          <footer className="notice-delete-footer"><button type="button" disabled={deleting} onClick={closeDelete}>Cancelar</button><button type="button" className="notice-delete-confirm" disabled={deleting} onClick={() => void excluir()}><Trash2 size={16}/>{deleting ? 'Excluindo...' : 'Excluir comunicado'}</button></footer>
        </>}
      </dialog>

      <style jsx>{`
        .notices-workspace { --surface:#fcfdf9; --border:#d7ded3; --text:#162623; --muted:#5f6f68; --accent:#129b89; display:grid; gap:20px; padding-bottom:24px; }
        :global(.dark) .notices-workspace { --surface:#071b17; --border:#1c4138; --text:#f1f8f5; --muted:#a5bdcc; --accent:#00e9df; }
        :global(.dark [data-admin-route="/admin/comunicados"]) { background:#041512!important; --shapeos-brand:#00e9df; }
        .hero { position:relative; overflow:hidden; min-height:225px; display:flex; align-items:center; padding:35px 36px; border:1px solid var(--border); border-radius:17px; background:var(--surface); }
        :global(.dark) .hero { background:radial-gradient(ellipse at 83% 60%,#07382e,#071b17 45%,#041512); }
        .hero-copy { position:relative; z-index:2; max-width:80%; } .eyebrow { font-size:11px!important; text-transform:uppercase; letter-spacing:.2em; font-weight:700; color:var(--accent)!important; margin-bottom:18px; }
        h1 { color:var(--text); font-size:clamp(29px,3.2vw,47px); line-height:1.15; font-weight:800; letter-spacing:-.04em; } h1 span { color:var(--accent); } .hero-copy>p:last-child { font-size:15px; line-height:1.6; color:var(--muted); margin-top:14px; } .wireframe { position:absolute; width:440px; height:280px; top:5px; right:-30px; transform:rotate(-18deg); color:var(--accent); opacity:.45; pointer-events:none; }
        .columns { display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1.4fr); gap:20px; align-items:start; }
        .panel { border:1px solid var(--border); border-radius:15px; padding:23px; background:var(--surface); } h2 { display:flex; align-items:center; gap:12px; font-size:17px; font-weight:650; color:var(--text); } h2> :global(svg) { color:var(--accent); flex-shrink:0; }
        .editor h2 { padding-bottom:20px; border-bottom:1px solid var(--border); } form { display:grid; gap:10px; margin-top:23px; }
        form>label,legend { text-transform:uppercase; letter-spacing:.06em; color:var(--text); font-size:10px; font-weight:600; } form>label:not(:first-child) { margin-top:14px; }
        form input,textarea { border:1px solid var(--border); border-radius:10px; padding:12px 14px; background:transparent; color:var(--text); width:100%; font-size:12px; outline:none; } textarea { min-height:170px; resize:vertical; line-height:1.7; }
        input::placeholder,textarea::placeholder { color:var(--muted); } input:focus,textarea:focus { border-color:var(--accent); } fieldset { margin-top:15px; min-width:0; } legend { margin-bottom:11px; }
        button { cursor:pointer; } button:disabled { opacity:.55; cursor:default; } button:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
        .audiences { display:flex; border:1px solid var(--border); border-radius:11px; overflow:hidden; } .audiences button { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; min-height:43px; font-size:11px; color:var(--muted); border-right:1px solid var(--border); } .audiences button:last-child { border-right:0; } .audiences button[aria-pressed="true"] { color:var(--accent); background:color-mix(in srgb,var(--accent) 10%,transparent); box-shadow:none; border-radius:0; }
        .publish { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:10px; width:100%; min-height:49px; border-radius:12px; background:var(--accent); color:#002c27; font-weight:650; font-size:13px; } .helper { display:flex; gap:7px; align-items:center; color:var(--muted); font-size:10px; margin-top:5px; } .helper> :global(svg) { flex-shrink:0; } .error { font-size:12px; color:#c94d45; }
        .published { min-height:540px; } .published header { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding-bottom:18px; border-bottom:1px solid var(--border); }
        .count { font-size:10px; color:var(--accent); border:1px solid var(--accent); border-radius:99px; padding:4px 11px; white-space:nowrap; } .list-tools { display:flex; gap:12px; align-items:center; margin:15px 0; } .search { display:flex; align-items:center; gap:8px; min-width:0; flex:1; height:36px; border:1px solid var(--border); border-radius:9px; padding:0 10px; color:var(--muted); } .search input { background:transparent; color:var(--text); width:100%; min-width:0; font-size:11px; outline:none; } .search:focus-within { border-color:var(--accent); } .filters { display:flex; gap:5px; } .filters button { padding:8px 13px; border:1px solid var(--border); border-radius:9px; font-size:11px; color:var(--text); } .filters button[aria-pressed="true"] { background:var(--accent); color:#002c27; border-color:var(--accent); }
        .notice-list { display:grid; gap:12px; } .notice { display:flex; gap:15px; border:1px solid var(--border); border-radius:12px; padding:15px; }
        .notice-icon { display:grid; place-items:center; flex-shrink:0; width:42px; height:42px; color:var(--muted); border:1px solid var(--border); border-radius:11px; } .notice-body { flex:1; min-width:0; } .notice-heading { display:flex; gap:9px; flex-wrap:wrap; align-items:center; } h3 { color:var(--text); font-size:13px; font-weight:650; overflow-wrap:anywhere; } .audience-tag { font-size:9px; color:var(--muted); background:color-mix(in srgb,var(--muted) 12%,transparent); padding:4px 9px; border-radius:99px; } .state { display:flex; gap:6px; align-items:center; font-size:9px; color:var(--muted); margin-left:auto; } .state i { display:block; width:7px; height:7px; border-radius:50%; background:var(--accent); } .paused i { background:#7e9292; }
        .message { color:var(--muted); font-size:12px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; margin-top:12px; } footer { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-top:14px; padding-top:12px; border-top:1px solid var(--border); } .date { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:10px; } .actions { display:flex; gap:6px; } .actions button { display:flex; align-items:center; gap:7px; border:1px solid var(--border); border-radius:9px; color:var(--text); min-height:33px; padding:6px 10px; font-size:10px; }   .empty { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:15px; min-height:330px; color:var(--muted); font-size:13px; text-align:center; }
        @media(max-width:1100px) { .columns { grid-template-columns:1fr; } .hero-copy { max-width:100%; } .wireframe { right:-140px; opacity:.18; } .published { min-height:350px; } }
        @media(max-width:600px) { .hero { padding:28px 22px; } .panel { padding:18px; } .wireframe { right:-230px; } .list-tools { flex-wrap:wrap; } .search { flex-basis:100%; } .notice { padding:12px; gap:10px; } .notice-icon { width:33px; height:33px; } .state { margin-left:0; } h2 { font-size:15px; } .audiences button { gap:5px; font-size:10px; } }
        :global(html:not(.dark)) .publish { color:#fff; }
        :global(html:not(.dark)) .filters button[aria-pressed="true"],
        :global(html:not(.dark)) .audiences button[aria-pressed="true"] { background:#e4f3eb; color:#0d7e70; border-color:#129b89; }
        :global(html:not(.dark)) .audiences button[aria-pressed="true"] { border-color:var(--border); }
        :global(html.dark) .audiences button[aria-pressed="true"] { background:color-mix(in srgb,#00e9df 10%,#091c18); color:#00e9df; border-color:var(--border); }
        :global(html:not(.dark)) .wireframe { color:#008d85; }
        :global(html:not(.dark)) input::placeholder,
        :global(html:not(.dark)) textarea::placeholder { color:#7b8983; }

        :global(html:not(.dark)) .audience-tag { background:#eef1e9; color:#5f6f68; }
        :global(html:not(.dark)) .paused i { background:#7b8983; }

        /* Shared input and command treatment in both themes. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.editor input,.editor textarea,[data-admin-search],.audiences button,.filters button,.publish,.actions button,.notice-delete-dialog button)) {
          border:1px solid var(--border)!important; border-radius:13px!important;
          background:var(--surface)!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
          box-shadow:none!important; filter:none!important; transform:none!important;
          translate:none!important; scale:none!important; animation:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.publish,.actions button,.notice-delete-dialog button)) { color:var(--text)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .audiences), :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .filters) { display:flex; gap:6px; border:0; border-radius:0; overflow:visible; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .audiences button) { min-height:44px; padding:8px; min-width:0; font-size:11px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .filters button) { min-height:44px; padding:8px 14px; color:var(--muted)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.audiences button,.filters button)[aria-pressed="true"]) {
          background:color-mix(in srgb,var(--accent) 7%,transparent)!important;
          color:var(--accent)!important; border-color:var(--border)!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .search input) { background:transparent!important; box-shadow:none!important; outline:none!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.actions .delete,.notice-delete-confirm)) { color:#b42336!important; }
        :global(html.dark [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.actions .delete,.notice-delete-confirm)) { color:#ff8f9b!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .actions button) { min-height:44px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(input,textarea):disabled) { opacity:.55; cursor:not-allowed; }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.editor input,.editor textarea,[data-admin-search],.audiences button,.filters button,.publish,.actions button,.notice-delete-dialog button):not(:disabled):not(.delete):not(.notice-delete-confirm):not(:has(input:disabled)):hover) {
            background:color-mix(in srgb,var(--accent) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;
          }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.actions .delete,.notice-delete-confirm):hover:enabled) { background:rgba(180,35,54,.07)!important; border-color:rgba(180,35,54,.4)!important; }
          :global(html.dark [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(.actions .delete,.notice-delete-confirm):hover:enabled) { background:rgba(255,143,155,.07)!important; border-color:rgba(255,143,155,.4)!important; }
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-dialog) {
          width:min(500px,calc(100vw - 32px)); margin:auto; padding:24px; border:1px solid var(--border);
          border-radius:18px; background:var(--surface); color:var(--text); max-height:calc(100dvh - 32px); overflow-y:auto;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-heading) { display:flex; align-items:center; justify-content:space-between; gap:16px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-close) { display:grid; place-items:center; width:44px; height:44px; flex-shrink:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-dialog > p) { margin-top:18px; color:var(--muted); font-size:14px; line-height:1.6; overflow-wrap:anywhere; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-dialog > p.error) { color:#b42336; }
        :global(html.dark [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-dialog > p.error) { color:#ff8f9b; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-footer) { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:10px; margin-top:24px; padding-top:18px; border-top:1px solid var(--border); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-footer button) { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:10px 14px; font-size:13px; }
        @media(max-width:767px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace :is(#notice-title,#notice-message,.search input)) { font-size:16px!important; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .list-tools) { flex-wrap:wrap; align-items:stretch; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .search) { flex-basis:100%; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .filters) { width:100%; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .filters button) { flex:1; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-dialog) { width:calc(100vw - 24px); padding:20px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .notice-delete-footer button) { flex:1; }
        }
        @media(max-width:359px) { :global(html:is(.light,.dark) [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace .audiences) { flex-direction:column; } }

      `}</style>
    </div>
  )
}
