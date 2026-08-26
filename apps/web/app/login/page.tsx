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
import { Captcha, captchaAtivo } from '@/components/ui/captcha'
import { createClient } from '@/lib/supabase/client'
import { GoogleIcon } from '@/components/ui/google-icon'
import { ArrowRight, Dumbbell, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'PERSONAL' | 'ALUNO'>('PERSONAL')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados invalidos')
      return
    }

    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificacao anti-robo antes de continuar.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { data, error: erroAuth } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: { captchaToken: captchaToken || undefined },
    })

    if (erroAuth) {
      setCaptchaToken('')
      if (erroAuth.message.includes('not confirmed')) {
        setErro(
          'Seu e-mail ainda nao foi confirmado. Abra o link que enviamos na hora do cadastro e tente novamente.'
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

    if (tipoReal === 'ADMIN') {
      router.push('/admin')
      router.refresh()
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

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Shape<span className="text-primary">OS</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Ficha Fácil para Personal Trainers
          </p>
        </div>

        <Card className="border-border/50 shadow-lg shadow-black/5">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {tipo === 'PERSONAL'
                ? 'Painel do Personal'
                : 'Painel do Aluno'}
            </CardTitle>
            <CardDescription>
              {tipo === 'PERSONAL'
                ? 'Acesse seus treinos e alunos'
                : 'Acesse sua ficha de treino'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {tipo === 'PERSONAL' ? (
              <>
                <Button
                  variant="outline"
                  className="w-full h-11 font-medium"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Entrar com Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground tracking-wider">
                      ou
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-center text-xs text-muted-foreground">
                Use o e-mail e a senha definidos no seu convite.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl" role="radiogroup" aria-label="Tipo de conta">
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
                        ? 'rounded-lg bg-background px-3 py-2.5 text-sm font-medium shadow-sm transition-all'
                        : 'rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all'
                    }
                  >
                    {opcao === 'PERSONAL' ? 'Sou Personal' : 'Sou Aluno'}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-11"
                />
              </div>

              <Captcha onToken={setCaptchaToken} />

              {erro ? (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive" role="alert">
                    {erro}
                  </p>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={carregando || (captchaAtivo() && !captchaToken)}
              >
                {carregando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {tipo === 'PERSONAL' ? (
            <>
              Nao tem conta?{' '}
              <Link href="/cadastro" className="text-primary font-medium hover:underline">
                Cadastre-se gratis
              </Link>
            </>
          ) : (
            'Alunos recebem acesso pelo convite enviado pelo personal.'
          )}
        </p>
      </div>
    </main>
  )
}
