'use client'

import { AuthShell } from '@/components/auth/auth-shell'

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
    const isRecovery = Boolean(code || accessToken || hashParams.get('type') === 'recovery')

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
      redirectTo: `${window.location.origin}/recuperar-senha`,
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
    <AuthShell compact>
        <section
          className="rounded-xl p-6 sm:p-7"
          style={{
            background: "var(--shapeos-surface)",
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'none',
          }}
        >
          <div className="mb-6">
            <h1
              className="text-2xl tracking-tight text-[#edf2f3]"
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600 }}
            >
              {titulo}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
              {descricao}
            </p>
          </div>

          {mode === 'loading' ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#22C7C7]" />
              <span className="text-sm">Validando seu link...</span>
            </div>
          ) : null}

          {mode === 'request' || mode === 'sending' || mode === 'invalid' ? (
            <form onSubmit={enviarLink} className="space-y-4" style={{ fontFamily: "'Sora', sans-serif" }}>
              <div>
                <label htmlFor="recovery-email" className="text-xs uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="recovery-email"
                    data-testid="recovery-email-input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@shapeos.app"
                    className="w-full rounded-xl py-3.5 pl-11 pr-4 text-[#edf2f3] outline-none transition-all placeholder:text-muted-foreground focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="recovery-send-button"
                disabled={mode === 'sending'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-[#121719] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                style={{ background: '#e3b66a', boxShadow: "none" }}
              >
                {mode === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {mode === 'sending' ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          ) : null}

          {mode === 'sent' ? (
            <div className="space-y-5 text-center" style={{ fontFamily: "'Sora', sans-serif" }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#22C7C7]/30 bg-[#22C7C7]/10">
                <CheckCircle2 className="h-8 w-8 text-[#22C7C7]" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setErro(null)
                  setMode('request')
                }}
                className="text-sm font-medium text-[#22C7C7] hover:underline"
              >
                Enviar para outro e-mail
              </button>
            </div>
          ) : null}

          {mode === 'reset' || mode === 'saving' ? (
            <form onSubmit={salvarNovaSenha} className="space-y-4" style={{ fontFamily: "'Sora', sans-serif" }}>
              <div>
                <label htmlFor="new-password" className="text-xs uppercase tracking-widest text-muted-foreground">
                  Nova senha
                </label>
                <div className="relative mt-2">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="new-password"
                    data-testid="recovery-new-password-input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={novaSenha}
                    onChange={(event) => setNovaSenha(event.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="w-full rounded-xl py-3.5 pl-11 pr-4 text-[#edf2f3] outline-none transition-all placeholder:text-muted-foreground focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="text-xs uppercase tracking-widest text-muted-foreground">
                  Confirmar nova senha
                </label>
                <div className="relative mt-2">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="confirm-password"
                    data-testid="recovery-confirm-password-input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmarSenha}
                    onChange={(event) => setConfirmarSenha(event.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full rounded-xl py-3.5 pl-11 pr-4 text-[#edf2f3] outline-none transition-all placeholder:text-muted-foreground focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="recovery-save-password-button"
                disabled={mode === 'saving'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-[#121719] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                style={{ background: '#e3b66a', boxShadow: "none" }}
              >
                {mode === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {mode === 'saving' ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          ) : null}

          {mode === 'success' ? (
            <div className="space-y-5 text-center" style={{ fontFamily: "'Sora', sans-serif" }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#22C7C7]/30 bg-[#22C7C7]/10">
                <CheckCircle2 className="h-8 w-8 text-[#22C7C7]" />
              </div>
              <a
                href="/login"
                className="flex w-full items-center justify-center rounded-2xl bg-[#22C7C7] py-3.5 font-semibold text-[#121719] transition-all hover:brightness-110"
              >
                Voltar para o login
              </a>
            </div>
          ) : null}

          {erro ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-400/25 bg-red-400/5 px-4 py-3 text-sm leading-relaxed text-red-300"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {erro}
            </div>
          ) : null}

          {mode !== 'success' ? (
            <div className="mt-6 flex items-center justify-between gap-3 text-xs" style={{ fontFamily: "'Sora', sans-serif" }}>
              <a href="/login" className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-[#edf2f3]">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </a>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-[#22C7C7]" />
                Link seguro
              </span>
            </div>
          ) : null}
        </section>
    </AuthShell>
  )
}
