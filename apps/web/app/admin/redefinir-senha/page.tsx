'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react'

function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa ter no minimo 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha)) return 'A senha precisa ter pelo menos uma letra.'
  if (!/[0-9]/.test(senha)) return 'A senha precisa ter pelo menos um numero.'
  return null
}

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [carregando, setCarregando] = useState(false)

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

    if (error) {
      setErro('Nao foi possivel alterar a senha. O link pode ter expirado.')
      setCarregando(false)
      return
    }

    setCarregando(false)
    setOk(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f1a] p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Definir nova senha</h1>
          <p className="text-muted-foreground text-sm">
            Escolha uma senha forte para sua conta de administrador.
          </p>
        </div>

        <Card className="border-border/50 bg-card shadow-lg shadow-black/20">
          <CardContent className="pt-6">
            {ok ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <p className="font-medium">Senha atualizada com sucesso!</p>
                <Button onClick={() => router.push('/admin')} className="w-full h-11 rounded-xl">
                  Ir para o painel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="nova-senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nova senha
                  </Label>
                  <Input
                    id="nova-senha"
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
                  <Label htmlFor="confirmar-senha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirmar-senha"
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

                <Button type="submit" className="w-full h-11 font-medium rounded-xl" disabled={carregando}>
                  {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar nova senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
