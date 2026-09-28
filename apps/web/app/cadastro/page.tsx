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
import { ArrowRight, Loader2, CheckCircle2, Mail, Lock, User, Eye, EyeOff, Clock3 } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

type CadastroConcluido = 'APROVACAO' | 'EMAIL_E_APROVACAO' | null

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [concluido, setConcluido] = useState<CadastroConcluido>(null)
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
          data: { nome: nomeLimpo, tipo: 'PERSONAL' },
          captchaToken: captchaToken || undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        const limiteEmail =
          error.code === 'over_email_send_rate_limit' ||
          error.status === 429 ||
          error.message.toLowerCase().includes('rate limit')

        setErro(
          limiteEmail
            ? 'O serviço de confirmação por e-mail atingiu o limite temporário de envios. Sua conta não foi criada. Tente novamente daqui a alguns minutos.'
            : error.message.toLowerCase().includes('already') || error.code === 'user_already_exists'
              ? 'Este e-mail já possui conta. Faça login.'
              : error.message.toLowerCase().includes('captcha')
                ? 'Verificação anti-robô falhou. Tente novamente.'
                : 'Não foi possível criar a conta. Tente novamente.'
        )
        setCaptchaToken('')
        return
      }

      if (!data.user) {
        setErro('Não foi possível criar a conta. Tente novamente.')
        return
      }

      setEmail(emailLimpo)

      // Personais novos são criados como PENDENTE e precisam ser aprovados
      // no painel ADMIN antes do primeiro acesso ao sistema.
      if (data.session) {
        await supabase.auth.signOut()
        setConcluido('APROVACAO')
      } else {
        setConcluido('EMAIL_E_APROVACAO')
      }
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
            <CardTitle className="text-2xl font-bold tracking-tight">Criar conta de Personal</CardTitle>
            <CardDescription className="text-muted-foreground">
              Gerencie alunos, crie fichas e acompanhe evolução
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {concluido ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
                  {concluido === 'APROVACAO' ? (
                    <Clock3 className="h-7 w-7 text-warning" />
                  ) : (
                    <CheckCircle2 className="h-7 w-7 text-warning" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-lg">Conta de Personal criada!</p>
                  {concluido === 'APROVACAO' ? (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Seu cadastro está <span className="font-medium text-foreground">aguardando aprovação do administrador</span>.
                      Assim que for aprovado, você poderá entrar normalmente com seu e-mail e senha.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Enviamos uma confirmação para <span className="font-medium text-foreground">{email}</span>.
                      Depois de confirmar o e-mail, seu cadastro ficará aguardando aprovação do administrador.
                    </p>
                  )}
                </div>
                <Link href="/login">
                  <Button variant="outline" className="w-full h-11 rounded-xl">
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-center text-xs text-muted-foreground">
                  Este cadastro cria uma conta de Personal. Após o cadastro, um administrador precisa aprovar seu acesso.
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
                      onClick={() => setMostrarSenha(!mostrarSenha)}
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
                    <p className="text-sm text-destructive flex items-center gap-2" role="alert">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {erro}
                    </p>
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
                      Criar conta de Personal
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Já tem conta?{' '}
                  <Link href="/login" className="text-primary font-medium hover:underline">Entrar</Link>
                </p>
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
