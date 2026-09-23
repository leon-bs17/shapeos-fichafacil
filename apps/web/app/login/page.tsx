'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)

  async function redirecionarPorPerfil(
    supabase: ReturnType<typeof createClient>,
    userId: string
  ) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', userId)
      .single()

    if (perfil?.tipo === 'ADMIN') router.push('/admin')
    else if (perfil?.tipo === 'ALUNO') router.push('/painel')
    else router.push('/')

    router.refresh()
  }

  async function tentarCadastrarBiometria(
    supabase: ReturnType<typeof createClient>
  ) {
    if (!estaNoMobile()) return
    if (!(await autenticadorDoDispositivoDisponivel())) return

    const chave = 'shapeos.passkey.enrollment-attempted'
    if (window.localStorage.getItem(chave) === '1') return

    try {
      const { error } = await supabase.auth.registerPasskey()
      if (!error || error.code === 'webauthn_credential_exists') {
        window.localStorage.setItem(chave, '1')
      }
    } catch {
      // Biometria é opcional e nunca bloqueia o login comum.
    }
  }

  async function entrar(_role: string, email: string, password: string) {
    setErro(null)

    if (!email || !password) {
      setErro('Informe e-mail e senha.')
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      setErro(
        error?.message.includes('not confirmed')
          ? 'Seu e-mail ainda não foi confirmado.'
          : 'E-mail ou senha incorretos.'
      )
      return
    }

    await tentarCadastrarBiometria(supabase)
    await redirecionarPorPerfil(supabase, data.user.id)
  }

  async function entrarGithub() {
    setErro(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErro('Não foi possível iniciar o login com GitHub.')
    }
  }

  async function entrarComBiometria() {
    setErro(null)

    if (!estaNoMobile()) {
      throw new Error('A biometria está disponível apenas na versão mobile.')
    }

    if (!(await autenticadorDoDispositivoDisponivel())) {
      throw new Error(
        'Este aparelho ou navegador não oferece biometria compatível.'
      )
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPasskey()

    if (error) {
      if (error.code === 'passkey_disabled') {
        throw new Error(
          'A biometria ainda não está habilitada no servidor do ShapeOS.'
        )
      }
      if (error.code === 'webauthn_credential_not_found') {
        throw new Error(
          'Nenhuma biometria foi cadastrada neste aparelho. Entre uma vez com e-mail e senha.'
        )
      }
      if (error.code === 'webauthn_verification_failed') {
        throw new Error(
          'Não foi possível confirmar sua biometria. Tente novamente.'
        )
      }
      if (error.name === 'NotAllowedError') {
        throw new Error('Autenticação biométrica cancelada.')
      }
      throw new Error(error.message || 'Não foi possível entrar com biometria.')
    }

    const user = data?.user ?? (await supabase.auth.getUser()).data.user
    if (!user) {
      throw new Error(
        'A biometria foi validada, mas a sessão não pôde ser criada.'
      )
    }

    await redirecionarPorPerfil(supabase, user.id)
  }

  return (
    <LoginView
      onEnter={entrar}
      onGithub={entrarGithub}
      onBiometric={entrarComBiometria}
      error={erro}
    />
  )
}
