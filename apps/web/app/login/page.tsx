'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginSchema } from '@shapeos/shared'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'PERSONAL' | 'ALUNO'>('PERSONAL')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { data, error: erroAuth } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    })

    if (erroAuth) {
      if (erroAuth.message.includes('not confirmed')) {
        setErro(
          'Seu e-mail ainda não foi confirmado. Abra o link que enviamos na hora do cadastro e tente novamente.'
        )
      } else {
        setErro('E-mail ou senha incorretos.')
      }
      setCarregando(false)
      return
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', data.user.id)
      .single()

    const tipoReal = perfil?.tipo

    if (tipoReal && tipoReal !== tipo) {
      await supabase.auth.signOut()
      setCarregando(false)
      setErro(
        `Esta conta é ${tipoReal === 'PERSONAL' ? 'de Personal Trainer' : 'de Aluno'}. Selecione "${tipoReal === 'PERSONAL' ? 'Sou Personal' : 'Sou Aluno'}" para entrar.`
      )
      return
    }

    if (tipoReal === 'ALUNO') {
      router.push('/painel')
      router.refresh()
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Shape<span className="text-primary">OS</span>
          </CardTitle>
          <CardDescription>
            {tipo === 'PERSONAL'
              ? 'Ficha Fácil · Painel do Personal'
              : 'Ficha Fácil · Painel do Aluno'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de conta">
              {(['PERSONAL', 'ALUNO'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  role="radio"
                  aria-checked={tipo === opcao}
                  onClick={() => {
                    setTipo(opcao)
                    setErro(null)
                  }}
                  className={
                    tipo === opcao
                      ? 'rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary cursor-pointer'
                      : 'rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:border-foreground/30 cursor-pointer'
                  }
                >
                  {opcao === 'PERSONAL' ? 'Sou Personal' : 'Sou Aluno'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {erro ? (
              <p className="text-sm text-destructive" role="alert">
                {erro}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-primary font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
