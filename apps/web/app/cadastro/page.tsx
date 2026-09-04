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
import { ArrowRight, Loader2, CheckCircle2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aguardandoEmail, setAguardandoEmail] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos'); return }
    if (nome.trim().length < 2) { setErro('Informe seu nome.'); return }
    if (captchaAtivo() && !captchaToken) { setErro('Confirme a verificação anti-robô.'); return }

    setCarregando(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: { data: { nome: nome.trim(), tipo: 'PERSONAL' }, captchaToken: captchaToken || undefined },
    })

    if (error) {
      setErro(error.message.includes('already') ? 'Este e-mail já possui conta. Faça login.' : error.message.includes('captcha') ? 'Verificação anti-robô falhou.' : 'Não foi possível criar a conta.')
      setCarregando(false); setCaptchaToken(''); return
    }
    if (data.session) { router.push('/'); router.refresh(); return }
    setCarregando(false); setAguardandoEmail(true)
  }

  return (
    <main className="relative min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Background animated orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-info/10 blur-3xl animate-float-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-success/10 blur-3xl animate-float-slow delay-2000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noise)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.015]" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 py-16 md:py-24 flex min-h-screen items-center justify-center">
        <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-card/50 backdrop-blur-xl border border-border/30 animate-slide-up">
          {/* Left side - Brand */}
          <div className="hidden lg:block lg:w-1/2 relative p-12 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-primary/5 via-background to-info/5">
            <div className="flex items-center gap-3">
              <Logo size="xl" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-info/20 rounded-full blur-2xl" />
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-info/10 border border-primary/20 shadow-xl">
                  <svg className="w-24 h-24 text-primary/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.553.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M23 12a1 1 0 01-1 1v-1a1 1 0 011-1h.01z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Crie sua conta de Personal
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                Gerencie alunos, crie fichas de treino personalizadas e acompanhe a evolução de cada um — tudo em um só lugar.
              </p>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground/70">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.177-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Seguro
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Rápido
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.177-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Privado
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="w-full lg:w-1/2 p-6 lg:p-12 flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
            <div className="w-full max-w-md">
              <Card className="glass-strong shadow-2xl border-border/30 animate-fade-in stagger-1">
                <CardHeader className="text-center pb-4">
                  <Logo size="lg" className="mx-auto mb-4" />
                  <CardTitle className="text-2xl font-bold tracking-tight">Criar conta gratuita</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Comece a gerenciar seus alunos hoje mesmo
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {aguardandoEmail ? (
                    <div className="space-y-4 text-center py-4 animate-fade-in">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle2 className="h-7 w-7 text-success" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-lg">Conta criada com sucesso!</p>
                        <p className="text-muted-foreground text-sm">
                          Enviamos um e-mail de confirmação para{' '}
                          <span className="font-medium text-foreground">{email}</span>.
                        </p>
                      </div>
                      <Link href="/login">
                        <Button variant="outline" className="w-full h-11 rounded-xl">
                          Voltar ao login
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in stagger-1">
                      <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-center text-xs text-muted-foreground animate-slide-up stagger-1">
                        Seus alunos não precisam de conta aqui: eles entram pelo convite que você envia dentro do painel.
                      </div>

                      <div className="space-y-1.5 animate-slide-up stagger-2">
                        <Label htmlFor="nome" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" aria-hidden="true" />
                          <Input
                            id="nome"
                            placeholder="Seu nome completo"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            className="h-11 pl-10 pr-4 input-tech"
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
                            className="h-11 pl-10 pr-4 input-tech"
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
                            className="h-11 pl-10 pr-12 input-tech"
                            disabled={carregando}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarSenha(!mostrarSenha)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                          >
                            {mostrarSenha ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.071 7.071l1.06 1.06m-1.06-1.06l-1.06 1.06" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <Captcha onToken={setCaptchaToken} />

                      {erro ? (
                        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 animate-slide-up">
                          <p className="text-sm text-destructive flex items-center gap-2" role="alert">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            {erro}
                          </p>
                        </div>
                      ) : null}

                      <Button type="submit" className="w-full h-11 font-medium rounded-xl btn-tech group" disabled={carregando || (captchaAtivo() && !captchaToken)}>
                        {carregando ? (
                          <>
                            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="none" stroke="currentColor" strokeWidth="4" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Criando conta...
                          </>
                        ) : (
                          <>
                            Criar conta gratuita
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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

                <CardFooter className="flex flex-col space-y-3 pt-6">
                  <p className="text-center text-xs text-muted-foreground/70">
                    Ao criar a conta, você concorda com nossos{' '}
                    <Link href="/termos" className="text-primary hover:underline">Termos de uso</Link>
                    {' '}e{' '}
                    <Link href="/privacidade" className="text-primary hover:underline">Política de privacidade</Link>
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}