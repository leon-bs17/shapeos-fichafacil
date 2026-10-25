'use client'

import Link from 'next/link'
import Logo from '@/davi/components/Logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import styles from './page.module.css'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'request' | 'sending' | 'sent' | 'loading' | 'reset' | 'saving' | 'success' | 'invalid'

export default function RecuperarSenhaPage() {
  const [mode, setMode] = useState<Mode>('request')
  const [email, setEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; newPassword?: string; confirmPassword?: string }>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const code = params.get('code')
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const isRecovery = Boolean(code || accessToken || params.get('recovery') === '1' || hashParams.get('type') === 'recovery')
    if (params.get('error') || hashParams.get('error')) {
      setErro('Este link de recuperação é inválido ou expirou. Solicite um novo link.')
      setMode('invalid')
      return
    }

    if (!isRecovery) return

    let ativo = true
    setMode('loading')
    setErro(null)

    async function prepararRecuperacao() {
      const supabase = createClient()
      let authError: Error | null = null

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        authError = error
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        authError = error
      }

      if (!authError) {
        const { data, error } = await supabase.auth.getUser()
        authError = error
        if (!data.user && !authError) {
          authError = new Error('Sessão de recuperação ausente.')
        }
      }

      if (!ativo) return

      if (authError) {
        setErro('Este link de recuperação é inválido ou expirou. Solicite um novo link.')
        setMode('invalid')
        return
      }

      window.history.replaceState({}, '', '/recuperar-senha')
      setMode('reset')
    }

    void prepararRecuperacao()

    return () => {
      ativo = false
    }
  }, [])

  async function enviarLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (mode === 'sending') return
    const emailLimpo = email.trim()
    const input = event.currentTarget.elements.namedItem('email') as HTMLInputElement
    const message = !emailLimpo ? 'Informe seu e-mail.' : input.validity.typeMismatch ? 'Informe um e-mail válido, como nome@exemplo.com.' : undefined
    setFieldErrors(message ? { email: message } : {})
    if (message) { input.focus(); return }

    setMode('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
      redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-senha`,
    })

    if (error) {
      setErro(
        error.message.toLowerCase().includes('rate')
          ? 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.'
          : 'Não foi possível enviar o e-mail de recuperação. Tente novamente.'
      )
      setMode('request')
      return
    }

    setMode('sent')
  }

  async function salvarNovaSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (mode === 'saving') return
    const errors: { newPassword?: string; confirmPassword?: string } = {}
    if (novaSenha.length < 8) errors.newPassword = 'A nova senha precisa ter pelo menos 8 caracteres.'
    if (!confirmarSenha) errors.confirmPassword = 'Confirme sua nova senha.'
    else if (novaSenha !== confirmarSenha) errors.confirmPassword = 'As senhas digitadas não são iguais.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      const input = event.currentTarget.elements.namedItem(errors.newPassword ? 'newPassword' : 'confirmPassword') as HTMLInputElement
      input.focus()
      return
    }

    setMode('saving')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    if (error) {
      setErro('Não foi possível salvar a nova senha. Solicite um novo link e tente novamente.')
      setMode('reset')
      return
    }

    await supabase.auth.signOut()
    setMode('success')
  }

  const titulo =
    mode === 'reset' || mode === 'saving'
      ? 'Crie sua nova senha'
      : mode === 'sent'
        ? 'Confira seu e-mail'
        : mode === 'success'
          ? 'Senha redefinida'
          : mode === 'invalid'
            ? 'Link expirado'
            : 'Recupere seu acesso'

  const descricao =
    mode === 'reset' || mode === 'saving'
      ? 'Escolha uma senha nova para entrar novamente no ShapeOS.'
      : mode === 'sent'
        ? 'Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.'
        : mode === 'success'
          ? 'Sua senha foi atualizada. Agora você já pode entrar com a nova senha.'
          : mode === 'invalid'
            ? 'Por segurança, links de recuperação expiram. Gere um novo abaixo.'
            : 'Informe seu e-mail e enviaremos um link seguro para redefinir sua senha.'

  return (
    <main id="main-content" className={styles.page} data-testid="recovery-view">
      <div className={styles.frame}>
      <header className={styles.top}>
        <Link href="/apresentacao" aria-label="ShapeOS — página de apresentação"><Logo size="sm" /></Link>
        <nav className={styles.tools} aria-label="Opções de acesso"><Link href="/apresentacao" className={styles.about}><ArrowLeft size={15} aria-hidden="true" /><span>Conhecer a ShapeOS</span></Link><ThemeToggle /></nav>
      </header>
      <div className={styles.main}>
        <aside className={styles.intro} aria-labelledby="recovery-intro-title">
          <p className={styles.eyebrow}>Personais e alunos</p>
          <h2 id="recovery-intro-title">Seu acesso.<br /><span>Seu espaço.</span></h2>
          <p className={styles.introDescription}>Recupere sua senha e continue sua jornada na ShapeOS.</p>
              <svg className={styles.orbit} viewBox="0 0 400 280" fill="none" aria-hidden="true" focusable="false">
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
                {[{x:55,y:147},{x:242,y:65},{x:332,y:149},{x:195,y:241}].map((point,index)=><g key={index}><circle cx={point.x} cy={point.y} r="6" fill="var(--login-surface)" stroke="currentColor" strokeOpacity=".4"/><circle cx={point.x} cy={point.y} r="2.5" fill="currentColor" opacity=".6"/></g>)}
              </svg>
        </aside>
        <section className={styles.card} aria-labelledby="recovery-title" aria-busy={mode === 'sending' || mode === 'saving' || mode === 'loading'}>
          <header className={styles.heading}><h1 id="recovery-title">{titulo}</h1><p>{descricao}</p></header>

          {mode === 'loading' && <div className={styles.state} role="status"><Loader2 size={28} className="animate-spin" aria-hidden="true" /><span>Validando seu link...</span></div>}

          {(mode === 'request' || mode === 'sending' || mode === 'invalid') && <form noValidate onSubmit={enviarLink} className={styles.form}>
            <div><label htmlFor="recovery-email">E-mail</label><div className={styles.field}>
              <Mail size={18} aria-hidden="true" />
              <input id="recovery-email" name="email" data-testid="recovery-email-input" type="email" autoComplete="email" required value={email} onChange={event => { setEmail(event.target.value); setFieldErrors(current => ({ ...current, email: undefined })) }} placeholder="voce@shapeos.app" disabled={mode === 'sending'} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'recovery-email-error' : erro ? 'recovery-error' : undefined} />
            </div>{fieldErrors.email && <p id="recovery-email-error" className={styles.fieldError} role="alert">{fieldErrors.email}</p>}</div>
            <button type="submit" data-testid="recovery-send-button" disabled={mode === 'sending'} className={styles.submit}>
              {mode === 'sending' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}
              {mode === 'sending' ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>}

          {mode === 'sent' && <div className={styles.state} role="status">
            <CheckCircle2 size={32} aria-hidden="true" />
            <button type="button" onClick={() => { setErro(null); setFieldErrors({}); setMode('request') }} className={styles.textAction}>Enviar para outro e-mail</button>
          </div>}

          {(mode === 'reset' || mode === 'saving') && <form noValidate onSubmit={salvarNovaSenha} className={styles.form}>
            <div><label htmlFor="new-password">Nova senha</label><div className={styles.field}>
              <KeyRound size={18} aria-hidden="true" />
              <input id="new-password" name="newPassword" data-testid="recovery-new-password-input" type="password" autoComplete="new-password" required minLength={8} value={novaSenha} onChange={event => { setNovaSenha(event.target.value); setFieldErrors(current => ({ ...current, newPassword: undefined })) } } placeholder="Mínimo de 8 caracteres" disabled={mode === 'saving'} aria-invalid={Boolean(fieldErrors.newPassword)} aria-describedby={fieldErrors.newPassword ? 'new-password-error' : erro ? 'recovery-error' : undefined} />
            </div>{fieldErrors.newPassword && <p id="new-password-error" className={styles.fieldError} role="alert">{fieldErrors.newPassword}</p>}</div>
            <div><label htmlFor="confirm-password">Confirmar nova senha</label><div className={styles.field}>
              <KeyRound size={18} aria-hidden="true" />
              <input id="confirm-password" name="confirmPassword" data-testid="recovery-confirm-password-input" type="password" autoComplete="new-password" required minLength={8} value={confirmarSenha} onChange={event => { setConfirmarSenha(event.target.value); setFieldErrors(current => ({ ...current, confirmPassword: undefined })) } } placeholder="Repita a nova senha" disabled={mode === 'saving'} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : erro ? 'recovery-error' : undefined} />
            </div>{fieldErrors.confirmPassword && <p id="confirm-password-error" className={styles.fieldError} role="alert">{fieldErrors.confirmPassword}</p>}</div>
            <button type="submit" data-testid="recovery-save-password-button" disabled={mode === 'saving'} className={styles.submit}>
              {mode === 'saving' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <KeyRound size={17} aria-hidden="true" />}
              {mode === 'saving' ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>}

          {mode === 'success' && <div className={styles.state} role="status"><CheckCircle2 size={32} aria-hidden="true" /><Link href="/login" className={styles.submit}>Voltar para o login</Link></div>}
          {erro && <p id="recovery-error" role="alert" className={styles.error}>{erro}</p>}
          {mode !== 'success' && <footer className={styles.cardFooter}>
            <Link href="/login"><ArrowLeft size={14} aria-hidden="true" />Voltar ao login</Link>
            <span><ShieldCheck size={16} aria-hidden="true" />Link seguro</span>
          </footer>}
        </section>
      </div>
      </div>
    </main>
  )
}
