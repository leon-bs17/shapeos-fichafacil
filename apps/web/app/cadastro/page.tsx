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
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    if (nome.trim().length < 2) {
      setErro('Informe seu nome.')
      return
    }

    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificação anti-robô antes de continuar.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        data: { nome: nome.trim(), tipo: 'PERSONAL' },
        captchaToken: captchaToken || undefined,
      },
    })

    if (error) {
      setErro(
        error.message.includes('already')
          ? 'Este e-mail já possui conta. Faça login.'
          : error.message.includes('captcha')
            ? 'Verificação anti-robô falhou. Recarregue e tente de novo.'
            : 'Não foi possível criar a conta. Tente novamente.'
      )
      setCarregando(false)
      setCaptchaToken('')
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    setCarregando(false)
    setAguardandoEmail(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Shape<span className="text-primary">OS</span>
          </CardTitle>
          <CardDescription>Criar conta de Personal Trainer</CardDescription>
        </CardHeader>
        <CardContent>
          {aguardandoEmail ? (
            <div className="space-y-3 text-center">
              <p className="font-medium">Conta criada! 📬</p>
              <p className="text-muted-foreground text-sm">
                Enviamos um e-mail de confirmação para{' '}
                <span className="font-medium">{email}</span>. Confirme para
                ativar seu acesso e começar o teste do painel.
              </p>
              <Link
                href="/login"
                className="hover:bg-accent inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-md bg-primary/5 px-3 py-2 text-center text-xs text-muted-foreground">
                Seus alunos não precisam de conta aqui: eles entram pelo
                convite que você envia dentro do painel.
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
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
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Captcha onToken={setCaptchaToken} />

              {erro ? (
                <p className="text-destructive text-sm" role="alert">
                  {erro}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={carregando || (captchaAtivo() && !captchaToken)}
              >
                {carregando ? 'Criando...' : 'Criar conta gratuita'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
