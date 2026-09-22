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

  return (
    <div className="relative">
      <LoginView onEnter={entrar} />
      {erro ? (
        <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-2xl border border-red-400/40 bg-[#141414]/95 px-5 py-3 text-sm text-red-300 shadow-2xl">
          {erro}
        </div>
      ) : null}
    </div>
  )
}
