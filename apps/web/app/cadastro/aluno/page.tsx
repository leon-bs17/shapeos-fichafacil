'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export default function CadastroAlunoPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [concluido, setConcluido] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const emailLimpo = email.trim().toLowerCase()
    const nomeLimpo = nome.trim()
    const parsed = loginSchema.safeParse({ email: emailLimpo, senha })

    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    if (nomeLimpo.length < 2) {
      setErro('Informe seu nome.')
      return
    }

    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificação anti-robô.')
      return
    }

    setCarregando(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.senha,
        options: {
          data: { nome: nomeLimpo, tipo: 'ALUNO' },
          captchaToken: captchaToken || undefined,
        },
      })

      if (error) {
        const mensagem = error.message.toLowerCase()
        setErro(
          mensagem.includes('already') || error.code === 'user_already_exists'
            ? 'Este e-mail já possui conta. Faça login.'
            : mensagem.includes('captcha')
              ? 'Verificação anti-robô falhou. Tente novamente.'
              : error.status === 429 || mensagem.includes('rate limit')
                ? 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.'
                : 'Não foi possível criar a conta de Aluno. Tente novamente.'
        )
        setCaptchaToken('')
        return
      }

      if (!data.user) {
        setErro('Não foi possível criar a conta de Aluno. Tente novamente.')
        return
      }

      setEmail(emailLimpo)

      if (data.session) {
        window.location.replace('/painel')
        return
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: parsed.data.senha,
      })

      if (!loginError && loginData.user) {
        window.location.replace('/painel')
        return
      }

      setConcluido(true)
    } catch {
      setErro('Não foi possível conectar ao serviço de cadastro. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen flex bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md mx-auto px-4 py-16 md:py-24 flex items-center justify-center">
        <Card className="w-full shadow-xl border-border/30 bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <Logo size="xl" className="mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold tracking-tight">Criar conta de Aluno</CardTitle>
            <CardDescription className="text-muted-foreground">
              Acesse seus treinos, histórico e evolução no ShapeOS
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {concluido ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-lg">Conta de Aluno criada!</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    A conta <span className="font-medium text-foreground">{email}</span> já foi criada. Você pode entrar normalmente com seu e-mail e senha.
                  </p>
                </div>
                <Link href="/login">
                  <Button className="w-full h-11 rounded-xl">Ir para o login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-center text-xs text-muted-foreground">
                  Este cadastro cria uma conta de Aluno ativa. Seu Personal poderá vincular sua conta e atribuir fichas depois.
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
                    <Input
                      id="nome"
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="h-11 pl-10 pr-4"
                      disabled={carregando}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail</Label>
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
                  <Label htmlFor="senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="h-11 pl-10 pr-12"
                      disabled={carregando}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((valor) => !valor)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Captcha onToken={setCaptchaToken} />

                {erro ? (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive" role="alert">{erro}</p>
                  </div>
                ) : null}

                <Button type="submit" className="w-full h-11 font-medium rounded-xl" disabled={carregando || (captchaAtivo() && !captchaToken)}>
                  {carregando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar conta de Aluno
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-3 text-center text-sm">
                  <Link href="/login" className="text-primary font-medium hover:underline">Já tenho conta</Link>
                  <Link href="/cadastro" className="text-primary font-medium hover:underline">Sou Personal</Link>
                </div>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-4">
            <p className="text-center text-xs text-muted-foreground/70">
              Ao criar a conta, você concorda com nossos{' '}
              <Link href="/termos" className="text-primary hover:underline">Termos de uso</Link>
              {' '}e{' '}
              <Link href="/privacidade" className="text-primary hover:underline">Política de privacidade</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
