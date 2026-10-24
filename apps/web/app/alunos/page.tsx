'use client'

import { useState } from 'react'
import { UserPlus, Users, Mail, Loader2, CheckCircle2, Clock3, Eye, FileText, UserRound } from 'lucide-react'
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
import { StudentFollowUpPanel } from '@/components/fitness/student-follow-up'
import { ShapeosBanner } from '@/components/layout/shapeos-banner'
import styles from './page.module.css'

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
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const selectedStudent = alunos?.find(student => student.aluno_id === selectedStudentId)
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const queryClient = useQueryClient()

  const metrics = [
    { label: 'Alunos vinculados', value: alunos?.length, icon: Users },
    { label: 'Fichas ativas', value: alunos?.reduce((total, aluno) => total + aluno.treinos_ativos, 0), icon: FileText },
    { label: 'Alunos com ficha ativa', value: alunos?.filter(aluno => aluno.treinos_ativos > 0).length, icon: UserRound },
  ]

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
      <PersonalPageHeader icon="alunos" title="Alunos" description="Seus alunos, fichas e acompanhamento em um só lugar." actions={<Button onClick={() => setModalAberto(true)}><UserPlus size={16} aria-hidden="true" />Convidar aluno</Button>} />
      <div className={styles.page}>
      <ShapeosBanner titleId="personal-students-banner" eyebrow="Alunos do Personal" title={<>Acompanhe <span>seus alunos</span> de perto</>} description="Consulte fichas e acompanhe cada aluno em um só lugar."
        art={<svg viewBox="0 0 360 140" fill="none" stroke="currentColor" strokeWidth=".8">
          <path d="M60 92C120 15 225 15 300 92M60 92C140 145 210 145 300 92M60 92C150 88 205 18 300 92" />
          {[{x:60,y:92},{x:180,y:35},{x:300,y:92}].map(({x,y}) => <g key={x} transform={`translate(${x} ${y})`}><circle r="24" fill="var(--p-bg)" /><circle cy="-6" r="5" /><path d="M-9 12v-3a9 9 0 0 1 18 0v3" /></g>)}
        </svg>} />
      <dl className={styles.metrics} aria-label="Resumo dos alunos" aria-busy={isLoading}>{metrics.map(({label,value,icon:Icon}) => <div key={label}><span className={styles.metricIcon}><Icon aria-hidden="true" /></span><div><dt>{label}</dt><dd>{isLoading || error ? '—' : value ?? 0}</dd></div></div>)}</dl>
      {error ? <div className="personal-load-error" role="alert"><p>Não foi possível carregar seus alunos.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : isLoading ? <div role="status" aria-label="Carregando alunos" className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 skeleton" />)}</div> : !alunos?.length ? <Card><CardContent className="py-12 text-center"><Users size={28} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" /><h2>Nenhum aluno vinculado</h2><p className="text-muted-foreground text-xs mt-2 max-w-sm mx-auto">Convide um aluno por e-mail para começar a montar suas fichas.</p></CardContent></Card> :
        <section className={`personal-panel ${styles.panel}`} aria-labelledby="personal-students-title">
          <header className="personal-panel-heading"><h2 id="personal-students-title">Alunos vinculados</h2><p>{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</p></header>
          <table className={`personal-table ${styles.table}`}><caption className="sr-only">Alunos vinculados, fichas ativas e acesso ao acompanhamento</caption><thead><tr><th scope="col">Aluno</th><th scope="col">Fichas ativas</th><th scope="col">Status</th><th scope="col" className={styles.actionCell}>Ações</th></tr></thead><tbody>
            {alunos.map(aluno => <tr key={aluno.vinculo_id}>
              <td data-label="Aluno"><div className="personal-student-identity"><span className={`personal-avatar ${styles.avatar}`} aria-hidden="true">{aluno.nome?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR') || '?'}</span><div><strong>{aluno.nome}</strong><p><Mail size={12} aria-hidden="true" /><span>{aluno.email}</span></p></div></div></td>
              <td data-label="Fichas ativas"><span className="personal-student-count">{aluno.treinos_ativos}</span></td>
              <td data-label="Status"><span className="personal-status" data-active={aluno.status === 'ATIVO'}>{aluno.status === 'ATIVO' ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{aluno.status === 'ATIVO' ? 'Ativo' : aluno.status}</span></td>
              <td data-label="Ações" className={styles.actionCell}><Button variant="outline" size="sm" className={styles.view} disabled={!aluno.aluno_id} onClick={() => setSelectedStudentId(aluno.aluno_id)} aria-label={`Ver acompanhamento de ${aluno.nome}`}><Eye size={14} strokeWidth={1.75} aria-hidden="true" />Ver</Button></td>
            </tr>)}
          </tbody></table>
        </section>}
      </div>
      {selectedStudent && <StudentFollowUpPanel key={selectedStudent.vinculo_id} student={selectedStudent} onClose={() => setSelectedStudentId('')} />}
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

