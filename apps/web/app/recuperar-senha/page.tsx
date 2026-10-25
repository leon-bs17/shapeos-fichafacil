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

    const emailLimpo = email.trim()
    if (!emailLimpo) {
      setErro('Informe o e-mail usado na sua conta.')
      return
    }

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

    if (novaSenha.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas digitadas não são iguais.')
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
      <header className={styles.top}>
        <Link href="/apresentacao" aria-label="ShapeOS — página de apresentação"><Logo size="sm" /></Link>
        <div className={styles.tools}><Link href="/apresentacao" className={styles.about}><ArrowLeft size={15} aria-hidden="true" /><span>Conhecer a ShapeOS</span></Link><ThemeToggle /></div>
      </header>
      <div className={styles.main}>
        <section className={styles.card} aria-labelledby="recovery-title" aria-busy={mode === 'sending' || mode === 'saving' || mode === 'loading'}>
          <header className={styles.heading}><h1 id="recovery-title">{titulo}</h1><p>{descricao}</p></header>

          {mode === 'loading' && <div className={styles.state} role="status"><Loader2 size={28} className="animate-spin" aria-hidden="true" /><span>Validando seu link...</span></div>}

          {(mode === 'request' || mode === 'sending' || mode === 'invalid') && <form onSubmit={enviarLink} className={styles.form}>
            <div><label htmlFor="recovery-email">Email</label><div className={styles.field}>
              <Mail size={18} aria-hidden="true" />
              <input id="recovery-email" data-testid="recovery-email-input" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@shapeos.app" disabled={mode === 'sending'} aria-describedby={erro ? 'recovery-error' : undefined} />
            </div></div>
            <button type="submit" data-testid="recovery-send-button" disabled={mode === 'sending'} className={styles.submit}>
              {mode === 'sending' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}
              {mode === 'sending' ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>}

          {mode === 'sent' && <div className={styles.state} role="status">
            <CheckCircle2 size={32} aria-hidden="true" />
            <button type="button" onClick={() => { setErro(null); setMode('request') }} className={styles.textAction}>Enviar para outro e-mail</button>
          </div>}

          {(mode === 'reset' || mode === 'saving') && <form onSubmit={salvarNovaSenha} className={styles.form}>
            <div><label htmlFor="new-password">Nova senha</label><div className={styles.field}>
              <KeyRound size={18} aria-hidden="true" />
              <input id="new-password" data-testid="recovery-new-password-input" type="password" autoComplete="new-password" required minLength={8} value={novaSenha} onChange={event => setNovaSenha(event.target.value)} placeholder="Mínimo de 8 caracteres" disabled={mode === 'saving'} aria-describedby={erro ? 'recovery-error' : undefined} />
            </div></div>
            <div><label htmlFor="confirm-password">Confirmar nova senha</label><div className={styles.field}>
              <KeyRound size={18} aria-hidden="true" />
              <input id="confirm-password" data-testid="recovery-confirm-password-input" type="password" autoComplete="new-password" required minLength={8} value={confirmarSenha} onChange={event => setConfirmarSenha(event.target.value)} placeholder="Repita a nova senha" disabled={mode === 'saving'} aria-describedby={erro ? 'recovery-error' : undefined} />
            </div></div>
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
      <footer className={styles.footer}>ShapeOS · Seu espaço para planejar e treinar</footer>
    </main>
  )
}
