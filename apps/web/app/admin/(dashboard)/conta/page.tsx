'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa ter no minimo 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha)) return 'A senha precisa ter pelo menos uma letra.'
  if (!/[0-9]/.test(senha)) return 'A senha precisa ter pelo menos um numero.'
  return null
}

export default function ContaAdminPage() {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const { data: user } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nao autenticado')
      const { data } = await supabase
        .from('usuarios')
        .select('nome, email')
        .eq('id', user.id)
        .single()
      return data
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const problema = validarSenhaForte(senha)
    if (problema) {
      setErro(problema)
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas nao coincidem.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)

    if (error) {
      setErro('Nao foi possivel alterar a senha.')
      return
    }
    setOk(true)
    setSenha('')
    setConfirmar('')
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
        <p className="text-muted-foreground text-sm">
          Dados da sua conta de administrador.
        </p>
      </header>

      <Card className="animate-slide-up stagger-1 max-w-lg">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{user?.nome ?? '—'}</p>
              <p className="text-muted-foreground text-sm">{user?.email ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up stagger-2 max-w-lg">
        <CardContent className="p-5">
          {ok ? (
            <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/20 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <p className="text-sm">Senha alterada com sucesso!</p>
              <button
                onClick={() => setOk(false)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Alterar novamente
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Trocar senha</h2>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conta-nova-senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nova senha
                </Label>
                <Input
                  id="conta-nova-senha"
                  type="password"
                  placeholder="Minimo 8 caracteres, com letras e numeros"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conta-confirmar" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Confirmar nova senha
                </Label>
                <Input
                  id="conta-confirmar"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
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

              <Button type="submit" disabled={carregando} className="rounded-xl shadow-sm">
                {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar nova senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
