'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginSchema } from '@shapeos/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Shield, Loader2, ArrowRight, Mail } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [limpandoSessao, setLimpandoSessao] = useState(true)
  const [modoEsqueci, setModoEsqueci] = useState(false)
  const [avisoEnviado, setAvisoEnviado] = useState(false)

  useEffect(() => {
    async function limpar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.auth.signOut()
      setLimpandoSessao(false)
    }
    void limpar()
  }, [])

  async function enviarLinkRedefinicao() {
    setErro(null)
    if (!email.includes('@')) {
      setErro('Digite seu e-mail para receber o link.')
      return
    }
    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin/redefinir-senha`,
    })
    setCarregando(false)
    if (error) {
      setErro('Nao foi possivel enviar o e-mail. Tente novamente.')
      return
    }
    setAvisoEnviado(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados invalidos')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { data, error: erroAuth } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    })

    if (erroAuth) {
      setErro('Credenciais invalidas.')
      setCarregando(false)
      return
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', data.user.id)
      .single()

    if (perfil?.tipo !== 'ADMIN') {
      await supabase.auth.signOut()
      setErro('Acesso restrito a administradores.')
      setCarregando(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  if (limpandoSessao) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f1a]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f1a] p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
<div>
          <h1 className="text-2xl font-bold tracking-tight">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Área exclusiva dos administradores <Logo size="sm" variant="inverse" />
          </p>
        </div>
        </div>

        <Card className="border-border/50 bg-card shadow-lg shadow-black/20">
          <CardContent className="pt-6">
            {avisoEnviado ? (
              <div className="space-y-4 text-center py-2">
                <p className="font-medium">E-mail enviado!</p>
                <p className="text-sm text-muted-foreground">
                  Enviamos um link de redefinicao para{' '}
                  <span className="font-medium text-foreground">{email}</span>.
                  Abra o Gmail, clique no link e defina uma senha forte.
                </p>
                <Button variant="outline" className="w-full rounded-xl" onClick={() => { setAvisoEnviado(false); setModoEsqueci(false) }}>
                  Voltar ao login
                </Button>
              </div>
            ) : modoEsqueci ? (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="recuperar-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    E-mail administrativo
                  </Label>
                  <Input
                    id="recuperar-email"
                    type="email"
                    placeholder="seu@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="h-11"
                  />
                </div>

                {erro ? (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive" role="alert">{erro}</p>
                  </div>
                ) : null}

                <Button onClick={enviarLinkRedefinicao} className="w-full h-11 font-medium rounded-xl" disabled={carregando}>
                  {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar link de redefinicao
                </Button>

                <button
                  type="button"
                  onClick={() => { setModoEsqueci(false); setErro(null) }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  E-mail administrativo
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@shapeos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Senha
                </Label>
                <Input
                  id="admin-senha"
                  type="password"
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-11"
                />
              </div>

              {erro ? (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive" role="alert">{erro}</p>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full h-11 font-medium rounded-xl"
                disabled={carregando}
              >
                {carregando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Entrar no painel
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setModoEsqueci(true); setErro(null) }}
                  className="w-full h-11 rounded-xl font-medium hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Esqueci minha senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          Somente contas com permissao de administrador acessam esta area.
        </p>
      </div>
    </main>
  )
}
