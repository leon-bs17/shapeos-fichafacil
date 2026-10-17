'use client'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronDown, ChevronUp, Eye, FileText, GraduationCap, Info, Megaphone, PauseCircle, Plus, Search, Send, Trash2, UserRound, Users, X } from 'lucide-react'

type Publico = 'TODOS' | 'PERSONAL' | 'ALUNO'
type Comunicado = { id:string; titulo:string; mensagem:string; publico:Publico; ativa:boolean; criado_em:string }
type NoticeOption = { value:string; label:string }
const publicoLabel = (value:Publico) => value === 'TODOS' ? 'Todos' : value === 'PERSONAL' ? 'Personais' : 'Alunos'
const dateLabel = (value:string) => new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'})
const timeLabel = (value:string) => new Date(value).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'})
const publicOptions:NoticeOption[] = [{value:'QUALQUER',label:'Todos os públicos'},{value:'TODOS',label:'Todos'},{value:'PERSONAL',label:'Personais'},{value:'ALUNO',label:'Alunos'}]
const statusOptions:NoticeOption[] = [{value:'TODOS',label:'Todos os status'},{value:'ATIVO',label:'Ativos'},{value:'INATIVO',label:'Inativos'}]

export default function AdminComunicadosPage() {
  const queryClient = useQueryClient()
  const [modal,setModal] = useState<'create'|'view'|'delete'|null>(null)
  const [selectedId,setSelectedId] = useState<string|null>(null)
  const [titulo,setTitulo] = useState('')
  const [mensagem,setMensagem] = useState('')
  const [publico,setPublico] = useState<Publico>('TODOS')
  const [salvando,setSalvando] = useState(false)
  const [busyId,setBusyId] = useState<string|null>(null)
  const [erro,setErro] = useState<string|null>(null)
  const [actionError,setActionError] = useState<string|null>(null)
  const [success,setSuccess] = useState<string|null>(null)
  const [busca,setBusca] = useState('')
  const [filtroPublico,setFiltroPublico] = useState('QUALQUER')
  const [filtroStatus,setFiltroStatus] = useState('TODOS')
  const noticeMessageRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = modal === 'view' || modal === 'delete'

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const focus = document.activeElement as HTMLElement|null
    const overflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (focus?.isConnected) focus.focus() }
  },[open])
  useEffect(() => {
    if (modal === 'create') document.getElementById('notice-title')?.focus()
  },[modal])
  useEffect(() => {
    const field = noticeMessageRef.current
    if (!field) return
    const resize = () => {
      field.style.height = 'auto'
      field.style.height = Math.max(150, field.scrollHeight + 2) + 'px'
    }
    resize()
    let previousWidth = field.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const width = field.getBoundingClientRect().width
      if (width !== previousWidth) { previousWidth = width; resize() }
    })
    observer.observe(field)
    return () => observer.disconnect()
  },[mensagem,modal])
  useEffect(() => {
    const html = document.documentElement
    const keyboard = (event:KeyboardEvent) => { if(event.key==='Tab') html.setAttribute('data-notice-search-keyboard','true') }
    const pointer = () => html.removeAttribute('data-notice-search-keyboard')
    document.addEventListener('keydown',keyboard,true)
    document.addEventListener('pointerdown',pointer,true)
    let previousTheme = html.classList.contains('dark')
    let first = 0
    let second = 0
    let suppression:HTMLStyleElement|null = null
    const restore = () => { suppression?.remove(); suppression=null }
    const observer = new MutationObserver(() => {
      const next = html.classList.contains('dark')
      if(next===previousTheme) return
      previousTheme=next
      cancelAnimationFrame(first); cancelAnimationFrame(second); restore()
      suppression=document.createElement('style')
      suppression.textContent='html body [data-admin-route="/admin/comunicados"] [data-admin-content] .notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace.notices-workspace * { transition:none!important; }'
      document.head.appendChild(suppression)
      const workspace = document.querySelector('.notices-workspace')
      if(workspace) void getComputedStyle(workspace).backgroundColor
      first=requestAnimationFrame(()=>{second=requestAnimationFrame(restore)})
    })
    observer.observe(html,{attributes:true,attributeFilter:['class']})
    return () => {
      observer.disconnect(); cancelAnimationFrame(first); cancelAnimationFrame(second); restore()
      document.removeEventListener('keydown',keyboard,true)
      document.removeEventListener('pointerdown',pointer,true)
      html.removeAttribute('data-notice-search-keyboard')
    }
  },[])

  const {data:comunicados,isLoading,error:erroConsulta,refetch} = useQuery({
    queryKey:['admin-notificacoes'],
    queryFn:async () => {
      const {data,error}=await createClient().from('admin_notificacoes').select('id, titulo, mensagem, publico, ativa, criado_em').order('criado_em',{ascending:false})
      if(error) throw error
      return (data ?? []) as Comunicado[]
    }
  })
  const selected = comunicados?.find(item=>item.id===selectedId)
  const filtered = (comunicados??[]).filter(item=>
    (filtroPublico==='QUALQUER'||item.publico===filtroPublico)&&
    (filtroStatus==='TODOS'||item.ativa===(filtroStatus==='ATIVO'))&&
    (item.titulo+' '+item.mensagem).toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
  const ativos = comunicados?.filter(item=>item.ativa).length??0
  const busy = salvando || busyId !== null
  const closeModal = () => { if(!busy) {setModal(null);setErro(null);setActionError(null)} }
  function newNotice() { setErro(null);setActionError(null);setSuccess(null);document.getElementById('notice-title')?.focus();document.getElementById('notice-compose')?.scrollIntoView({behavior:'smooth',block:'nearest'}) }
  function viewNotice(item:Comunicado) {setSelectedId(item.id);setActionError(null);setModal('view')}

  async function publicar(event:FormEvent) {
    event.preventDefault()
    if(salvando) return
    setErro(null)
    if(titulo.trim().length<3||mensagem.trim().length<5) {setErro('Informe um título com pelo menos 3 caracteres e uma mensagem com pelo menos 5.');return}
    setSalvando(true)
    try {
      const supabase=createClient()
      const {data:{user},error:authError}=await supabase.auth.getUser()
      if(authError||!user) throw new Error('Sessão administrativa expirada.')
      const {error}=await supabase.from('admin_notificacoes').insert({titulo:titulo.trim(),mensagem:mensagem.trim(),publico,criado_por:user.id,ativa:true})
      if(error) throw new Error('Não foi possível publicar o comunicado. Tente novamente.')
      setTitulo('');setMensagem('');setPublico('TODOS');setModal(null);setSuccess('Comunicado publicado.')
      await queryClient.invalidateQueries({queryKey:['admin-notificacoes']})
    } catch(error) {setErro(error instanceof Error?error.message:'Não foi possível publicar o comunicado.')}
    finally {setSalvando(false)}
  }
  async function alternar(item:Comunicado) {
    if(busyId) return
    setBusyId(item.id);setActionError(null)
    try {
      const {error}=await createClient().from('admin_notificacoes').update({ativa:!item.ativa}).eq('id',item.id)
      if(error) throw error
      await queryClient.invalidateQueries({queryKey:['admin-notificacoes']})
    } catch {setActionError('Não foi possível alterar o status. Tente novamente.')}
    finally {setBusyId(null)}
  }
  async function excluir() {
    if(!selected||busyId) return
    setBusyId(selected.id);setActionError(null)
    try {
      const {error}=await createClient().from('admin_notificacoes').delete().eq('id',selected.id)
      if(error) throw error
      setModal(null);setSelectedId(null);setSuccess('Comunicado excluído.')
      await queryClient.invalidateQueries({queryKey:['admin-notificacoes']})
    } catch {setActionError('Não foi possível excluir o comunicado. Tente novamente.')}
    finally {setBusyId(null)}
  }

  return <div data-notices-refined className="notices-workspace">
      <section className="hero"><div className="hero-copy"><p className="eyebrow">Comunicação</p><h2 className="notice-banner-title">Comunicados da <span>plataforma</span></h2><p>Publique avisos para alunos e personais e gerencie a comunicação da ShapeOS.</p></div>
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

    <div className="notices-body">
    <section className="notice-panel">
      <header className="notice-panel-heading">
        <div className="notice-panel-title"><h2><FileText size={22} aria-hidden="true"/>Comunicados publicados</h2>{!!comunicados?.length&&<span className="notice-count">{ativos} {ativos===1?'ativo':'ativos'}</span>}</div>
        <button type="button" className="notice-command notice-new-shortcut" onClick={newNotice}><Plus size={17} aria-hidden="true"/>Novo comunicado</button>
      </header>
      <div className="notice-toolbar">
        <label data-admin-search className="notice-search"><Search size={19} aria-hidden="true"/><input value={busca} onChange={event=>setBusca(event.target.value)} placeholder="Buscar comunicado..." aria-label="Buscar comunicado por título ou mensagem"/></label>
        <NoticeSelect label="Público" value={filtroPublico} onChange={setFiltroPublico} options={publicOptions}/>
        <NoticeSelect label="Status" value={filtroStatus} onChange={setFiltroStatus} options={statusOptions}/>
      </div>
      {success&&<p className="notice-feedback" role="status">{success}</p>}
      {erroConsulta ? <div className="notice-empty" role="alert"><p>Não foi possível carregar os comunicados.</p><button className="notice-command" onClick={()=>void refetch()}>Tentar novamente</button></div> :
      isLoading ? <div className="notice-empty" role="status">Carregando comunicados...</div> :
      !filtered.length ? <div className="notice-empty"><Megaphone size={30} aria-hidden="true"/><h3>{comunicados?.length?'Nenhum comunicado encontrado':'Nenhum comunicado publicado'}</h3><p>{comunicados?.length?'Ajuste a busca ou os filtros para encontrar um comunicado.':'Crie um comunicado para informar alunos e personais.'}</p></div> :
      <div className="notice-table-wrap"><table className="notice-table">
        <colgroup><col style={{width:'44%'}}/><col style={{width:'15%'}}/><col style={{width:'13%'}}/><col style={{width:'18%'}}/><col style={{width:'10%'}}/></colgroup>
        <thead><tr><th scope="col">Comunicado</th><th scope="col">Público</th><th scope="col">Status</th><th scope="col">Publicado em</th><th scope="col" className="notice-action-cell">Ações</th></tr></thead>
        <tbody>{filtered.map(item=><tr key={item.id}>
          <td data-label="Comunicado" className="notice-title-cell"><strong>{item.titulo}</strong><p>{item.mensagem}</p></td>
          <td data-label="Público"><span className="notice-audience">{publicoLabel(item.publico)}</span></td>
          <td data-label="Status"><span className="notice-state" data-active={item.ativa}><i/>{item.ativa?'Ativo':'Inativo'}</span></td>
          <td data-label="Publicado em"><time dateTime={item.criado_em}>{dateLabel(item.criado_em)}<small>{timeLabel(item.criado_em)}</small></time></td>
          <td data-label="Ações" className="notice-action-cell"><button type="button" data-admin-view className="notice-command notice-view" onClick={()=>viewNotice(item)} aria-label={'Ver comunicado: '+item.titulo}><Eye size={15} aria-hidden="true"/>Ver</button></td>
        </tr>)}</tbody>
      </table></div>}
      {!isLoading&&!erroConsulta&&!!comunicados?.length&&<div className="notice-list-summary">{filtered.length} {filtered.length===1?'comunicado':'comunicados'}{filtered.length!==(comunicados?.length??0)?' de '+(comunicados?.length??0):''}</div>}
    </section>

    <aside id="notice-compose" className="notice-compose" aria-labelledby="notice-compose-title"><h2 id="notice-compose-title">Novo comunicado</h2><form className="notice-create-form" onSubmit={publicar}>
        <div className="notice-modal-body">
          <label htmlFor="notice-title">Título</label><input id="notice-title" className="notice-field" value={titulo} disabled={salvando} onChange={event=>setTitulo(event.target.value)} maxLength={120} placeholder="Ex.: Manutenção programada" required/>
          <label htmlFor="notice-message">Mensagem</label><textarea ref={noticeMessageRef} id="notice-message" className="notice-field" value={mensagem} disabled={salvando} onChange={event=>setMensagem(event.target.value)} maxLength={1500} rows={6} placeholder="Escreva o comunicado..." required/>
          <NoticeSelect label="Público" value={publico} onChange={value=>setPublico(value as Publico)} options={[{value:'TODOS',label:'Alunos e personais'},{value:'PERSONAL',label:'Personais'},{value:'ALUNO',label:'Alunos'}]}/>
          <p className="notice-helper"><Info size={15}/>O aviso será enviado ao público selecionado.</p>
          {erro&&<p className="notice-error" role="alert">{erro}</p>}
        </div>
        <footer className="notice-modal-footer"><button type="button" className="notice-command" disabled={salvando} onClick={()=>{setTitulo('');setMensagem('');setPublico('TODOS');setErro(null)}}>Cancelar</button><button type="submit" className="notice-command notice-publish" disabled={salvando}><Send size={16} aria-hidden="true"/>{salvando?'Publicando...':'Publicar comunicado'}</button></footer>
      </form>
</aside>
    </div>
    <dialog ref={dialogRef} className="notice-modal" aria-labelledby="notice-modal-title" onCancel={event=>{event.preventDefault();closeModal()}}
      onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal()}}>
      <header className="notice-modal-heading"><h2 id="notice-modal-title">{modal==='create'?'Novo comunicado':modal==='delete'?'Excluir comunicado':'Detalhes do comunicado'}</h2><button type="button" className="notice-command notice-close" aria-label="Fechar janela" disabled={busy} onClick={closeModal} autoFocus><X size={20}/></button></header>
      {modal==='view'&&selected&&<>
        <div className="notice-modal-body notice-detail"><div className="notice-detail-title"><Megaphone size={26}/><h3>{selected.titulo}</h3></div><div className="notice-detail-tags"><span className="notice-audience">{publicoLabel(selected.publico)}</span><span className="notice-state" data-active={selected.ativa}><i/>{selected.ativa?'Ativo':'Inativo'}</span></div><p className="notice-detail-date">Publicado em {dateLabel(selected.criado_em)} às {timeLabel(selected.criado_em)}</p><div className="notice-detail-message">{selected.mensagem}</div>{actionError&&<p role="alert" className="notice-error">{actionError}</p>}</div>
        <footer className="notice-modal-footer"><button className="notice-command notice-danger" disabled={busy} onClick={()=>{setActionError(null);setModal('delete')}}><Trash2 size={16}/>Excluir</button><button className="notice-command" disabled={busy} onClick={()=>void alternar(selected)}><PauseCircle size={16}/>{busyId===selected.id?'Atualizando...':selected.ativa?'Desativar':'Reativar'}</button><button className="notice-command" disabled={busy} onClick={closeModal}>Fechar</button></footer>
      </>}
      {modal==='delete'&&selected&&<>
        <div className="notice-modal-body"><p className="notice-delete-description">Deseja excluir o comunicado <strong>{selected.titulo}</strong>? Esta ação não pode ser desfeita.</p>{actionError&&<p role="alert" className="notice-error">{actionError}</p>}</div>
        <footer className="notice-modal-footer"><button type="button" className="notice-command" disabled={busy} onClick={()=>{setActionError(null);setModal('view')}}>Cancelar</button><button type="button" className="notice-command notice-danger" disabled={busy} onClick={()=>void excluir()}><Trash2 size={16}/>{busyId?'Excluindo...':'Excluir comunicado'}</button></footer>
      </>}
    </dialog>
    <style jsx global>{`

.notices-workspace { --notice-surface:#fcfdf9; --notice-border:#d7ded3; --notice-text:#162623; --notice-muted:#5f6f68; --notice-brand:#129b89; --notice-soft:#e4f3eb; --notice-soft-text:#0d7e70; display:grid; gap:20px; min-width:0; padding-bottom:24px; font-family:'Sora',sans-serif; }
html.dark .notices-workspace { --notice-surface:#091c18; --notice-border:#1c4037; --notice-text:#f5faf9; --notice-muted:#a3becd; --notice-brand:#00e9df; --notice-soft:#123b31; --notice-soft-text:#00e9df; }
.notices-workspace .hero { position:relative; overflow:hidden; min-height:225px; display:flex; align-items:center; padding:35px 36px; border:1px solid var(--notice-border); border-radius:17px; background:radial-gradient(ellipse at 83% 60%,#e4f3eb,#f2f8f1 45%,#fcfdf9); }
html.dark .notices-workspace .hero { background:radial-gradient(ellipse at 83% 60%,#07382e,#071b17 45%,#041512); }
.notices-workspace .hero-copy { position:relative; z-index:2; max-width:80%; }
.notices-workspace .hero h1 { color:var(--notice-text); font-size:46px; line-height:1.12; font-weight:800; letter-spacing:-.045em; }
.notices-workspace .hero h1 span { color:var(--notice-brand); }
.notices-workspace .hero-copy>p:last-child { font-size:16px; line-height:1.6; color:var(--notice-muted); margin-top:14px; }
.notices-workspace .wireframe { position:absolute; width:440px; height:280px; top:5px; right:-30px; transform:rotate(-18deg); color:var(--notice-brand); opacity:.45; pointer-events:none; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel { min-width:0; padding:24px; border:1px solid var(--notice-border)!important; border-radius:15px!important; background:var(--notice-surface)!important; color:var(--notice-text)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel-heading { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; padding-bottom:20px; border-bottom:1px solid var(--notice-border); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel-title { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace h2 { display:flex; align-items:center; gap:10px; font-size:17px; font-weight:650; color:var(--notice-text)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel-title svg { color:var(--notice-brand)!important; flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-count { color:var(--notice-soft-text)!important; background:var(--notice-soft)!important; border:1px solid var(--notice-border); padding:4px 10px; border-radius:999px; font-size:10px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 210px 190px; gap:12px; margin:20px 0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-command,.notice-field,.notice-search,.notice-select-trigger) {
  border:1px solid var(--notice-border)!important; border-radius:13px!important; background:var(--notice-surface)!important; color:var(--notice-text)!important;
  box-shadow:none!important; filter:none!important; transform:none!important; translate:none!important; scale:none!important; animation:none!important;
  transition:background-color 150ms ease,border-color 150ms ease!important;
}
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-command,.notice-select-trigger) { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:10px 14px; font-size:13px; font-weight:500; cursor:pointer; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(button,input,textarea):disabled { opacity:.55; cursor:not-allowed; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace button svg { color:inherit!important; flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace button:focus-visible { outline:2px solid var(--notice-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-field:is(:focus,:focus-visible) { border-color:var(--notice-border)!important; outline:none!important; box-shadow:none!important; }
html:is(.light,.dark)[data-notice-search-keyboard="true"] body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-field:focus-visible { outline:2px solid var(--notice-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search { display:flex!important; align-items:center!important; min-width:0!important; height:48px!important; padding:0 16px!important; gap:13px!important; color:var(--notice-muted)!important; outline:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search:focus-within { border-color:var(--notice-border)!important; outline:none!important; box-shadow:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search input,html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search input:is(:focus,:focus-visible) { border:0!important; background:transparent!important; outline:none!important; box-shadow:none!important; padding:0!important; min-width:0; font-size:13px!important; transition:none!important; color:var(--notice-text)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search svg { color:var(--notice-muted)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace input::placeholder,html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace textarea::placeholder { color:var(--notice-muted)!important; }
html:is(.light,.dark)[data-notice-search-keyboard="true"] body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search:has(input:focus-visible) { outline:2px solid var(--notice-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select { position:relative; min-width:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-trigger { width:100%; height:48px; padding:0 14px; justify-content:space-between; font-size:12px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-trigger span { min-width:0; text-align:left; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-trigger strong { font-weight:500; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-menu { position:absolute; z-index:30; top:calc(100% + 8px); left:0; width:100%; min-width:180px; max-height:240px; overflow:auto; padding:6px; border:1px solid var(--notice-border); border-radius:13px; background:var(--notice-surface); color:var(--notice-text); box-shadow:0 12px 28px #0002; outline:none; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-menu[data-above="true"] { top:auto; bottom:calc(100% + 8px); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-option { min-height:44px; display:flex; gap:8px; align-items:center; justify-content:space-between; padding:10px; font-size:12px; border:1px solid transparent; border-radius:9px; cursor:pointer; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-option[aria-selected="true"] { background:color-mix(in srgb,var(--notice-brand) 7%,transparent); color:var(--notice-brand); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-option[data-active="true"] { border-color:color-mix(in srgb,var(--notice-brand) 40%,transparent); background:color-mix(in srgb,var(--notice-brand) 7%,transparent); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table-wrap { min-width:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table { width:100%; border-collapse:collapse; table-layout:fixed; color:var(--notice-text); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table :is(th,td) { text-align:left!important; vertical-align:middle!important; padding:16px!important; border-bottom:1px solid var(--notice-border)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table th { font-size:10px; text-transform:uppercase; letter-spacing:.07em; font-weight:600; color:var(--notice-muted); background:color-mix(in srgb,var(--notice-muted) 4%,var(--notice-surface)); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td { font-size:12px; overflow-wrap:anywhere; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table .notice-action-cell { text-align:center!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-title-cell strong { display:block; font-size:13px; font-weight:600; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-title-cell p { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; color:var(--notice-muted); font-size:11px; line-height:1.6; margin-top:5px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace time small { display:block; color:var(--notice-muted); font-size:11px; margin-top:4px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-view { min-height:36px; padding:7px 10px; font-size:12px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-audience,.notice-state) { display:inline-flex; align-items:center; gap:6px; width:fit-content; padding:5px 10px; border-radius:999px; font-size:10px; white-space:nowrap; background:color-mix(in srgb,var(--notice-muted) 10%,var(--notice-surface)); color:var(--notice-muted); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-state[data-active="true"] { background:var(--notice-soft); color:var(--notice-soft-text); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-state i { width:6px; height:6px; border-radius:50%; background:currentColor; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-list-summary { padding-top:18px; font-size:12px; color:var(--notice-muted); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center; min-height:230px; padding:24px; color:var(--notice-muted); font-size:13px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-empty h3 { color:var(--notice-text); font-weight:600; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-feedback { color:var(--notice-soft-text); font-size:13px; padding:12px 0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal { width:min(600px,calc(100vw - 32px))!important; max-height:calc(100dvh - 32px)!important; inset:0!important; margin:auto!important; padding:24px!important; border:1px solid var(--notice-border)!important; border-radius:18px!important; background:var(--notice-surface)!important; color:var(--notice-text)!important; overflow:hidden!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal[open][open][open][open] { display:flex!important; flex-direction:column!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal::backdrop { background:rgba(0,0,0,.5)!important; backdrop-filter:blur(3px)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; padding-bottom:18px; border-bottom:1px solid var(--notice-border); flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-close { width:44px; padding:0; flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-create-form { display:flex; flex-direction:column; min-height:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal-body { min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:22px 2px 4px; font-size:13px; line-height:1.65; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal-body :is(label,legend) { display:block; color:var(--notice-text); font-size:11px; font-weight:600; margin-bottom:8px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal-body label:not(:first-child),html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace fieldset { margin-top:18px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-field { width:100%; min-height:48px; padding:12px 14px; font-family:inherit; font-size:13px; outline:none; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace textarea.notice-field { min-height:150px; max-height:none!important; resize:none!important; overflow-y:hidden!important; box-sizing:border-box; flex-shrink:0; line-height:1.7; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-audiences { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-audiences .notice-command { padding:10px 8px; font-size:12px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-audiences [aria-pressed="true"] { background:color-mix(in srgb,var(--notice-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--notice-brand) 40%,transparent)!important; color:var(--notice-brand)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-helper { display:flex; align-items:flex-start; gap:8px; font-size:11px; margin-top:18px; color:var(--notice-muted); }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-helper svg { flex-shrink:0; margin-top:2px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal-footer { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:10px; border-top:1px solid var(--notice-border); padding-top:18px; margin-top:22px; flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-detail-title { display:flex; align-items:flex-start; gap:14px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-detail-title svg { color:var(--notice-brand); flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-detail-title h3 { font-size:20px; font-weight:650; line-height:1.4; overflow-wrap:anywhere; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-detail-tags { display:flex; gap:8px; margin-top:16px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-detail-date { font-size:12px; color:var(--notice-muted); margin-top:12px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-detail-message { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8; font-size:14px; margin-top:22px; padding:18px; border:1px solid var(--notice-border); border-radius:13px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-delete-description { overflow-wrap:anywhere; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-error { color:#b42336; margin-top:16px; font-size:13px; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-danger { color:#b42336!important; }
html.dark body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-error,.notice-danger) { color:#ff8f9b!important; }
@media(hover:hover) and (pointer:fine) {
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-command,.notice-field,.notice-select-trigger):not(:disabled):hover,
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search:not(:has(input:disabled)):hover { background:color-mix(in srgb,var(--notice-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--notice-brand) 40%,transparent)!important; }
}
@media(max-width:1100px) { .notices-workspace .hero-copy { max-width:100%; } .notices-workspace .wireframe { right:-140px; opacity:.18; } }
@media(max-width:767px) {
 .notices-workspace .hero { padding:28px 22px; }
 .notices-workspace .hero h1 { font-size:32px; }
 .notices-workspace .hero-copy>p:last-child { font-size:14px; }
 .notices-workspace .wireframe { right:-230px; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel { padding:18px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel-heading { align-items:stretch; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-panel-heading>.notice-command { width:100%; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace h2 { font-size:15px; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-toolbar { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-search { grid-column:1/-1; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-search input,.notice-field) { font-size:16px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-trigger { font-size:11px; padding:0 10px; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-select-menu { min-width:0; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table,html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table tbody { display:block; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table :is(colgroup,thead) { display:none; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table tr { display:grid; gap:14px; border:1px solid var(--notice-border); border-radius:13px; margin-bottom:12px; padding:16px; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:0!important; border:0!important; text-align:left!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td::before { content:attr(data-label); color:var(--notice-muted); font-size:11px; flex-shrink:0; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td.notice-title-cell { display:block; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td.notice-title-cell::before { display:none; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td.notice-action-cell { justify-content:flex-end; text-align:right!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-table td.notice-action-cell::before { display:none; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-view { min-height:44px; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal { width:calc(100vw - 24px)!important; max-height:calc(100dvh - 24px)!important; padding:20px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-modal-footer .notice-command { flex:1; }
}
@media(max-width:359px) {
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-toolbar { grid-template-columns:minmax(0,1fr); }
 html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-audiences { grid-template-columns:minmax(0,1fr); }
}
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-command.notice-publish { min-height:48px; padding:12px 20px; border:1px solid var(--notice-border)!important; border-radius:13px; background:transparent!important; color:var(--notice-brand)!important; font-size:14px; font-weight:600; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace .notice-command.notice-publish:not(:disabled):hover { background:color-mix(in srgb,var(--notice-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--notice-brand) 40%,transparent)!important; }
@media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .notices-workspace.notices-workspace :is(.notice-command,.notice-field,.notice-search,.notice-select-trigger) { transition:none!important; } }

    
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] { display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:8px!important; width:auto!important; min-width:84px!important; height:36px!important; min-height:36px!important; padding:0 14px!important; border:1px solid var(--notice-border)!important; border-radius:13px!important; background:transparent!important; background-image:none!important; color:var(--notice-text,#162623)!important; font-size:12px!important; font-weight:600!important; line-height:1.5!important; white-space:nowrap!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] svg { width:15px!important; height:15px!important; color:var(--notice-brand)!important; flex-shrink:0!important; }
@media(hover:hover) and (pointer:fine) { html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]:hover:enabled { background:color-mix(in srgb,var(--notice-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--notice-brand) 40%,transparent)!important; } }
@media(max-width:640px) { html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] { height:44px!important; min-height:44px!important; } }
@media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/comunicados"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] { transition:none!important; } }

/* Refined communications workspace and persistent composer. */
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero{min-height:130px!important;padding:24px 28px!important;border-radius:13px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-banner-title{font-size:28px!important;line-height:1.2!important;font-weight:700!important;letter-spacing:-.035em!important;color:var(--notice-text)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-banner-title span{color:var(--notice-brand)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .eyebrow{font-size:9px!important;padding:0!important;border:0!important;background:transparent!important;margin-bottom:8px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero-copy>p:last-child{font-size:13px!important;margin-top:8px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .wireframe{width:330px!important;opacity:.32!important;right:0!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notices-body{display:grid!important;grid-template-columns:minmax(0,1.8fr) minmax(300px,1fr)!important;gap:16px!important;align-items:start!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-panel,.notice-compose{padding:18px!important;border:1px solid var(--notice-border)!important;border-radius:13px!important;background:var(--notice-surface)!important;min-width:0!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-panel-heading{padding-bottom:14px!important;gap:10px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-panel h2,.notice-compose>h2{font-size:15px!important;font-weight:600!important;color:var(--notice-text)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-toolbar{grid-template-columns:minmax(0,1fr) minmax(125px,.5fr) minmax(120px,.5fr)!important;gap:10px!important;margin:14px 0!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-command,.notice-select-trigger,.notice-search{min-height:44px!important;font-size:11px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-search input{font-size:11px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-empty{min-height:200px!important;padding:28px 16px!important;gap:10px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-empty h3{font-size:13px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-empty p{font-size:12px!important;line-height:1.6!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-empty svg{width:26px!important;height:26px!important;color:var(--notice-brand)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose>h2{padding-bottom:16px!important;border-bottom:1px solid var(--notice-border)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose .notice-modal-body{display:grid!important;gap:8px!important;padding:18px 0!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose label,.notice-compose legend{font-size:11px!important;color:var(--notice-text)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose .notice-field{width:100%!important;padding:10px 12px!important;font-size:12px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose input.notice-field{height:44px!important;min-height:44px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose textarea{min-height:150px!important;max-height:none!important;resize:none!important;overflow-y:hidden!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose .notice-helper{font-size:10px!important;line-height:1.6!important;color:var(--notice-muted)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose .notice-modal-footer{display:flex!important;justify-content:flex-end!important;gap:8px!important;padding:16px 0 0!important;border-top:1px solid var(--notice-border)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-publish,.notice-view svg{color:var(--notice-brand)!important;stroke:var(--notice-brand)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table-wrap{overflow-x:auto!important;}
@media(min-width:768px) and (max-width:1199px){html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-search{grid-column:1 / -1!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notices-body{grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr)!important;}
}
@media(max-width:767px){html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero{min-height:150px!important;padding:22px 18px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-banner-title{font-size:26px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero-copy{max-width:100%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .wireframe{right:-170px!important;opacity:.15!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notices-body{grid-template-columns:minmax(0,1fr)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-panel,.notice-compose{padding:14px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-search{grid-column:1 / -1!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-compose .notice-modal-footer{flex-wrap:wrap!important;}
}

@media(min-width:768px){html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-new-shortcut{display:none!important;}}

/* Compact published notices and centered read panel. */
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table-wrap{border:1px solid var(--notice-border)!important;border-radius:13px!important;overflow-x:auto!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table col:nth-child(1){width:35%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table col:nth-child(2){width:16%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table col:nth-child(3){width:15%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table col:nth-child(4){width:20%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table col:nth-child(5){width:14%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table th{padding:12px 10px!important;font-size:9px!important;letter-spacing:.04em!important;background:transparent!important;color:var(--notice-muted)!important;white-space:normal!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table td{padding:12px 10px!important;font-size:11px!important;height:64px!important;border-bottom:0!important;border-top:1px solid var(--notice-border)!important;overflow-wrap:anywhere!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-title-cell strong{font-size:12px!important;font-weight:600!important;color:var(--notice-text)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-title-cell p{font-size:11px!important;line-height:1.5!important;color:var(--notice-muted)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table .notice-view{min-width:60px!important;width:100%!important;min-height:34px!important;height:34px!important;padding:0 6px!important;gap:5px!important;font-size:11px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-audience,.notice-state{font-size:10px!important;padding:5px 8px!important;white-space:nowrap!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-list-summary{font-size:11px!important;padding-top:14px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal{position:fixed!important;inset:0!important;margin:auto!important;width:min(520px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;height:fit-content!important;min-height:0!important;max-height:calc(100dvh - 32px)!important;overflow-y:auto!important;overflow-x:hidden!important;padding:24px!important;border:1px solid var(--notice-border)!important;border-radius:18px!important;background:var(--notice-surface)!important;box-shadow:none!important;transform:none!important;translate:none!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal:not([open]){display:none!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal[open]{display:block!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal::backdrop{background:rgba(0,0,0,.48)!important;backdrop-filter:blur(3px)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal-heading{padding:0 0 18px!important;border-bottom:1px solid var(--notice-border)!important;gap:12px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal-heading h2{font-size:21px!important;line-height:1.3!important;font-weight:650!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-close{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;padding:0!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal-body{padding:18px 0!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-detail-title{display:flex!important;align-items:center!important;gap:12px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-detail-title svg{width:24px!important;height:24px!important;flex-shrink:0!important;color:var(--notice-brand)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-detail-title h3{font-size:16px!important;line-height:1.5!important;font-weight:600!important;color:var(--notice-text)!important;overflow-wrap:anywhere!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-detail-tags{display:flex!important;gap:8px!important;margin-top:12px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-detail-date{font-size:11px!important;color:var(--notice-muted)!important;margin-top:10px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-detail-message{margin-top:16px!important;padding:16px 0 0!important;border:0!important;border-top:1px solid var(--notice-border)!important;border-radius:0!important;background:transparent!important;font-size:13px!important;line-height:1.7!important;color:var(--notice-text)!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal>.notice-modal-footer{display:flex!important;flex-wrap:wrap!important;gap:8px!important;justify-content:flex-end!important;padding:16px 0 0!important;border-top:1px solid var(--notice-border)!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal-footer .notice-command{min-height:44px!important;font-size:11px!important;padding:0 12px!important;}
@media(max-width:767px){html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table-wrap{overflow:visible!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table td{height:auto!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-table .notice-view{min-height:44px!important;height:44px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal{width:calc(100vw - 24px)!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;padding:18px!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .notice-modal-heading h2{font-size:19px!important;}
}

/* Banner heading is flowing text; do not inherit flex section-heading rules. */
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero .hero-copy .notice-banner-title{display:block!important;width:auto!important;max-width:100%!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero .hero-copy .notice-banner-title>span{display:inline!important;position:static!important;white-space:normal!important;}
@media(max-width:767px){
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero .hero-copy{width:100%!important;min-width:0!important;max-width:100%!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero .hero-copy .notice-banner-title{font-size:26px!important;line-height:1.2!important;}
html body [data-admin-route="/admin/comunicados"] :is(#notices-refined,[data-notices-refined]) .hero .hero-copy>p:last-child{max-width:100%!important;overflow-wrap:break-word!important;}
}
`}</style>
  </div>
}
function NoticeSelect({ label: fieldLabel, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: NoticeOption[]
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [above, setAbove] = useState(false)
  const selected = Math.max(0, options.findIndex((option) => option.value === value))

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setAbove(window.innerHeight - rect.bottom < 220 && rect.top > 220)
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

  return <div ref={rootRef} className="notice-select" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="notice-select-trigger"
      aria-label={`Filtrar por ${fieldLabel.toLowerCase()}: ${options[selected].label}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setActive(selected); setOpen(!open) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive(selected); setOpen(true)
        }
      }}>
      <span>{options[selected].label}</span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div ref={listRef} id={id} role="listbox" tabIndex={-1} className="notice-select-menu"
      data-above={above} aria-label={`Opções de ${fieldLabel.toLowerCase()}`} aria-activedescendant={`${id}-${active}`}
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
        className="notice-select-option"
        onPointerDown={(event) => event.preventDefault()}
        onPointerMove={() => setActive(index)}
        onClick={() => choose(index)}>
        <span>{label}</span>
        {value === optionValue && <Check size={17} strokeWidth={2} />}
      </div>)}
    </div>}
  </div>
}
