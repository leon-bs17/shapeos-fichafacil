'use client'

import { useState } from 'react'
import { UserPlus, Users, Mail, Loader2 } from 'lucide-react'
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErro('Sessao expirada. Entre novamente.'); return }

    setOcupado(true)
    try {
      const { data, error } = await supabase.functions.invoke('convite-aluno', { body: { email: email.trim().toLowerCase() } })
      if (error) throw new Error('Falha ao chamar o servico de convites.')
      const alunoId: string | undefined = (data as { data?: { user?: { id?: string } } })?.data?.user?.id
      if (!alunoId) throw new Error((data as { error?: string })?.error ?? 'Nao foi possivel convidar.')

      const { error: erroVinculo } = await supabase.from('personal_alunos').insert({ personal_id: user.id, aluno_id: alunoId })
      if (erroVinculo) {
        if (erroVinculo.code === '23505') throw new Error('Este aluno ja esta vinculado a voce.')
        throw erroVinculo
      }
      void queryClient.invalidateQueries({ queryKey: ['alunos'] })
      setEmail(''); setModalAberto(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground text-sm">
            Convide por e-mail: o aluno recebe o acesso e ja aparece aqui.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="shadow-sm">
          <UserPlus className="mr-1.5 h-4 w-4" /> Convidar aluno
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 skeleton" />)}
        </div>
      ) : alunos?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-lg">Nenhum aluno vinculado</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              Clique em Convidar aluno, informe o e-mail dele e a ficha de treino ja pode ser criada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alunos?.map((a, idx) => (
            <div key={a.vinculo_id} className={`animate-slide-up stagger-${Math.min(idx + 1, 6)} flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-medium">{a.nome}</p>
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {a.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{a.treinos_ativos} ficha(s)</p>
                </div>
                <span className={
                  a.status === 'ATIVO'
                    ? 'inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success'
                    : 'inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'
                }>
                  <span className={`h-1.5 w-1.5 rounded-full ${a.status === 'ATIVO' ? 'bg-success' : 'bg-muted-foreground'}`} />
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Convidar Aluno">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="convite-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail do aluno</Label>
            <Input id="convite-email" type="email" placeholder="aluno@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
            <p className="text-muted-foreground text-xs">
              Se o aluno ainda nao tem conta, ele recebera um e-mail de convite.
            </p>
          </div>
          {erro ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-destructive text-sm">{erro}</p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={convidar} disabled={ocupado || !email.includes('@')} className="rounded-xl shadow-sm">
              {ocupado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {ocupado ? 'Enviando...' : 'Convidar e vincular'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
