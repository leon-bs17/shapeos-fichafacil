'use client'

import { useState } from 'react'
import { UserPlus, Users, Mail, Loader2, CheckCircle2, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { useAlunos } from '@/hooks/use-alunos'

export default function AlunosPage() {
  return (
    <DashboardShell>
      <AlunosConteudo />
    </DashboardShell>
  )
}

function AlunosConteudo() {
  const { data: alunos, isLoading, error, refetch } = useAlunos()
  const [modalAberto, setModalAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const queryClient = useQueryClient()

  async function convidar() {
    setErro(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErro('Sessão expirada. Entre novamente.'); return }

    setOcupado(true)
    try {
      const { data, error } = await supabase.functions.invoke('convite-aluno', { body: { email: email.trim().toLowerCase() } })
      if (error) throw new Error('Falha ao chamar o serviço de convites.')
      const alunoId: string | undefined = (data as { data?: { user?: { id?: string } } })?.data?.user?.id
      if (!alunoId) throw new Error((data as { error?: string })?.error ?? 'Não foi possivel convidar.')

      const { error: erroVinculo } = await supabase.from('personal_alunos').insert({ personal_id: user.id, aluno_id: alunoId })
      if (erroVinculo) {
        if (erroVinculo.code === '23505') throw new Error('Este aluno ja esta vinculado a você.')
        throw erroVinculo
      }
      void queryClient.invalidateQueries({ queryKey: ['alunos'] })
      setEmail(''); setModalAberto(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally { setOcupado(false) }
  }

  return (
    <PersonalWorkspace page="alunos">
      <PersonalPageHeader icon="alunos" title="Alunos" description="Seus alunos, fichas e vínculos em um só lugar." actions={<Button onClick={() => setModalAberto(true)}><UserPlus size={16} aria-hidden="true" />Convidar aluno</Button>} />
      {error ? <div className="personal-load-error" role="alert"><p>Não foi possível carregar seus alunos.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : isLoading ? <div role="status" aria-label="Carregando alunos" className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 skeleton" />)}</div> : !alunos?.length ? <Card><CardContent className="py-12 text-center"><Users size={28} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" /><h2>Nenhum aluno vinculado</h2><p className="text-muted-foreground text-xs mt-2 max-w-sm mx-auto">Convide um aluno por e-mail para começar a montar suas fichas.</p></CardContent></Card> :
        <section className="personal-panel" aria-labelledby="personal-students-title">
          <header className="personal-panel-heading"><h2 id="personal-students-title">Alunos vinculados</h2><p>{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</p></header>
          <table className="personal-table"><caption className="sr-only">Alunos vinculados e suas fichas ativas</caption><thead><tr><th scope="col">Aluno</th><th scope="col">Fichas ativas</th><th scope="col">Status</th></tr></thead><tbody>
            {alunos.map(aluno => <tr key={aluno.vinculo_id}>
              <td><div className="personal-student-identity"><span className="personal-avatar" aria-hidden="true">{aluno.nome?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR') || '?'}</span><div><strong>{aluno.nome}</strong><p><Mail size={12} aria-hidden="true" /><span>{aluno.email}</span></p></div></div></td>
              <td data-label="Fichas ativas"><span className="personal-student-count">{aluno.treinos_ativos}</span></td>
              <td data-label="Status"><span className="personal-status" data-active={aluno.status === 'ATIVO'}>{aluno.status === 'ATIVO' ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{aluno.status === 'ATIVO' ? 'Ativo' : aluno.status}</span></td>
            </tr>)}
          </tbody></table>
        </section>}
      <Modal personal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Convidar Aluno">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="convite-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail do aluno</Label>
            <Input id="convite-email" type="email" placeholder="aluno@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
            <p className="text-muted-foreground text-xs">
              Se o aluno ainda não tem conta, ele recebera um e-mail de convite.
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
    </PersonalWorkspace>
  )
}
