'use client'

import { useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { useAlunos } from '@/hooks/use-alunos'

export default function AlunosPage() {
  return (
    <DashboardShell>
      <AlunosConteudo />
    </DashboardShell>
  )
}

function AlunosConteudo() {
  const { data: alunos, isLoading } = useAlunos()
  const [modalAberto, setModalAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const queryClient = useQueryClient()

  async function convidar() {
    setErro(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Entre novamente.')
      return
    }

    setOcupado(true)
    try {
      const { data, error } = await supabase.functions.invoke('convite-aluno', {
        body: { email: email.trim().toLowerCase() },
      })

      if (error) throw new Error('Falha ao chamar o serviço de convites.')

      const alunoId: string | undefined =
        (data as { data?: { user?: { id?: string } } })?.data?.user?.id
      if (!alunoId) {
        throw new Error(
          (data as { error?: string })?.error ?? 'Não foi possível convidar.'
        )
      }

      const { error: erroVinculo } = await supabase
        .from('personal_alunos')
        .insert({ personal_id: user.id, aluno_id: alunoId })

      if (erroVinculo) {
        if (erroVinculo.code === '23505') {
          throw new Error('Este aluno já está vinculado a você.')
        }
        throw erroVinculo
      }

      void queryClient.invalidateQueries({ queryKey: ['alunos'] })
      setEmail('')
      setModalAberto(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground text-sm">
            Convide por e-mail: o aluno recebe o acesso e já aparece aqui.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <UserPlus className="mr-1 h-4 w-4" /> Convidar aluno
        </Button>
      </header>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : alunos?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum aluno vinculado</p>
            <p className="text-muted-foreground max-w-md text-sm">
              Clique em Convidar aluno, informe o e-mail dele e a ficha de
              treino já pode ser criada em seguida.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {alunos?.map((a) => (
            <li
              key={a.vinculo_id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{a.nome}</p>
                <p className="text-muted-foreground text-sm">{a.email}</p>
              </div>
              <div className="text-right">
                <span
                  className={
                    a.status === 'ATIVO'
                      ? 'rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
                      : 'rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                  }
                >
                  {a.status}
                </span>
                <p className="text-muted-foreground mt-1 text-xs">
                  {a.treinos_ativos} ficha(s) ativa(s)
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Convidar Aluno">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="convite-email">E-mail do aluno</Label>
            <Input
              id="convite-email"
              type="email"
              placeholder="aluno@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Se o aluno ainda não tem conta, ele receberá um e-mail de
              convite. Se já tiver, será vinculado na hora.
            </p>
          </div>

          {erro ? <p className="text-destructive text-sm">{erro}</p> : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={convidar} disabled={ocupado || !email.includes('@')}>
              {ocupado ? 'Enviando...' : 'Convidar e vincular'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
