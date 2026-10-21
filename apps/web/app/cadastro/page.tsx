'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loginSchema } from '@shapeos/shared'
import { useTheme } from 'next-themes'
import Logo from '@/davi/components/Logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Captcha, captchaAtivo } from '@/components/ui/captcha'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Mail, Lock, User, Eye, EyeOff, Clock3, Info, ShieldCheck, Shield } from 'lucide-react'

type CadastroConcluido = 'APROVACAO' | 'EMAIL_E_APROVACAO' | null

export default function CadastroPage() {
  const { resolvedTheme } = useTheme()
  const [captchaCompacto, setCaptchaCompacto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaVersion, setCaptchaVersion] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [concluido, setConcluido] = useState<CadastroConcluido>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width:399px)')
    const update = () => setCaptchaCompacto(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => { setCaptchaToken('') }, [resolvedTheme, captchaCompacto])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const emailLimpo = email.trim().toLowerCase()
    const nomeLimpo = nome.trim()
    const parsed = loginSchema.safeParse({ email: emailLimpo, senha })

    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    if (nomeLimpo.length < 2) {
      setErro('Informe seu nome.')
      return
    }
    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificação anti-robô.')
      return
    }

    setCarregando(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.senha,
        options: {
          data: { nome: nomeLimpo, tipo: 'PERSONAL' },
          captchaToken: captchaToken || undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        const limiteEmail =
          error.code === 'over_email_send_rate_limit' ||
          error.status === 429 ||
          error.message.toLowerCase().includes('rate limit')

        setErro(
          limiteEmail
            ? 'O serviço de confirmação por e-mail atingiu o limite temporário de envios. Sua conta não foi criada. Tente novamente daqui a alguns minutos.'
            : error.message.toLowerCase().includes('already') || error.code === 'user_already_exists'
              ? 'Este e-mail já possui conta. Faça login.'
              : error.message.toLowerCase().includes('captcha')
                ? 'Verificação anti-robô falhou. Tente novamente.'
                : 'Não foi possível criar a conta. Tente novamente.'
        )
        setCaptchaToken('')
        setCaptchaVersion(current => current + 1)
        return
      }

      if (!data.user) {
        setCaptchaToken('')
        setCaptchaVersion(current => current + 1)
        setErro('Não foi possível criar a conta. Tente novamente.')
        return
      }

      setEmail(emailLimpo)

      // Personais novos são criados como PENDENTE e precisam ser aprovados
      // no painel ADMIN antes do primeiro acesso ao sistema.
      if (data.session) {
        await supabase.auth.signOut()
        setConcluido('APROVACAO')
      } else {
        setConcluido('EMAIL_E_APROVACAO')
      }
    } catch {
      setCaptchaToken('')
      setCaptchaVersion(current => current + 1)
      setErro('Não foi possível conectar ao serviço de cadastro. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }


  return (
    <main className="personal-signup" data-testid="personal-signup">
      <div className="signup-frame">
        <header className="signup-top">
          <Link href="/apresentacao" aria-label="ShapeOS — página de apresentação"><Logo size="sm" /></Link>
          <nav aria-label="Opções de acesso">
            <a className="signup-back" href="/apresentacao"><ArrowLeft size={15} aria-hidden="true" /><span>Conhecer a ShapeOS</span></a>
            <ThemeToggle />
          </nav>
        </header>
        <div className="signup-center">
          <aside className="signup-intro" aria-labelledby="signup-intro-title">
            <p className="signup-eyebrow">Personais</p>
            <h2 id="signup-intro-title">Seu trabalho.<br /><span>Mais organizado.</span></h2>
            <p className="signup-intro-description">Planeje, acompanhe e evolua com a ShapeOS.</p>
            <svg className="signup-orbit" viewBox="0 0 400 280" fill="none" aria-hidden="true" focusable="false">
                <g stroke="currentColor" strokeWidth=".8" opacity=".4">
                  <ellipse cx="195" cy="140" rx="160" ry="65" transform="rotate(-25 195 140)"/>
                  <ellipse cx="195" cy="140" rx="146" ry="87" transform="rotate(16 195 140)"/>
                  <ellipse cx="195" cy="140" rx="111" ry="100" transform="rotate(32 195 140)"/>
                  <path d="M55 147L153 86L242 65L332 149L251 220L195 241L55 147Z M153 86L251 220M242 65L195 241M55 147L332 149" opacity=".3"/>
                </g>
                <g stroke="currentColor" strokeWidth="1.6" opacity=".55">
                  <circle cx="195" cy="140" r="43"/>
                  <rect x="111" y="116" width="12" height="48" rx="3"/>
                  <rect x="101" y="124" width="10" height="32" rx="2"/>
                  <path d="M123 133h29m-29 14h29"/>
                  <rect x="267" y="116" width="12" height="48" rx="3"/>
                  <rect x="279" y="124" width="10" height="32" rx="2"/>
                  <path d="M238 133h29m-29 14h29"/>
                  <path d="M186 122a22 22 0 1 0 18 0m-9-9v25" strokeLinecap="round"/>
                </g>
                {[{x:55,y:147},{x:242,y:65},{x:332,y:149},{x:195,y:241}].map((point,index)=><g key={index}><circle cx={point.x} cy={point.y} r="6" fill="var(--signup-panel)" stroke="currentColor" strokeOpacity=".4"/><circle cx={point.x} cy={point.y} r="2.5" fill="currentColor" opacity=".6"/></g>)}
              </svg>
          </aside>
          <section className="signup-card" aria-labelledby="signup-title">
            <header className="signup-heading">
              <h1 id="signup-title">Criar conta de Personal</h1>
              <p className="signup-description">Gerencie alunos, fichas e treinos em um só lugar.</p>
            </header>
            <div className="signup-body">
              {concluido ? (
                <div className="signup-success" role="status">
                  <div className="signup-success-icon">
                    {concluido === 'APROVACAO' ? <Clock3 size={26} aria-hidden="true" /> : <CheckCircle2 size={26} aria-hidden="true" />}
                  </div>
                  <h2>Conta de Personal criada!</h2>
                  {concluido === 'APROVACAO' ? (
                    <p>Seu cadastro está <strong>aguardando aprovação do administrador</strong>. Assim que for aprovado, você poderá entrar normalmente com seu e-mail e senha.</p>
                  ) : (
                    <p>Enviamos uma confirmação para <strong>{email}</strong>. Depois de confirmar o e-mail, seu cadastro ficará aguardando aprovação do administrador.</p>
                  )}
                  <a href="/login" className="signup-submit">Voltar ao login<ArrowRight size={18} aria-hidden="true" /></a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} aria-busy={carregando}>
                  <div className="signup-notice"><Info size={16} aria-hidden="true" /><p>Seu acesso será liberado após aprovação de um administrador.</p></div>
                  <div className="signup-row">
                    <label htmlFor="nome">Nome completo</label>
                    <div className="signup-field" data-disabled={carregando}>
                      <User size={18} aria-hidden="true" />
                      <input id="nome" name="nome" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required disabled={carregando} autoComplete="name" />
                    </div>
                  </div>
                  <div className="signup-row">
                    <label htmlFor="email">E-mail</label>
                    <div className="signup-field" data-disabled={carregando}>
                      <Mail size={18} aria-hidden="true" />
                      <input id="email" name="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={carregando} />
                    </div>
                  </div>
                  <div className="signup-row">
                    <label htmlFor="senha">Senha</label>
                    <div className="signup-field" data-disabled={carregando}>
                      <Lock size={18} aria-hidden="true" />
                      <input id="senha" name="senha" type={mostrarSenha ? 'text' : 'password'} placeholder="Mínimo de 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" required disabled={carregando} />
                      <button type="button" className="signup-eye" onClick={() => setMostrarSenha(!mostrarSenha)} disabled={carregando} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha} aria-controls="senha">
                        {mostrarSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  {captchaAtivo() && (
                    <div className="signup-verification">
                      <Captcha key={captchaVersion} onToken={setCaptchaToken} theme={resolvedTheme === 'dark' ? 'dark' : 'light'} size={captchaCompacto ? 'compact' : 'flexible'} appearance="interaction-only" />
                      <p className="signup-verification-status" role="status" aria-live="polite" aria-atomic="true">
                        {captchaToken ? <ShieldCheck size={19} aria-hidden="true" /> : <Shield size={19} aria-hidden="true" />}
                        <span>{captchaToken ? 'Verificação de segurança concluída' : 'Verificando segurança...'}</span>
                      </p>
                    </div>
                  )}
                  {erro && <p className="signup-error" role="alert">{erro}</p>}
                  <button type="submit" className="signup-submit" disabled={carregando || (captchaAtivo() && !captchaToken)}>
                    {carregando ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /><span>Criando conta...</span></> : <><span>Criar conta de Personal</span><ArrowRight size={18} aria-hidden="true" /></>}
                  </button>
                  <nav className="signup-links" aria-label="Opções de cadastro">
                    <p className="signup-login">Já tem conta? <Link href="/login">Entrar</Link></p>
                    <span className="signup-switch-group"><span aria-hidden="true">·</span><Link href="/cadastro/aluno" className="signup-switch">Sou Aluno</Link></span>
                  </nav>
                </form>
              )}
              <footer className="signup-terms">Ao criar a conta, você concorda com nossos <Link href="/termos">Termos de uso</Link> e <Link href="/privacidade">Política de privacidade</Link>.</footer>
            </div>
          </section>
        </div>
      </div>
      <style jsx>{`
        .personal-signup { --signup-bg:#f7f8f2;--signup-panel:#fcfdf9;--signup-line:#d7ded3;--signup-ink:#162623;--signup-muted:#5f6f68;--signup-brand:#129b89;--signup-onbrand:#fff;--signup-error:#b42336;min-height:100svh;background:var(--signup-bg);color:var(--signup-ink);font-family:'Sora',sans-serif; }
        :global(.dark) .personal-signup { --signup-bg:#041512;--signup-panel:#091c18;--signup-line:#1c4037;--signup-ink:#f5faf9;--signup-muted:#a3becd;--signup-brand:#00e9df;--signup-onbrand:#041512;--signup-error:#ff8f9b; }
        .personal-signup * { box-sizing:border-box; }
        .signup-frame { min-height:100svh;max-width:1216px;margin:0 auto;padding:20px 28px;display:flex;flex-direction:column; }
        .signup-top { display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--signup-line); }
        .signup-top nav { display:flex;align-items:center;gap:12px; }
        .signup-back { display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 6px;color:var(--signup-muted);font-size:12px;text-decoration:none; }
        .signup-center { display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1fr);flex:1;align-items:center;gap:40px;width:100%;max-width:960px;margin:0 auto;padding:24px 0; }
        .signup-intro { min-width:0;min-height:480px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;border-right:1px solid var(--signup-line);padding:20px 40px 20px 0; }
        .signup-intro .signup-eyebrow { margin-bottom:16px;color:var(--signup-brand);letter-spacing:.2em; }
        .signup-intro h2 { margin:0;font-size:38px;font-weight:600;line-height:1.25;letter-spacing:-.045em; }
        .signup-intro h2 span { color:var(--signup-brand); }
        .signup-intro-description { margin:17px 0 0;max-width:280px;font-size:14px;line-height:1.8;color:var(--signup-muted); }
        .signup-orbit { margin-top:20px;width:100%;max-width:260px;height:auto;color:var(--signup-brand);opacity:.35;pointer-events:none; }
        .signup-card { width:100%;max-width:500px;min-width:0;border:1px solid var(--signup-line);border-radius:20px;background:var(--signup-panel); }
        .signup-heading { padding:24px 28px 16px; }
        .signup-eyebrow { margin:0 0 12px;font-size:10px;font-weight:600;line-height:1.5;letter-spacing:.16em;text-transform:uppercase;color:var(--signup-muted); }
        .signup-heading h1 { margin:0;font-size:26px;font-weight:600;line-height:1.3;letter-spacing:-.045em; }
        .signup-description { margin:10px 0 0;font-size:13px;line-height:1.7;color:var(--signup-muted); }
        .signup-body { margin:0 28px;padding-bottom:20px; }
        form { display:grid;gap:14px; }
        .signup-notice { display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--signup-line);border-radius:13px;background:color-mix(in srgb,var(--signup-brand) 3%,transparent);color:var(--signup-muted); }
        .signup-notice :global(svg) { flex-shrink:0;margin-top:2px; }
        .signup-notice p { margin:0;font-size:11px;line-height:1.65; }
        .signup-row { display:grid;gap:8px;min-width:0; }
        label { font-size:13px;font-weight:500; }
        .signup-field { display:flex;align-items:center;gap:12px;min-height:48px;padding:0 14px;border:1px solid var(--signup-line);border-radius:13px;color:var(--signup-muted);background:transparent;transition:background-color 150ms ease,border-color 150ms ease; }
        .signup-field :global(svg) { flex-shrink:0; }
        .signup-field input { width:100%;min-width:0;min-height:46px;border:0;border-radius:0;padding:0;background:transparent;color:var(--signup-ink);font:inherit;font-size:14px;outline:none;box-shadow:none; }
        .signup-field input::placeholder { color:var(--signup-muted);opacity:1; }
        .signup-field:focus-within { border-color:var(--signup-brand); }
        .signup-field[data-disabled="true"] { opacity:.6; }
        .personal-signup button { font:inherit;cursor:pointer;box-shadow:none;transform:none;transition:background-color 150ms ease,border-color 150ms ease; }
        .signup-eye { width:44px;height:44px;margin-right:-12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;border:1px solid transparent;border-radius:13px;color:var(--signup-muted);background:transparent; }
        .signup-submit { display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;padding:10px 12px;border:1px solid var(--signup-brand);border-radius:13px;background:var(--signup-brand);color:var(--signup-onbrand);font-size:14px!important;font-weight:600!important;text-decoration:none; }
        .personal-signup button:disabled { cursor:not-allowed;opacity:.6; }
        .signup-links { display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 10px;border-top:1px solid var(--signup-line);padding-top:12px; }
        .signup-login { display:flex;align-items:center;gap:5px;margin:0;color:var(--signup-muted);font-size:12px;line-height:1.7; }
        .signup-switch-group { display:inline-flex;align-items:center;gap:10px;color:var(--signup-muted); }
        .signup-links :global(.signup-switch) { font-size:12px;line-height:1.7;white-space:nowrap; }
        .signup-links :global(a),.signup-terms :global(a) { color:var(--signup-brand);text-decoration:none; }
        .signup-links :global(a:hover),.signup-terms :global(a:hover) { text-decoration:underline;text-underline-offset:3px; }
        .signup-terms { margin-top:12px;text-align:center;font-size:10px;line-height:1.6;color:var(--signup-muted);overflow-wrap:anywhere; }
        .signup-verification { display:grid;gap:0;min-width:0; }
        .signup-verification-status { display:flex;align-items:center;gap:10px;margin:0;min-height:24px;color:var(--signup-muted);font-size:12px;line-height:1.6; }
        .signup-verification-status :global(svg) { flex-shrink:0;color:var(--signup-brand); }
        .signup-error { margin:0;padding:12px;border:1px solid color-mix(in srgb,var(--signup-error) 30%,transparent);border-radius:13px;background:color-mix(in srgb,var(--signup-error) 7%,transparent);color:var(--signup-error);font-size:12px;line-height:1.6;overflow-wrap:anywhere; }
        .signup-success { display:grid;gap:16px;padding-top:6px;text-align:center; }
        .signup-success-icon { display:flex;align-items:center;justify-content:center;width:52px;height:52px;margin:auto;border:1px solid var(--signup-line);border-radius:50%;color:var(--signup-brand); }
        .signup-success h2 { margin:0;font-size:18px;font-weight:600; }
        .signup-success p { margin:0;font-size:13px;line-height:1.8;color:var(--signup-muted);overflow-wrap:anywhere; }
        .signup-success strong { color:var(--signup-ink);font-weight:500; }
        .personal-signup :global(a:focus-visible),button:focus-visible { outline:2px solid var(--signup-brand);outline-offset:3px;border-radius:13px; }
        @media (hover:hover) {
          .signup-field:not([data-disabled="true"]):not(:focus-within):hover,.signup-eye:not(:disabled):hover { background:color-mix(in srgb,var(--signup-brand) 7%,transparent);border-color:color-mix(in srgb,var(--signup-brand) 40%,transparent); }
          .signup-submit:not(:disabled):hover { background:color-mix(in srgb,var(--signup-brand) 93%,var(--signup-panel));border-color:color-mix(in srgb,var(--signup-brand) 40%,transparent); }
        }
        @media (min-width:768px) and (max-width:1023px) {
          .signup-center { gap:28px; }
          .signup-intro { padding-right:28px; }
          .signup-intro h2 { font-size:32px; }
          .signup-heading { padding-left:24px;padding-right:24px; }
          .signup-heading h1 { font-size:24px; }
          .signup-body { margin-left:24px;margin-right:24px; }
        }
        @media (max-width:767px) {
          .signup-frame { padding:18px 20px; }
          .signup-top { flex-wrap:wrap;gap:8px; }
          .signup-top nav { margin-left:auto;gap:8px; }
          .signup-back { font-size:11px;gap:6px; }
          .signup-center { display:flex;align-items:flex-start;justify-content:center;padding:18px 0; }
          .signup-intro { display:none; }
          .signup-heading { padding:22px 22px 16px; }
          .signup-heading h1 { font-size:23px; }
          .signup-description { font-size:12px; }
          .signup-body { margin:0 22px;padding-bottom:18px; }
          .signup-field input { font-size:16px; }
          .signup-eye:not(:disabled):active { background:color-mix(in srgb,var(--signup-brand) 7%,transparent);border-color:color-mix(in srgb,var(--signup-brand) 40%,transparent); }
        }
        @media (max-width:359px) {
          .signup-frame { padding:14px; }
          .signup-heading { padding:22px 14px 16px; }
          .signup-heading h1 { font-size:21px; }
          .signup-body { margin:0 14px; }
        }
        @media (min-width:768px) and (max-height:800px) {
          .signup-intro { min-height:440px;padding-top:12px;padding-bottom:12px; }
          .signup-heading h1 { font-size:24px; }
          .signup-intro h2 { font-size:34px; }
          .signup-orbit { margin-top:18px;max-width:230px;max-height:185px; }
        }
        @media (max-height:800px) {
          .signup-frame { padding-top:10px;padding-bottom:10px; }
          .signup-top { padding-bottom:6px; }
          .signup-center { padding:10px 0; }
          .signup-heading { padding-top:16px;padding-bottom:12px; }
          .signup-eyebrow { margin-bottom:8px; }
          .signup-description { margin-top:8px; }
          form { gap:12px; }
          .signup-row { gap:6px; }
          .signup-terms { margin-top:10px; }
          .signup-body { padding-bottom:16px; }
        }
        @media (min-width:768px) and (max-height:700px) {
          .signup-heading { padding-top:12px;padding-bottom:10px; }
          .signup-heading h1 { font-size:23px; }
          .signup-description { margin-top:6px;font-size:12px; }
          .signup-notice { padding-top:8px;padding-bottom:8px; }
          form { gap:10px; }
          .signup-row { gap:5px; }
          .signup-field { min-height:44px; }
          .signup-field input { min-height:42px; }
          .signup-eye { height:42px; }
          .signup-submit { min-height:44px; }
          .signup-intro { min-height:390px; }
          .signup-orbit { max-width:210px;max-height:160px; }
          .signup-body { padding-bottom:14px; }
        }
        @media (max-width:359px) {
          .signup-heading h1 { font-size:21px; }
          .signup-links { gap:4px 8px; }
          .signup-switch-group { gap:8px; }
          .signup-login,.signup-links :global(.signup-switch) { font-size:11px; }
        }
        @media (prefers-reduced-motion:reduce) { .personal-signup button,.signup-field { transition:none; } }
      `}</style>
    </main>
  )
}
