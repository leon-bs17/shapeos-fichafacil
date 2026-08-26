'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginSchema } from '@shapeos/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, captchaAtivo } from '@/components/ui/captcha'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Dumbbell, Loader2, CheckCircle2 } from 'lucide-react'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aguardandoEmail, setAguardandoEmail] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? 'Dados invalidos'); return }
    if (nome.trim().length < 2) { setErro('Informe seu nome.'); return }
    if (captchaAtivo() && !captchaToken) { setErro('Confirme a verificacao anti-robo.'); return }

    setCarregando(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: { data: { nome: nome.trim(), tipo: 'PERSONAL' }, captchaToken: captchaToken || undefined },
    })

    if (error) {
      setErro(error.message.includes('already') ? 'Este e-mail ja possui conta. Faca login.' : error.message.includes('captcha') ? 'Verificacao anti-robo falhou.' : 'Nao foi possivel criar a conta.')
      setCarregando(false); setCaptchaToken(''); return
    }
    if (data.session) { router.push('/'); router.refresh(); return }
    setCarregando(false); setAguardandoEmail(true)
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
          <p className="text-muted-foreground text-sm">Crie sua conta de Personal Trainer</p>
        </div>

        <Card className="border-border/50 shadow-lg shadow-black/5">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {aguardandoEmail ? 'E-mail enviado!' : 'Criar conta gratuita'}
            </CardTitle>
            <CardDescription>
              {aguardandoEmail ? 'Confirme seu e-mail para ativar' : 'Comece a gerenciar seus alunos'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {aguardandoEmail ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Conta criada com sucesso!</p>
                  <p className="text-muted-foreground text-sm">
                    Enviamos um e-mail de confirmacao para{' '}
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-center text-xs text-muted-foreground">
                  Seus alunos nao precisam de conta aqui: eles entram pelo convite que voce envia dentro do painel.
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</Label>
                  <Input id="nome" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail</Label>
                  <Input id="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <Input id="senha" type="password" placeholder="Minimo 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" required className="h-11" />
                </div>

                <Captcha onToken={setCaptchaToken} />

                {erro ? (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive" role="alert">{erro}</p>
                  </div>
                ) : null}

                <Button type="submit" className="w-full h-11 font-medium rounded-xl" disabled={carregando || (captchaAtivo() && !captchaToken)}>
                  {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>
                    Criar conta gratuita
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Ja tem conta?{' '}
                  <Link href="/login" className="text-primary font-medium hover:underline">Entrar</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
