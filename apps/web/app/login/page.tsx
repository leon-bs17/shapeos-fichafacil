'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginView from '@/davi/components/views/LoginView'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)

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

    if (error) {
      setErro(
        error.message.includes('not confirmed')
          ? 'Seu e-mail ainda não foi confirmado.'
          : 'E-mail ou senha incorretos.'
      )
      return
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', data.user.id)
      .single()

    if (perfil?.tipo === 'ADMIN') router.push('/admin')
    else if (perfil?.tipo === 'ALUNO') router.push('/painel')
    else router.push('/')

    router.refresh()
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

  return <LoginView onEnter={entrar} onGithub={entrarGithub} error={erro} />
}
