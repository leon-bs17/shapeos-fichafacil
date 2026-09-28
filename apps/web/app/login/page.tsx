'use client'

import { useRef, useState } from 'react'
import LoginView from '@/davi/components/views/LoginView'
import { createClient } from '@/lib/supabase/client'

function estaNoMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

async function autenticadorDoDispositivoDisponivel() {
  if (
    typeof window === 'undefined' ||
    !('PublicKeyCredential' in window) ||
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export default function LoginPage() {
  const [erro, setErro] = useState<string | null>(null)
  const entrandoRef = useRef(false)

  async function redirecionarPorPerfil(supabase: ReturnType<typeof createClient>, userId: string) {
    const { data: perfil, error } = await supabase
      .from('usuarios')
      .select('tipo, status_conta')
      .eq('id', userId)
      .single()

    if (error || !perfil?.tipo) {
      await supabase.auth.signOut()
      entrandoRef.current = false
      setErro('Não foi possível carregar seu perfil. Tente novamente.')
      return
    }

    if (perfil.status_conta === 'PENDENTE') {
      await supabase.auth.signOut()
      entrandoRef.current = false
      setErro('Seu cadastro de Personal está aguardando aprovação do administrador.')
      return
    }

    if (perfil.status_conta === 'BLOQUEADO') {
      await supabase.auth.signOut()
      entrandoRef.current = false
      setErro('Sua conta está bloqueada. Entre em contato com o administrador do ShapeOS.')
      return
    }

    const destino =
      perfil.tipo === 'ADMIN' ? '/admin' : perfil.tipo === 'ALUNO' ? '/painel' : '/'

    window.location.replace(destino)
  }

  async function tentarCadastrarBiometria(supabase: ReturnType<typeof createClient>) {
    if (!estaNoMobile()) return
    if (!(await autenticadorDoDispositivoDisponivel())) return

    const chave = 'shapeos.passkey.enrollment-attempted'
    if (window.localStorage.getItem(chave) === '1') return

    try {
      const { error } = await supabase.auth.registerPasskey()

      if (!error || error.code === 'webauthn_credential_exists') {
        window.localStorage.setItem(chave, '1')
        return
      }

      if (error.code === 'passkey_disabled') return
    } catch {
      // A biometria é opcional e nunca deve bloquear o login por senha.
    }
  }

  async function entrar(_role: string, email: string, password: string) {
    setErro(null)

    const emailLimpo = email.trim()
    if (!emailLimpo || !password) {
      setErro('Informe e-mail e senha.')
      return
    }

    if (entrandoRef.current) return
    entrandoRef.current = true

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLimpo,
      password,
    })

    if (error || !data.user) {
      entrandoRef.current = false
      setErro(
        error?.message.includes('not confirmed')
          ? 'Seu e-mail ainda não foi confirmado.'
          : 'E-mail ou senha incorretos.'
      )
      return
    }

    // Verifica o status administrativo antes de oferecer/cadastrar biometria.
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('status_conta')
      .eq('id', data.user.id)
      .single()

    if (perfil?.status_conta === 'PENDENTE' || perfil?.status_conta === 'BLOQUEADO') {
      await redirecionarPorPerfil(supabase, data.user.id)
      return
    }

    await tentarCadastrarBiometria(supabase)
    await redirecionarPorPerfil(supabase, data.user.id)
  }

  async function entrarComBiometria() {
    setErro(null)

    if (entrandoRef.current) return

    if (!estaNoMobile()) {
      throw new Error('A biometria está disponível apenas na versão mobile.')
    }

    if (!(await autenticadorDoDispositivoDisponivel())) {
      throw new Error('Este aparelho ou navegador não oferece biometria compatível.')
    }

    entrandoRef.current = true
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPasskey()

    if (error) {
      entrandoRef.current = false
      if (error.code === 'passkey_disabled') {
        throw new Error('A biometria ainda não está habilitada no servidor do ShapeOS.')
      }
      if (error.code === 'webauthn_credential_not_found') {
        throw new Error('Nenhuma digital foi cadastrada neste aparelho. Entre uma vez com e-mail e senha para ativá-la.')
      }
      if (error.code === 'webauthn_verification_failed') {
        throw new Error('Não foi possível confirmar sua digital. Tente novamente.')
      }
      if (error.name === 'NotAllowedError') {
        throw new Error('Autenticação biométrica cancelada.')
      }
      throw new Error(error.message || 'Não foi possível entrar com biometria.')
    }

    const user = data?.user ?? (await supabase.auth.getUser()).data.user
    if (!user) {
      entrandoRef.current = false
      throw new Error('A digital foi validada, mas a sessão não pôde ser criada.')
    }

    await redirecionarPorPerfil(supabase, user.id)
  }

  return (
    <div className="relative">
      <LoginView onEnter={entrar} onBiometric={entrarComBiometria} />
      {erro ? (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-2xl border border-red-400/40 bg-[#141414]/95 px-5 py-3 text-sm text-red-300 shadow-2xl"
        >
          {erro}
        </div>
      ) : null}
    </div>
  )
}
