'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginSchema } from '@shapeos/shared'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, Shield } from 'lucide-react'
import Logo from '@/davi/components/Logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function AdminLoginPage() {
  const router=useRouter()
  const [email,setEmail]=useState('')
  const [senha,setSenha]=useState('')
  const [mostrarSenha,setMostrarSenha]=useState(false)
  const [erro,setErro]=useState<string|null>(null)
  const [carregando,setCarregando]=useState(false)
  const [limpandoSessao,setLimpandoSessao]=useState(true)
  const [modoEsqueci,setModoEsqueci]=useState(false)
  const [avisoEnviado,setAvisoEnviado]=useState(false)
  const emailRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{
    let live=true
    async function limpar() {
      try {
        const supabase=createClient()
        const {data:{user}}=await supabase.auth.getUser()
        if(user)await supabase.auth.signOut()
      } catch {if(live)setErro('Não foi possível verificar a sessão. Tente entrar novamente.')}
      finally {if(live)setLimpandoSessao(false)}
    }
    void limpar()
    return ()=>{live=false}
  },[])
  useEffect(()=>{
    const html=document.documentElement
    const keyboard=(event:KeyboardEvent)=>{if(event.key==='Tab')html.setAttribute('data-admin-login-keyboard','true')}
    const pointer=()=>html.removeAttribute('data-admin-login-keyboard')
    document.addEventListener('keydown',keyboard,true)
    document.addEventListener('pointerdown',pointer,true)
    let dark=html.classList.contains('dark')
    let first=0
    let second=0
    let suppression:HTMLStyleElement|null=null
    const restore=()=>{suppression?.remove();suppression=null}
    const observer=new MutationObserver(()=>{
      const next=html.classList.contains('dark')
      if(next===dark)return
      dark=next
      cancelAnimationFrame(first);cancelAnimationFrame(second);restore()
      suppression=document.createElement('style')
      suppression.textContent='html body .admin-login.admin-login.admin-login.admin-login.admin-login.admin-login.admin-login.admin-login.admin-login.admin-login.admin-login.admin-login * { transition:none!important; }'
      document.head.appendChild(suppression)
      const root=document.querySelector('.admin-login')
      if(root)void getComputedStyle(root).backgroundColor
      first=requestAnimationFrame(()=>{second=requestAnimationFrame(restore)})
    })
    observer.observe(html,{attributes:true,attributeFilter:['class']})
    return ()=>{
      observer.disconnect();cancelAnimationFrame(first);cancelAnimationFrame(second);restore()
      document.removeEventListener('keydown',keyboard,true);document.removeEventListener('pointerdown',pointer,true)
      html.removeAttribute('data-admin-login-keyboard')
    }
  },[])
  function voltarLogin() {setAvisoEnviado(false);setModoEsqueci(false);setErro(null);requestAnimationFrame(()=>emailRef.current?.focus())}
  async function enviarLinkRedefinicao(event:FormEvent) {
    event.preventDefault()
    if(carregando||limpandoSessao)return
    setErro(null)
    if(!email.trim().includes('@')) {setErro('Digite seu e-mail para receber o link.');return}
    setCarregando(true)
    try {
      const {error}=await createClient().auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/auth/callback?next=/admin/redefinir-senha`})
      if(error)throw error
      setAvisoEnviado(true)
    }catch{setErro('Não foi possível enviar o e-mail. Tente novamente.')}
    finally{setCarregando(false)}
  }
  async function handleSubmit(event:FormEvent) {
    event.preventDefault()
    if(carregando||limpandoSessao)return
    setErro(null)
    const parsed=loginSchema.safeParse({email,senha})
    if(!parsed.success){setErro(parsed.error.issues[0]?.message??'Dados inválidos.');return}
    setCarregando(true)
    let entered=false
    try {
      const supabase=createClient()
      const {data,error:erroAuth}=await supabase.auth.signInWithPassword({email:parsed.data.email,password:parsed.data.senha})
      if(erroAuth||!data.user){setErro('Credenciais inválidas.');return}
      const {data:perfil,error:erroPerfil}=await supabase.from('usuarios').select('tipo').eq('id',data.user.id).single()
      if(erroPerfil||perfil?.tipo!=='ADMIN') {
        await supabase.auth.signOut()
        setErro('Acesso restrito a administradores.')
        return
      }
      entered=true
      router.push('/admin')
      router.refresh()
    }catch{setErro('Não foi possível entrar. Tente novamente.')}
    finally{if(!entered)setCarregando(false)}
  }
  const busy=carregando||limpandoSessao
  const title=avisoEnviado?'Verifique seu e-mail':modoEsqueci?'Recuperar senha':'Entrar no painel'

  return <main className="admin-login" data-admin-login-refined>
    <header className="admin-login-header">
      <Link href="/apresentacao" aria-label="ShapeOS — página de apresentação" className="admin-login-logo"><Logo size="sm"/></Link>
      <div className="admin-login-header-tools"><Link href="/apresentacao" className="admin-login-back"><ArrowLeft size={15} aria-hidden="true"/><span>Conhecer a ShapeOS</span></Link><ThemeToggle/></div>
    </header>
    <div className="admin-login-main">
      <section className="admin-login-intro" aria-labelledby="admin-login-identity">
        <p className="admin-login-eyebrow">Administração</p>
        <h1 id="admin-login-identity">Administração<br/><span>ShapeOS</span></h1>
        <p className="admin-login-intro-copy">Controle da plataforma.</p>
        <LoginWireframe/>
      </section>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <header className="admin-login-card-heading"><h2 id="admin-login-title">{title}</h2><p>{avisoEnviado?'Enviamos as instruções para redefinir sua senha.':modoEsqueci?'Receba um link para redefinir sua senha.':'Use sua conta de administrador.'}</p></header>
        {avisoEnviado?<div className="admin-login-sent"><CheckCircle2 size={32} aria-hidden="true"/><p>Enviamos um link de redefinição para <strong>{email.trim()}</strong>. Abra sua caixa de entrada e siga as instruções.</p><button type="button" className="admin-login-command" onClick={voltarLogin}>Voltar ao login</button></div>:
        <form onSubmit={modoEsqueci?enviarLinkRedefinicao:handleSubmit} className="admin-login-form">
          <div className="admin-login-field-group"><label htmlFor="admin-email">E-mail administrativo</label>
            <div className="admin-login-field"><Mail size={18} aria-hidden="true"/><input ref={emailRef} id="admin-email" name="email" type="email" placeholder="admin@shapeos.com" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="username" required disabled={busy}/></div>
          </div>
          {!modoEsqueci&&<div className="admin-login-field-group"><label htmlFor="admin-senha">Senha</label>
            <div className="admin-login-field"><LockKeyhole size={18} aria-hidden="true"/><input id="admin-senha" name="password" type={mostrarSenha?'text':'password'} placeholder="Digite sua senha" value={senha} onChange={event=>setSenha(event.target.value)} autoComplete="current-password" required disabled={busy}/>
              <button type="button" className="admin-login-visibility" aria-label={mostrarSenha?'Ocultar senha':'Mostrar senha'} aria-pressed={mostrarSenha} aria-controls="admin-senha" disabled={busy} onClick={()=>setMostrarSenha(!mostrarSenha)}>{mostrarSenha?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div>
          </div>}
          {erro&&<p className="admin-login-error" role="alert">{erro}</p>}
          <button type="submit" className="admin-login-submit" disabled={busy}>
            {busy?<><Loader2 size={17} className="admin-login-spinner" aria-hidden="true"/>{limpandoSessao?'Preparando acesso...':modoEsqueci?'Enviando...':'Entrando...'}</>:modoEsqueci?'Enviar link de redefinição':<>Entrar no painel<ArrowRight size={17} aria-hidden="true"/></>}
          </button>
          {modoEsqueci?<button type="button" className="admin-login-text-action" disabled={busy} onClick={voltarLogin}>Voltar ao login</button>:
          <button type="button" className="admin-login-text-action" disabled={busy} onClick={()=>{setModoEsqueci(true);setMostrarSenha(false);setSenha('');setErro(null);requestAnimationFrame(()=>emailRef.current?.focus())}}>Esqueci minha senha</button>}
        </form>}
        <div className="admin-login-mobile-about"><p>Ainda não conhece a plataforma?</p><Link href="/apresentacao">Conhecer o ShapeOS <ArrowRight size={16} aria-hidden="true"/></Link></div>
        <footer className="admin-login-permission"><Shield size={16} aria-hidden="true"/><p>Acesso exclusivo para administradores.</p></footer>
      </section>
    </div>
    <style jsx global>{`

.admin-login { --login-bg:#f7f8f2; --login-surface:#fcfdf9; --login-border:#d7ded3; --login-text:#162623; --login-muted:#5f6f68; --login-brand:#129b89; --login-on-brand:#ffffff; min-height:100svh; display:flex; flex-direction:column; background:var(--login-bg)!important; color:var(--login-text)!important; font-family:'Sora',sans-serif; }
html.dark .admin-login { --login-bg:#041512; --login-surface:#091c18; --login-border:#1c4037; --login-text:#f5faf9; --login-muted:#a3becd; --login-brand:#00e9df; --login-on-brand:#002a26; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-header { display:flex; justify-content:space-between; align-items:center; gap:20px; width:100%; max-width:1100px; margin:0 auto; padding:24px 32px; border-bottom:1px solid var(--login-border); }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-logo { display:inline-flex; min-width:0; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-header-tools { display:flex; align-items:center; gap:16px; flex-shrink:0; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-back { display:inline-flex; align-items:center; gap:8px; min-height:44px; font-size:12px; color:var(--login-muted)!important; border:1px solid transparent; border-radius:13px; padding:8px; transition:background-color 150ms ease,border-color 150ms ease; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-main { display:grid; grid-template-columns:minmax(0,.9fr) minmax(0,1.15fr); gap:48px; align-items:center; width:100%; max-width:960px; margin:auto; padding:56px 32px; flex:1; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-intro { position:relative; min-width:0; padding:18px 32px 18px 0; border-right:1px solid var(--login-border); }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-eyebrow { display:inline-flex; align-items:center; width:fit-content; max-width:100%; min-height:28px; padding:6px 16px; margin:0 0 17px; border:1px solid var(--login-brand); border-radius:999px; background:transparent; color:var(--login-brand); font-size:10px; font-weight:650; letter-spacing:.1em; text-transform:uppercase; line-height:14px; }
html:is(.light,.dark) body .admin-login.admin-login h1 { color:var(--login-text)!important; font-size:36px!important; font-weight:800!important; line-height:1.15!important; letter-spacing:-.04em!important; }
html:is(.light,.dark) body .admin-login.admin-login h1 span { color:var(--login-brand)!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-intro-copy { color:var(--login-muted)!important; font-size:16px; line-height:1.6; margin-top:14px; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-wireframe { display:block; width:100%; max-width:340px; height:auto; margin-top:24px; color:var(--login-brand); opacity:.5; pointer-events:none; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-card { min-width:0; padding:30px; background:var(--login-surface)!important; border:1px solid var(--login-border)!important; border-radius:17px; box-shadow:none!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-card-heading h2 { color:var(--login-text)!important; font-size:22px; font-weight:700; letter-spacing:-.02em; line-height:1.4; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-card-heading p { color:var(--login-muted)!important; font-size:13px; line-height:1.65; margin-top:6px; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-form { display:grid; gap:22px; margin-top:26px; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field-group label { display:block; font-size:12px; font-weight:500; color:var(--login-text); margin-bottom:9px; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field { display:flex; align-items:center; gap:12px; min-width:0; height:48px; padding-left:14px; border:1px solid var(--login-border)!important; border-radius:13px; background:var(--login-surface)!important; color:var(--login-muted); box-shadow:none!important; outline:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field>svg { width:18px; height:18px; flex-shrink:0; color:var(--login-muted)!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field input,html:is(.light,.dark) body .admin-login.admin-login .admin-login-field input:is(:focus,:focus-visible) { min-width:0; width:100%; flex:1; height:100%; padding:0; border:0!important; outline:none!important; box-shadow:none!important; background:transparent!important; color:var(--login-text)!important; font-family:inherit; font-size:13px; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field input[type="email"] { padding-right:14px; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field input::placeholder { color:var(--login-muted)!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-field:focus-within { border-color:var(--login-border)!important; }
html:is(.light,.dark)[data-admin-login-keyboard="true"] body .admin-login.admin-login .admin-login-field:has(input:focus-visible) { outline:2px solid var(--login-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-visibility { display:grid; place-items:center; width:44px; min-width:44px; height:44px; margin:1px; border:1px solid transparent; border-radius:13px; background:transparent; color:var(--login-muted)!important; transition:background-color 150ms ease,border-color 150ms ease; cursor:pointer; }
html:is(.light,.dark) body .admin-login.admin-login :is(.admin-login-submit,.admin-login-command) { display:flex; justify-content:center; align-items:center; gap:10px; min-height:48px; width:100%; padding:12px 16px; font-family:inherit; font-size:13px; font-weight:600; border:1px solid color-mix(in srgb,var(--login-brand) 40%,transparent); border-radius:13px; background:var(--login-brand)!important; color:var(--login-on-brand)!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease; cursor:pointer; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-command { border-color:var(--login-border); background:var(--login-surface)!important; color:var(--login-text)!important; font-weight:500; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-text-action { justify-self:center; min-height:44px; padding:8px 14px; border:1px solid transparent; border-radius:13px; color:var(--login-brand)!important; background:transparent; text-decoration:underline; text-underline-offset:3px; font-size:12px; margin-top:-10px; transition:background-color 150ms ease,border-color 150ms ease; cursor:pointer; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-permission { display:flex; align-items:center; justify-content:center; gap:10px; border-top:1px solid var(--login-border); margin-top:22px; padding-top:20px; color:var(--login-muted); font-size:11px; line-height:1.6; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-permission svg { flex-shrink:0; color:var(--login-muted); }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-error { color:#b42336; font-size:13px; line-height:1.65; }
html.dark body .admin-login.admin-login .admin-login-error { color:#ff8f9b; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-sent { display:grid; justify-items:start; gap:18px; margin-top:24px; font-size:13px; line-height:1.8; color:var(--login-muted); }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-sent>svg { color:var(--login-brand); }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-sent strong { color:var(--login-text); overflow-wrap:anywhere; }
html:is(.light,.dark) body .admin-login.admin-login :is(button,input):disabled { opacity:.55; cursor:not-allowed; }
html:is(.light,.dark) body .admin-login.admin-login :is(a,button):focus-visible { outline:2px solid var(--login-brand)!important; outline-offset:3px!important; }
html:is(.light,.dark) body .admin-login.admin-login .admin-login-spinner { animation:admin-login-spin 1s linear infinite; }
@keyframes admin-login-spin { to { transform:rotate(360deg); } }
@media(hover:hover) and (pointer:fine) {
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-command:not(:disabled):hover,
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-field:not(:has(input:disabled)):hover { background:color-mix(in srgb,var(--login-brand) 7%,transparent)!important; border-color:color-mix(in srgb,var(--login-brand) 40%,transparent)!important; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-submit:not(:disabled):hover { background:linear-gradient(rgba(0,0,0,.07),rgba(0,0,0,.07)),var(--login-brand)!important; border-color:color-mix(in srgb,var(--login-brand) 40%,transparent)!important; }
}
@media(max-width:767px) {
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-header { padding:16px 20px; gap:12px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-header-tools { gap:6px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-back span { display:none; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-back { min-width:44px; justify-content:center; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-main { grid-template-columns:minmax(0,1fr); max-width:500px; gap:24px; padding:28px 20px 36px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-intro { padding:0; border:0; overflow:hidden; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-eyebrow { position:relative; z-index:1; }
 html:is(.light,.dark) body .admin-login.admin-login h1 { position:relative; z-index:1; font-size:32px!important; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-intro-copy { position:relative; z-index:1; font-size:14px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-wireframe { position:absolute; top:0; right:-110px; width:240px; max-width:none; margin:0; opacity:.15; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-card { padding:24px 20px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-card-heading h2 { font-size:20px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-field input { font-size:16px; }
}
@media(max-width:359px) { html:is(.light,.dark) body .admin-login.admin-login .admin-login-header { padding-inline:16px; } html:is(.light,.dark) body .admin-login.admin-login .admin-login-main { padding-inline:16px; } html:is(.light,.dark) body .admin-login.admin-login .admin-login-header-tools { gap:0; } }
@media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body .admin-login.admin-login :is(.admin-login-field,.admin-login-submit,.admin-login-command,.admin-login-text-action,.admin-login-visibility,.admin-login-back) { transition:none!important; } html:is(.light,.dark) body .admin-login.admin-login .admin-login-spinner { animation:none; } }


/* Recovery text remains a text action without a surrounding field. */
html:is(.light,.dark) body .admin-login.admin-login .admin-login-text-action,
html:is(.light,.dark) body .admin-login.admin-login .admin-login-text-action:hover,
html:is(.light,.dark) body .admin-login.admin-login .admin-login-text-action:active {
  background:transparent!important; border-color:transparent!important; box-shadow:none!important;
}


/* Header link and password visibility icon have no boxed pointer hover. */
html:is(.light,.dark) body .admin-login.admin-login :is(.admin-login-back,.admin-login-visibility),
html:is(.light,.dark) body .admin-login.admin-login :is(.admin-login-back,.admin-login-visibility):hover,
html:is(.light,.dark) body .admin-login.admin-login :is(.admin-login-back,.admin-login-visibility):active {
 background:transparent!important; border-color:transparent!important; box-shadow:none!important;
}


/* Mobile login: stacked identity and form, using the existing theme tokens. */
html:is(.light,.dark) body .admin-login.admin-login .admin-login-mobile-about { display:none; }
@media(max-width:767px) {
 html:is(.light,.dark) body .admin-login.admin-login { background:linear-gradient(180deg,color-mix(in srgb,var(--login-brand) 7%,var(--login-bg)) 0,var(--login-bg) 300px)!important; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-header { border-bottom:0; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-back { display:none; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-main { flex:0 0 auto; align-items:start; margin:0 auto; gap:24px; padding-top:24px; padding-bottom:max(32px,env(safe-area-inset-bottom)); }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-intro { min-height:170px; padding:12px 0 16px; isolation:isolate; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-wireframe { top:calc(50% - 84px); right:-48px; width:240px; opacity:.35; z-index:-1; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-card { border-radius:13px; padding:24px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-card-heading h2 { font-size:24px; line-height:1.3; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-field-group label { font-size:14px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-submit { font-size:14px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-text-action { font-size:14px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-mobile-about { display:grid; justify-items:center; gap:8px; border-top:1px solid var(--login-border); margin-top:20px; padding-top:20px; text-align:center; font-size:13px; line-height:1.6; color:var(--login-muted); }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-mobile-about p { margin:0; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-mobile-about a { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:8px 0; color:var(--login-brand)!important; background:transparent!important; border:0!important; box-shadow:none!important; text-decoration:underline; text-underline-offset:3px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-permission { margin-top:8px; padding-top:0; border-top:0; }
}
@media(max-width:359px) {
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-card { padding:20px 16px; }
 html:is(.light,.dark) body .admin-login.admin-login .admin-login-wireframe { right:-80px; }
}

html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-header{max-width:1100px!important;padding:18px 28px!important;min-height:76px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-header-tools{gap:10px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-main{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)!important;max-width:900px!important;gap:32px!important;padding:36px 28px!important;align-items:center!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro{padding:18px 28px 18px 0!important;min-height:0!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-eyebrow{display:block!important;padding:0!important;margin:0 0 10px!important;border:0!important;border-radius:0!important;background:transparent!important;min-height:0!important;font-size:9px!important;line-height:1.5!important;font-weight:650!important;letter-spacing:.1em!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) h1{font-size:30px!important;font-weight:700!important;line-height:1.2!important;letter-spacing:-.035em!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro-copy{font-size:13px!important;line-height:1.55!important;margin-top:10px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-wireframe{max-width:260px!important;margin-top:20px!important;opacity:.35!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-card{padding:24px!important;border-radius:16px!important;box-shadow:none!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-card-heading{padding-bottom:18px!important;border-bottom:1px solid var(--login-border)!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-card-heading h2{font-size:20px!important;font-weight:650!important;line-height:1.3!important;letter-spacing:-.025em!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-card-heading p{font-size:12px!important;line-height:1.5!important;margin-top:5px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-form{gap:16px!important;margin-top:20px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field-group label{font-size:11px!important;font-weight:500!important;margin-bottom:7px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field{height:44px!important;padding-left:12px!important;gap:9px!important;border-radius:13px!important;box-shadow:none!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field>svg{width:16px!important;height:16px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field input{font-size:13px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-visibility{width:42px!important;min-width:42px!important;height:42px!important;margin:0!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-submit{min-height:44px!important;padding:10px 14px!important;font-size:12px!important;border-radius:13px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-command{min-height:44px!important;font-size:12px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-text-action{margin-top:0!important;font-size:11px!important;min-height:40px!important;padding:6px 12px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-permission{margin-top:16px!important;padding-top:16px!important;gap:7px!important;font-size:10px!important;line-height:1.5!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-permission svg{width:14px!important;height:14px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-sent{font-size:12px!important;line-height:1.65!important;gap:14px!important;margin-top:18px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field:has(input:focus){border-color:var(--login-brand)!important;outline:none!important;box-shadow:none!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field:has(input:focus-visible){border-color:var(--login-brand)!important;outline:none!important;box-shadow:none!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field:not(:has(input:disabled)):hover{background:color-mix(in srgb,var(--login-brand) 7%,var(--login-surface))!important;border-color:color-mix(in srgb,var(--login-brand) 40%,var(--login-border))!important;box-shadow:none!important;transform:none!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-command:not(:disabled):hover{background:color-mix(in srgb,var(--login-brand) 7%,var(--login-surface))!important;border-color:color-mix(in srgb,var(--login-brand) 40%,var(--login-border))!important}
@media(max-width:767px){html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-header{padding:14px 18px!important;min-height:64px!important;border-bottom:1px solid var(--login-border)!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-main{max-width:460px!important;grid-template-columns:minmax(0,1fr)!important;gap:16px!important;padding:20px 16px max(28px,env(safe-area-inset-bottom))!important;margin:0 auto!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro{position:relative!important;padding:20px!important;border:1px solid var(--login-border)!important;border-radius:16px!important;min-height:140px!important;overflow:hidden!important;background:var(--login-surface)!important;isolation:isolate!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro h1{font-size:26px!important;line-height:1.2!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro h1 br{display:none!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro h1 span{margin-left:5px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro-copy{font-size:12px!important;margin-top:8px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-wireframe{position:absolute!important;top:50%!important;right:-12px!important;width:54%!important;max-width:220px!important;max-height:135px!important;height:auto!important;margin:0!important;transform:translateY(-50%)!important;opacity:.22!important;z-index:0!important;mask-image:linear-gradient(to right,transparent,#000 38%)!important;-webkit-mask-image:linear-gradient(to right,transparent,#000 38%)!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-intro>:not(svg){position:relative!important;z-index:1!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-card{padding:20px!important;border-radius:16px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-card-heading h2{font-size:20px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field{height:46px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-field input{font-size:16px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-visibility{width:44px!important;min-width:44px!important;height:44px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-submit{min-height:46px!important;font-size:13px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-text-action{min-height:44px!important;font-size:12px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-mobile-about{gap:4px!important;margin-top:16px!important;padding-top:14px!important;font-size:11px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-mobile-about a{min-height:44px!important;font-size:12px!important}
html body :is(#admin-login-refined,[data-admin-login-refined]) .admin-login-permission{margin-top:10px!important;padding-top:0!important;border:0!important;font-size:10px!important}}

/* Dimensions shared with the Personal/Aluno login. */
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login{padding:24px 0!important;box-sizing:border-box!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login *{box-sizing:border-box!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header{max-width:1160px!important;width:calc(100% - 56px)!important;margin:0 auto!important;padding:0 0 22px!important;min-height:0!important;gap:16px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header-tools{gap:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-back{padding:0 6px!important;font-size:12px!important;min-height:44px!important;gap:8px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-main{grid-template-columns:minmax(0,.85fr) minmax(0,1fr)!important;max-width:960px!important;width:calc(100% - 56px)!important;gap:40px!important;margin:0 auto!important;padding:52px 0!important;align-items:center!important;flex:1!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;min-height:480px!important;padding:20px 40px 20px 0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-eyebrow{margin:0 0 16px!important;font-size:11px!important;font-weight:600!important;line-height:1.5!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro h1{margin:0!important;font-size:38px!important;font-weight:600!important;line-height:1.2!important;letter-spacing:-.045em!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro-copy{margin:17px 0 0!important;max-width:280px!important;font-size:14px!important;line-height:1.8!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-wireframe{margin-top:20px!important;max-width:260px!important;height:auto!important;opacity:.35!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card{width:100%!important;max-width:500px!important;padding:0!important;border-radius:20px!important;overflow:hidden!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading{margin:0 32px!important;padding:32px 0 24px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading h2{margin:0!important;font-size:26px!important;line-height:1.3!important;font-weight:600!important;letter-spacing:-.045em!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading p{margin:12px 0 0!important;font-size:13px!important;line-height:1.7!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-form{margin:22px 32px 0!important;gap:19px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field-group label{font-size:13px!important;font-weight:500!important;margin-bottom:9px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field{height:48px!important;min-height:48px!important;padding-left:14px!important;gap:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field>svg{width:18px!important;height:18px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field input{font-size:14px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-visibility{width:44px!important;min-width:44px!important;height:44px!important;margin:0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-submit{min-height:48px!important;padding:10px 12px!important;font-size:14px!important;margin-top:1px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-command{min-height:48px!important;padding:10px 12px!important;font-size:14px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-text-action{font-size:11px!important;min-height:44px!important;margin-top:0!important;padding:8px 12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission{margin:18px 32px 25px!important;padding-top:19px!important;gap:9px!important;font-size:11px!important;line-height:1.6!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission p{margin:0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission svg{width:16px!important;height:16px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-sent{margin:22px 32px 0!important;font-size:13px!important;line-height:1.7!important;gap:18px!important}
@media(min-width:768px) and (max-width:1023px){html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-main{gap:28px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro{padding-right:28px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro h1{font-size:32px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading{margin:0 24px!important;padding:26px 0 22px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading h2{font-size:24px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-form{margin-left:24px!important;margin-right:24px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission{margin-left:24px!important;margin-right:24px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-sent{margin-left:24px!important;margin-right:24px!important}
}
@media(max-width:767px){html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login{padding:18px 0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header{width:calc(100% - 40px)!important;padding:0 0 22px!important;flex-wrap:wrap!important;gap:8px!important;min-height:0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header-tools{margin-left:auto!important;gap:8px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-back{font-size:11px!important;gap:6px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-back span{display:inline!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-main{display:flex!important;align-items:flex-start!important;justify-content:center!important;width:calc(100% - 40px)!important;max-width:500px!important;gap:0!important;padding:24px 0!important;margin:0 auto!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro{display:none!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading{margin:0 22px!important;padding:26px 0 22px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading h2{font-size:23px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading p{max-width:250px!important;font-size:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-form{margin:20px 22px 0!important;gap:19px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field{height:48px!important;min-height:48px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field input{font-size:16px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-submit{min-height:48px!important;font-size:14px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-text-action{font-size:11px!important;min-height:44px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-mobile-about{margin:16px 22px 0!important;padding-top:14px!important;gap:4px!important;font-size:11px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission{margin:18px 22px 23px!important;padding-top:0!important;border:0!important;font-size:11px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-sent{margin:20px 22px 0!important}
}
@media(max-width:359px){html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login{padding:16px 0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header{width:calc(100% - 28px)!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-main{width:calc(100% - 28px)!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading{margin:0 18px!important;padding:24px 0 20px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading h2{font-size:21px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-form{margin-left:18px!important;margin-right:18px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission{margin-left:18px!important;margin-right:18px!important}
}
@media(min-width:768px) and (max-height:800px){html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login{padding-top:12px!important;padding-bottom:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header{padding-bottom:8px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-main{padding:12px 0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro{min-height:380px!important;padding-top:12px!important;padding-bottom:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-eyebrow{margin-bottom:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro h1{font-size:34px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-intro-copy{margin-top:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-wireframe{margin-top:18px!important;max-width:230px!important;max-height:185px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading{margin:0 28px!important;padding:18px 0 14px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading h2{font-size:24px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading p{margin-top:8px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-form{margin:14px 28px 0!important;gap:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field-group label{margin-bottom:6px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission{margin:12px 28px 16px!important;padding-top:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-sent{margin:14px 28px 0!important;gap:12px!important}
}
@media(max-width:767px) and (max-height:800px){html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login{padding-top:12px!important;padding-bottom:12px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-header{padding-bottom:8px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-main{padding:16px 0!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading{padding-top:20px!important;padding-bottom:16px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-card-heading p{margin-top:8px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-form{margin-top:16px!important;gap:14px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-field-group label{margin-bottom:7px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-permission{margin-top:12px!important;margin-bottom:18px!important}
html body :is(#admin-login-dimensions,[data-admin-login-refined]).admin-login .admin-login-mobile-about{margin-top:12px!important;padding-top:12px!important}
}
    `}</style>
  </main>
}

function LoginWireframe() {
  return <svg className="admin-login-wireframe" viewBox="0 0 400 280" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth=".8" opacity=".4">
      <ellipse cx="195" cy="140" rx="160" ry="65" transform="rotate(-25 195 140)"/>
      <ellipse cx="195" cy="140" rx="146" ry="87" transform="rotate(16 195 140)"/>
      <ellipse cx="195" cy="140" rx="111" ry="100" transform="rotate(32 195 140)"/>
      <path d="M55 147L153 86L242 65L332 149L251 220L195 241L55 147Z M153 86L251 220M242 65L195 241M55 147L332 149" opacity=".55"/>
    </g>
    <path d="M195 66c-22 17-48 25-65 29v53c0 36 28 64 65 85 37-21 65-49 65-85V95c-17-4-43-12-65-29Z" stroke="currentColor" strokeWidth="1.6" opacity=".55"/>
    <path d="M195 86v122M147 110l96 67M147 177l96-67" stroke="currentColor" strokeWidth=".8" opacity=".22"/>
    {[{x:55,y:147},{x:242,y:65},{x:332,y:149},{x:195,y:241}].map((point,index)=><g key={index}><circle cx={point.x} cy={point.y} r="6" fill="var(--login-surface)" stroke="currentColor" strokeOpacity=".4"/><circle cx={point.x} cy={point.y} r="2.5" fill="currentColor" opacity=".6"/></g>)}
  </svg>
}
