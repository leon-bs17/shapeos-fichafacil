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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, captchaAtivo } from '@/components/ui/captcha'
import { createClient } from '@/lib/supabase/client'
import { GoogleIcon } from '@/components/ui/google-icon'
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export default function LoginPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'PERSONAL' | 'ALUNO'>('PERSONAL')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
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

    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificação anti-robô antes de continuar.')
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
    <main className="min-h-screen flex bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md mx-auto px-4 py-16 md:py-24 flex items-center justify-center">
        <Card className="w-full shadow-xl border-border/30 bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <Logo size="xl" className="mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo ao ShapeOS</CardTitle>
            <CardDescription className="text-muted-foreground">
              {tipo === 'PERSONAL'
                ? 'Acesse seu painel de personal trainer'
                : 'Acesse sua ficha de treino'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Tipo selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 rounded-xl" role="radiogroup" aria-label="Tipo de conta">
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
                      ? 'rounded-lg bg-background px-3 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 text-foreground'
                      : 'rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all duration-200'
                  }
                >
                  {opcao === 'PERSONAL' ? 'Sou Personal' : 'Sou Aluno'}
                </button>
              ))}
            </div>

            {erro ? (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive flex items-center gap-2" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {erro}
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="h-11 pl-10 pr-4"
                    disabled={carregando}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Senha
                  </Label>
                  <Link href="/admin/redefinir-senha" className="text-xs text-primary hover:underline font-medium">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-11 pl-10 pr-12"
                    disabled={carregando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Captcha onToken={setCaptchaToken} />

              <Button
                type="submit"
                className="w-full h-11 font-medium rounded-xl"
                disabled={carregando || (captchaAtivo() && !captchaToken)}
              >
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Google OAuth */}
            {tipo === 'PERSONAL' && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground tracking-wider">
                      ou continue com
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-11 font-medium rounded-xl gap-2 transition-all hover:bg-accent/50"
                  onClick={handleGoogleLogin}
                  disabled={carregando}
                >
                  <GoogleIcon className="h-4.5 w-4.5" />
                  <span>Entrar com Google</span>
                </Button>
              </>
            )}

            <CardFooter className="flex flex-col space-y-3 pt-4">
              <p className="text-center text-sm text-muted-foreground">
                Não tem conta?{' '}
                <Link href="/cadastro" className="text-primary font-medium hover:underline">
                  Criar conta de Personal
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground/70">
                Alunos acessam via convite do personal trainer.
              </p>
            </CardFooter>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}