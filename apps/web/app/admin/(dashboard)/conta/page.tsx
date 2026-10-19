'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, UserRound, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

type Account = { nome:string|null; email:string|null }
function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa ter no mínimo 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha)) return 'A senha precisa ter pelo menos uma letra.'
  if (!/[0-9]/.test(senha)) return 'A senha precisa ter pelo menos um número.'
  return null
}

export default function ContaAdminPage() {
  const [senha,setSenha] = useState('')
  const [confirmar,setConfirmar] = useState('')
  const [mostrarSenha,setMostrarSenha] = useState(false)
  const [mostrarConfirmar,setMostrarConfirmar] = useState(false)
  const [erro,setErro] = useState<string|null>(null)
  const [ok,setOk] = useState(false)
  const [carregando,setCarregando] = useState(false)
  const novaSenhaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const html=document.documentElement
    const keyboard=(event:KeyboardEvent)=>{if(event.key==='Tab')html.setAttribute('data-account-keyboard','true')}
    const pointer=()=>html.removeAttribute('data-account-keyboard')
    document.addEventListener('keydown',keyboard,true)
    document.addEventListener('pointerdown',pointer,true)
    let previousTheme=html.classList.contains('dark')
    let first=0
    let second=0
    let suppression:HTMLStyleElement|null=null
    const restore=()=>{suppression?.remove();suppression=null}
    const observer=new MutationObserver(()=>{
      const theme=html.classList.contains('dark')
      if(theme===previousTheme)return
      previousTheme=theme
      cancelAnimationFrame(first);cancelAnimationFrame(second);restore()
      suppression=document.createElement('style')
      suppression.textContent='html body [data-admin-route="/admin/conta"] [data-admin-content] .account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace.account-workspace * { transition:none!important; }'
      document.head.appendChild(suppression)
      const root=document.querySelector('.account-workspace')
      if(root)void getComputedStyle(root).backgroundColor
      first=requestAnimationFrame(()=>{second=requestAnimationFrame(restore)})
    })
    observer.observe(html,{attributes:true,attributeFilter:['class']})
    return ()=>{
      observer.disconnect();cancelAnimationFrame(first);cancelAnimationFrame(second);restore()
      document.removeEventListener('keydown',keyboard,true);document.removeEventListener('pointerdown',pointer,true)
      html.removeAttribute('data-account-keyboard')
    }
  },[])

  const {data:user,isLoading,error:profileError,refetch}=useQuery({
    queryKey:['admin-user'],
    queryFn:async()=>{
      const supabase=createClient()
      const {data:{user},error:authError}=await supabase.auth.getUser()
      if(authError||!user)throw new Error('Não autenticado')
      const {data,error}=await supabase.from('usuarios').select('nome, email').eq('id',user.id).single()
      if(error)throw error
      return data as Account|null
    }
  })
  const nome=user?.nome?.trim()||'Administrador'
  const initials=nome.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase('pt-BR')
  async function handleSubmit(event:FormEvent) {
    event.preventDefault()
    if(carregando)return
    setErro(null)
    const problema=validarSenhaForte(senha)
    if(problema){setErro(problema);return}
    if(senha!==confirmar){setErro('As senhas não coincidem.');return}
    setCarregando(true)
    try {
      const {error}=await createClient().auth.updateUser({password:senha})
      if(error)throw error
      setOk(true);setSenha('');setConfirmar('');setMostrarSenha(false);setMostrarConfirmar(false)
    }catch{setErro('Não foi possível alterar a senha. Tente novamente.')}
    finally{setCarregando(false)}
  }

  return <div className="account-workspace" data-account-refined>
    <header className="account-hero">
      <div className="account-hero-copy"><p className="eyebrow">Identidade</p><h2 className="account-banner-title">Minha <span>conta</span></h2><p className="account-subtitle">Gerencie seus dados e a segurança da sua conta.</p></div>
      <AccountWireframe/>
    </header>
    <div className="account-columns">
      <section className="account-panel" aria-labelledby="account-data-title">
        <header className="account-panel-heading"><UserRound size={24} aria-hidden="true"/><div><h2 id="account-data-title">Dados da conta</h2><p>Informações da sua conta de administrador.</p></div></header>
        {isLoading?<div className="account-loading" role="status">Carregando dados da conta...</div>:profileError?<div className="account-profile-error"><p role="alert">Não foi possível carregar os dados da conta.</p><button type="button" className="account-command" onClick={()=>void refetch()}>Tentar novamente</button></div>:<>
          <div className="account-identity"><span className="account-avatar" aria-hidden="true">{initials}</span><div><h3>{nome}</h3><span className="account-role"><Shield size={12} aria-hidden="true"/>Administrador</span></div></div>
          <dl className="account-data"><div><dt>Nome</dt><dd>{user?.nome||'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{user?.email||'Não informado'}</dd></div></dl>
        </>}
      </section>
      <section className="account-panel account-security" aria-labelledby="account-security-title">
        <header className="account-panel-heading"><KeyRound size={24} aria-hidden="true"/><div><h2 id="account-security-title">Segurança da conta</h2><p>Atualize sua senha de acesso.</p></div></header>
        {ok?<div className="account-success" role="status"><CheckCircle2 size={24} aria-hidden="true"/><div><h3>Senha alterada com sucesso!</h3><p>Sua nova senha já pode ser usada para acessar a conta.</p></div><button type="button" className="account-command" onClick={()=>{setOk(false);requestAnimationFrame(()=>novaSenhaRef.current?.focus())}}>Alterar novamente</button></div>:
        <form onSubmit={handleSubmit} className="account-form">
          <div className="account-form-field"><label htmlFor="conta-nova-senha">Nova senha</label>
            <div className="account-password"><input ref={novaSenhaRef} id="conta-nova-senha" type={mostrarSenha?'text':'password'} placeholder="Digite a nova senha" value={senha} onChange={event=>setSenha(event.target.value)} autoComplete="new-password" required disabled={carregando} aria-describedby="account-password-help" aria-invalid={!!erro}/>
              <button type="button" className="account-visibility" aria-label={mostrarSenha?'Ocultar nova senha':'Mostrar nova senha'} aria-pressed={mostrarSenha} aria-controls="conta-nova-senha" disabled={carregando} onClick={()=>setMostrarSenha(!mostrarSenha)}>{mostrarSenha?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div><p id="account-password-help">Use pelo menos 8 caracteres, com letras e números.</p>
          </div>
          <div className="account-form-field"><label htmlFor="conta-confirmar">Confirmar nova senha</label>
            <div className="account-password"><input id="conta-confirmar" type={mostrarConfirmar?'text':'password'} placeholder="Repita a nova senha" value={confirmar} onChange={event=>setConfirmar(event.target.value)} autoComplete="new-password" required disabled={carregando} aria-invalid={!!erro}/>
              <button type="button" className="account-visibility" aria-label={mostrarConfirmar?'Ocultar confirmação da senha':'Mostrar confirmação da senha'} aria-pressed={mostrarConfirmar} aria-controls="conta-confirmar" disabled={carregando} onClick={()=>setMostrarConfirmar(!mostrarConfirmar)}>{mostrarConfirmar?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div>
          </div>
          {erro&&<p className="account-error" role="alert">{erro}</p>}
          <div className="account-form-footer"><button type="submit" className="account-command" disabled={carregando}>{carregando&&<Loader2 className="account-spinner" size={16} aria-hidden="true"/>}{carregando?'Salvando...':'Salvar nova senha'}</button></div>
        </form>}
      </section>
    </div>
    <style jsx global>{`

.account-workspace { --account-surface:#fcfdf9; --account-border:#d7ded3; --account-text:#162623; --account-muted:#5f6f68; --account-brand:#129b89; --account-soft:#e4f3eb; --account-soft-text:#0d7e70; display:grid; gap:20px; min-width:0; padding-bottom:24px; font-family:'Sora',sans-serif; }
html.dark .account-workspace { --account-surface:#091c18; --account-border:#1c4037; --account-text:#f5faf9; --account-muted:#a3becd; --account-brand:#00e9df; --account-soft:#123b31; --account-soft-text:#00e9df; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-hero { min-height:225px; padding:35px 36px; display:flex; align-items:center; position:relative; overflow:hidden; border:1px solid var(--account-border)!important; border-radius:17px!important; background:radial-gradient(ellipse at 83% 60%,#e4f3eb,#f2f8f1 45%,#fcfdf9)!important; }
html.dark body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-hero { background:radial-gradient(ellipse at 83% 60%,#073d32,#071d18 48%,#041512)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-hero-copy { position:relative; z-index:1; max-width:72%; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .eyebrow { display:inline-flex!important; align-items:center; justify-content:center; width:fit-content!important; max-width:100%; min-height:28px; box-sizing:border-box; padding:6px 16px!important; margin:0 0 17px!important; border:1px solid var(--account-brand)!important; border-radius:999px!important; background:transparent!important; color:var(--account-brand)!important; font-family:'Sora',sans-serif; font-size:10px!important; font-weight:650!important; line-height:14px!important; letter-spacing:.1em!important; text-transform:uppercase; box-shadow:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace h1 { color:var(--account-text)!important; font-size:46px!important; font-weight:800!important; line-height:1.12!important; letter-spacing:-.045em!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace h1 span { color:var(--account-brand)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-subtitle { color:var(--account-muted)!important; font-size:16px!important; line-height:1.6!important; font-weight:400!important; margin-top:13px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-wireframe { position:absolute; right:0; top:50%; width:40%; max-width:480px; height:auto; transform:translateY(-50%); pointer-events:none; color:var(--account-brand); }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-columns { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.2fr); gap:20px; align-items:stretch; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-panel { display:flex; flex-direction:column; min-width:0; padding:26px; border:1px solid var(--account-border)!important; border-radius:15px!important; background:var(--account-surface)!important; color:var(--account-text)!important; box-shadow:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-panel-heading { display:flex; align-items:flex-start; gap:14px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-panel-heading svg { color:var(--account-brand)!important; flex-shrink:0; margin-top:1px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace h2 { color:var(--account-text)!important; font-size:17px!important; font-weight:650!important; line-height:1.4; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-panel-heading p { color:var(--account-muted)!important; font-size:12px; line-height:1.65; margin-top:6px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-identity { display:flex; align-items:center; gap:16px; margin-top:28px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-avatar { display:grid; place-items:center; width:64px; height:64px; flex-shrink:0; border-radius:50%; background:var(--account-soft)!important; color:var(--account-soft-text)!important; font-weight:650; font-size:22px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-identity h3 { font-size:17px; font-weight:650; color:var(--account-text)!important; overflow-wrap:anywhere; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-role { display:inline-flex; padding:5px 10px; font-size:11px; font-weight:500; border-radius:999px; color:var(--account-soft-text)!important; background:var(--account-soft)!important; margin-top:8px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-data { display:grid; gap:22px; margin-top:28px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace :is(.account-data dt,.account-form label) { display:block; color:var(--account-muted)!important; font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; margin-bottom:10px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-data dd { border:1px solid var(--account-border); border-radius:13px; min-height:48px; padding:13px 14px; font-size:13px; line-height:1.6; color:var(--account-text); overflow-wrap:anywhere; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-form { display:flex; flex-direction:column; gap:26px; margin-top:28px; flex:1; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password { display:flex; align-items:center; min-width:0; height:48px; border:1px solid var(--account-border)!important; border-radius:13px!important; background:var(--account-surface)!important; padding-left:14px; box-shadow:none!important; outline:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password input,html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password input:is(:focus,:focus-visible) { flex:1; min-width:0; width:100%; height:100%; padding:0; border:0!important; outline:none!important; box-shadow:none!important; background:transparent!important; color:var(--account-text)!important; font-size:13px; font-family:inherit; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password input::placeholder { color:var(--account-muted)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password:focus-within { border-color:var(--account-border)!important; outline:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-form-field>p { color:var(--account-muted); font-size:11px; line-height:1.65; margin-top:10px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-command { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:11px 16px; min-height:48px; border:1px solid var(--account-border)!important; border-radius:13px!important; background:var(--account-surface)!important; color:var(--account-text)!important; font-family:inherit; font-size:13px; font-weight:500; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; cursor:pointer; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-visibility { display:grid; place-items:center; min-width:44px; height:44px; flex-shrink:0; margin:1px; border:1px solid transparent; border-radius:13px; color:var(--account-muted)!important; background:transparent; transition:background-color 150ms ease,border-color 150ms ease; cursor:pointer; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace button:focus-visible { outline:2px solid var(--account-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark)[data-account-keyboard="true"] body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password:has(input:focus-visible) { outline:2px solid var(--account-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace button:disabled,html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password:has(input:disabled) { opacity:.55; cursor:not-allowed; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-form-footer { display:flex; justify-content:flex-end; margin-top:auto; padding-top:6px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-error { font-size:13px; line-height:1.6; color:#b42336; }
html.dark body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-error { color:#ff8f9b; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success { display:flex; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-top:28px; padding:18px; border:1px solid var(--account-border); border-radius:13px; background:var(--account-soft); color:var(--account-soft-text); }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success>svg { flex-shrink:0; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success>div { flex:1; min-width:170px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success h3 { font-size:14px; font-weight:600; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success p { font-size:12px; line-height:1.7; margin-top:7px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success button { margin-left:auto; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace :is(.account-loading,.account-profile-error) { color:var(--account-muted); font-size:13px; padding:28px 0; line-height:1.7; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-profile-error button { margin-top:18px; }
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-spinner { animation:account-spin 1s linear infinite; }
@keyframes account-spin { to { transform:rotate(360deg); } }
@media(hover:hover) and (pointer:fine) {
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-command:not(:disabled):hover,
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password:not(:has(input:disabled)):hover { background:color-mix(in srgb,var(--account-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--account-brand) 40%,transparent)!important; }
}
@media(max-width:900px) {
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-columns { grid-template-columns:minmax(0,1fr); }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-hero-copy { max-width:85%; }
}
@media(max-width:767px) {
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-hero { padding:28px 22px; min-height:225px; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-hero-copy { max-width:100%; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace h1 { font-size:32px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-subtitle { font-size:14px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-wireframe { width:280px; max-width:none; right:-140px; opacity:.18; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-panel { padding:22px; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace h2 { font-size:16px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-password input { font-size:16px!important; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-form-footer .account-command { width:100%; }
 html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-success button { width:100%; }
}
@media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace :is(.account-password,.account-command,.account-visibility) { transition:none!important; } html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-spinner { animation:none; } }


html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-visibility,
html:is(.light,.dark) body [data-admin-route="/admin/conta"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .account-workspace.account-workspace .account-visibility:hover {
  background:transparent!important; border-color:transparent!important; box-shadow:none!important;
}

    html body :is(#account-refined,[data-account-refined]) .account-hero{min-height:130px!important;padding:22px 26px!important;border-radius:16px!important}
html body :is(#account-refined,[data-account-refined]) .account-banner-title{display:block!important;margin:5px 0 8px!important;font-size:28px!important;font-weight:650!important;line-height:1.15!important;letter-spacing:-.035em!important;color:var(--account-text)!important}
html body :is(#account-refined,[data-account-refined]) .account-banner-title span{display:inline!important;color:var(--account-brand)!important}
html body :is(#account-refined,[data-account-refined]) .eyebrow{min-height:0!important;padding:4px 10px!important;margin:0 0 6px!important;font-size:9px!important}
html body :is(#account-refined,[data-account-refined]) .account-subtitle{font-size:12px!important;margin-top:8px!important;line-height:1.5!important}
html body :is(#account-refined,[data-account-refined]) .account-columns{gap:16px!important;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)!important;align-items:start!important}
html body :is(#account-refined,[data-account-refined]) .account-panel{padding:20px!important;border-radius:16px!important;box-shadow:none!important}
html body :is(#account-refined,[data-account-refined]) .account-panel-heading{gap:10px!important;align-items:center!important;padding-bottom:16px!important;border-bottom:1px solid var(--account-border)!important}
html body :is(#account-refined,[data-account-refined]) .account-panel-heading>svg{width:20px!important;height:20px!important;margin:0!important}
html body :is(#account-refined,[data-account-refined]) .account-panel-heading h2{font-size:15px!important;line-height:1.4!important}
html body :is(#account-refined,[data-account-refined]) .account-panel-heading p{font-size:11px!important;margin-top:3px!important;line-height:1.5!important}
html body :is(#account-refined,[data-account-refined]) .account-identity{gap:12px!important;margin-top:18px!important}
html body :is(#account-refined,[data-account-refined]) .account-avatar{width:44px!important;height:44px!important;min-width:44px!important;max-width:44px!important;min-height:44px!important;max-height:44px!important;flex:0 0 44px!important;aspect-ratio:1!important;border-radius:50%!important;padding:0!important;font-size:14px!important;line-height:1!important}
html body :is(#account-refined,[data-account-refined]) .account-identity>div{min-width:0!important}
html body :is(#account-refined,[data-account-refined]) .account-identity h3{font-size:15px!important}
html body :is(#account-refined,[data-account-refined]) .account-role{padding:3px 7px!important;font-size:10px!important;margin-top:5px!important}
html body :is(#account-refined,[data-account-refined]) .account-data{gap:16px!important;margin-top:20px!important}
html body :is(#account-refined,[data-account-refined]) .account-data dt{font-size:10px!important;margin-bottom:6px!important}
html body :is(#account-refined,[data-account-refined]) .account-data dd{min-height:0!important;padding:0 0 12px!important;border:0!important;border-bottom:1px solid var(--account-border)!important;border-radius:0!important;font-size:12px!important;line-height:1.6!important}
html body :is(#account-refined,[data-account-refined]) .account-form{gap:18px!important;margin-top:18px!important}
html body :is(#account-refined,[data-account-refined]) .account-form label{font-size:10px!important;margin-bottom:7px!important}
html body :is(#account-refined,[data-account-refined]) .account-password{height:44px!important;padding-left:12px!important;border-radius:13px!important;box-shadow:none!important}
html body :is(#account-refined,[data-account-refined]) .account-password input{font-size:12px!important}
html body :is(#account-refined,[data-account-refined]) .account-visibility{width:42px!important;min-width:42px!important;height:42px!important;margin:0!important}
html body :is(#account-refined,[data-account-refined]) .account-form-field>p{font-size:10px!important;margin-top:7px!important;line-height:1.5!important}
html body :is(#account-refined,[data-account-refined]) .account-form-footer{margin-top:0!important;padding-top:16px!important;border-top:1px solid var(--account-border)!important}
html body :is(#account-refined,[data-account-refined]) .account-command{min-height:44px!important;padding:10px 16px!important;font-size:12px!important;border-radius:13px!important;box-shadow:none!important;transform:none!important}
html body :is(#account-refined,[data-account-refined]) .account-password:has(input:focus){border-color:var(--account-brand)!important;outline:none!important;box-shadow:none!important}
html body :is(#account-refined,[data-account-refined]) .account-password:has(input:focus-visible){border-color:var(--account-brand)!important;outline:none!important;box-shadow:none!important}
html body :is(#account-refined,[data-account-refined]) .account-password:not(:has(input:disabled)):hover{background:color-mix(in srgb,var(--account-brand) 7%,var(--account-surface))!important;border-color:color-mix(in srgb,var(--account-brand) 40%,var(--account-border))!important;box-shadow:none!important;transform:none!important}
html body :is(#account-refined,[data-account-refined]) .account-command:not(:disabled):hover{background:color-mix(in srgb,var(--account-brand) 7%,var(--account-surface))!important;border-color:color-mix(in srgb,var(--account-brand) 40%,var(--account-border))!important;box-shadow:none!important;transform:none!important}
html body :is(#account-refined,[data-account-refined]) .account-success{margin-top:18px!important;padding:16px!important;gap:10px!important}
html body :is(#account-refined,[data-account-refined]) .account-success p{font-size:11px!important;line-height:1.5!important}
@media(max-width:767px){html body :is(#account-refined,[data-account-refined]) .account-hero{min-height:150px!important;padding:20px!important}
html body :is(#account-refined,[data-account-refined]) .account-hero-copy{max-width:100%!important}
html body :is(#account-refined,[data-account-refined]) .account-banner-title{font-size:25px!important;max-width:100%!important;white-space:normal!important}
html body :is(#account-refined,[data-account-refined]) .account-subtitle{font-size:11px!important}
html body :is(#account-refined,[data-account-refined]) .account-columns{grid-template-columns:minmax(0,1fr)!important;gap:14px!important}
html body :is(#account-refined,[data-account-refined]) .account-panel{padding:18px!important;border-radius:13px!important}
html body :is(#account-refined,[data-account-refined]) .account-command{width:100%!important;min-height:44px!important}
html body :is(#account-refined,[data-account-refined]) .account-form-footer{display:block!important}
html body :is(#account-refined,[data-account-refined]) .account-success>div{min-width:0!important;flex-basis:calc(100% - 36px)!important}}
html body :is(#account-refined,[data-account-refined]) .account-avatar{background:linear-gradient(145deg,#6f86b6,#4f678f)!important;color:#fff!important;}
html body :is(#account-refined,[data-account-refined]) .account-role{display:inline-flex!important;align-items:center!important;gap:5px!important;border:0!important;border-radius:999px!important;padding:3px 7px!important;background:hsl(var(--info) / .1)!important;color:hsl(var(--info))!important;font-size:10px!important;font-weight:500!important;line-height:1.5!important;}
html body :is(#account-refined,[data-account-refined]) .account-role svg{width:12px!important;height:12px!important;flex-shrink:0!important;color:inherit!important;}
`}</style>
  </div>
}

function AccountWireframe() {
  return <svg className="account-wireframe" viewBox="0 0 480 260" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth=".8">
      {[57,80,104,127].map((radius,index)=><circle key={radius} cx="252" cy="130" r={radius} opacity={.26-index*.04}/>)}
      <ellipse cx="252" cy="130" rx="165" ry="81" transform="rotate(-23 252 130)" opacity=".25"/>
      <path d="M213 146v-22c0-22 17-39 39-39s39 17 39 39v20M222 155v-31c0-17 13-30 30-30s30 13 30 30v21c0 12 5 20 13 26M231 168v-44c0-12 9-21 21-21s21 9 21 21v22c0 17 6 28 17 35M240 177v-53c0-7 5-12 12-12s12 5 12 12v24c0 22 8 37 20 44M249 123v29c0 22-3 40-9 52M258 152c0 20 5 37 12 49" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
    </g>
    {[{x:171,y:95},{x:294,y:40},{x:356,y:169},{x:210,y:239},{x:117,y:171}].map((point,index)=><g key={index}><circle cx={point.x} cy={point.y} r="8" fill="var(--account-surface)" stroke="currentColor" strokeOpacity=".45"/><circle cx={point.x} cy={point.y} r="3" fill="currentColor" opacity=".7"/></g>)}
  </svg>
}
