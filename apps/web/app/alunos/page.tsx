'use client'

import { useRef, useState } from 'react'
import { UserPlus, Users, Loader2, CheckCircle2, Clock3, Eye, FileText, UserRound, ChevronLeft, ChevronRight } from 'lucide-react'
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

function studentInitials(nome: string) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean)
  return partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : (partes[0]?.slice(0, 2).toUpperCase() || '?')
}

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
  const [page, setPage] = useState(1)
  const totalStudents = alunos?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalStudents / 5))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * 5
  const visibleStudents = alunos?.slice(start, start + 5)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const selectedStudent = alunos?.find(student => student.aluno_id === selectedStudentId)
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const conviteEmAndamento = useRef(false)
  const emailValido = email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const queryClient = useQueryClient()

  const metrics = [
    { label: 'Alunos vinculados', value: alunos?.length, icon: Users },
    { label: 'Fichas ativas', value: alunos?.reduce((total, aluno) => total + aluno.treinos_ativos, 0), icon: FileText },
    { label: 'Alunos com ficha ativa', value: alunos?.filter(aluno => aluno.treinos_ativos > 0).length, icon: UserRound },
  ]

  async function convidar() {
    if (conviteEmAndamento.current) return
    setErro(null)
    if (!emailValido) { setErro('Informe um e-mail válido.'); return }
    conviteEmAndamento.current = true
    setOcupado(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sessão expirada. Entre novamente.')
      const { data, error } = await supabase.functions.invoke('convite-aluno', { body: { email: email.trim().toLowerCase() } })
      if (error) {
        const response = error.context instanceof Response ? error.context : null
        const failure = response ? await response.clone().json().catch(() => null) as { error?: unknown } | null : null
        if (typeof failure?.error === 'string') throw new Error(failure.error)
        if (response?.status === 401) throw new Error('Sessão expirada. Entre novamente.')
        throw new Error('Não foi possível acessar o serviço de convites. Tente novamente.')
      }
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
    } finally { conviteEmAndamento.current = false; setOcupado(false) }
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
          <div className={styles.tableFrame}><table className={`personal-table ${styles.table}`}><caption className="sr-only">Alunos vinculados, fichas ativas e acesso ao acompanhamento</caption><thead><tr><th scope="col">Aluno</th><th scope="col">Fichas ativas</th><th scope="col">Status</th><th scope="col" className={styles.actionCell}>Ações</th></tr></thead><tbody>
            {visibleStudents?.map(aluno => <tr key={aluno.vinculo_id}>
              <td data-label="Aluno"><div className="personal-student-identity"><span className={`personal-avatar ${styles.avatar}`} aria-hidden="true">{studentInitials(aluno.nome)}</span><div className={styles.studentIdentity}><div className={styles.nameProfile}><strong>{aluno.nome}</strong></div><span className={styles.studentEmail}>{aluno.email}</span></div></div></td>
              <td data-label="Fichas ativas"><span className="personal-student-count">{aluno.treinos_ativos}</span></td>
              <td data-label="Status"><span className={`personal-status ${styles.status}`} data-active={aluno.status === 'ATIVO'}>{aluno.status === 'ATIVO' ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{aluno.status === 'ATIVO' ? 'Ativo' : aluno.status}</span></td>
              <td data-label="Ações" className={styles.actionCell}><Button variant="outline" size="sm" className={styles.view} disabled={!aluno.aluno_id} onClick={() => setSelectedStudentId(aluno.aluno_id)} aria-label={`Ver acompanhamento de ${aluno.nome}`}><Eye size={14} strokeWidth={1.75} aria-hidden="true" />Ver</Button></td>
            </tr>)}
          </tbody></table></div>
          <footer className={styles.pagination}><span>{start + 1}–{Math.min(start + 5, totalStudents)} de {totalStudents} {totalStudents === 1 ? 'aluno' : 'alunos'}</span><nav aria-label="Paginação de alunos">
            <Button variant="outline" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} aria-hidden="true" /></Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(number => <Button key={number} variant="outline" aria-label={`Página ${number}`} aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</Button>)}
            <Button variant="outline" aria-label="Próxima página" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} aria-hidden="true" /></Button>
          </nav></footer>
        </section>}
      </div>
      {selectedStudent && <StudentFollowUpPanel key={selectedStudent.vinculo_id} student={selectedStudent} onClose={() => setSelectedStudentId('')} />}
      <Modal personal className={styles.inviteModal} open={modalAberto} onClose={() => { if (!conviteEmAndamento.current) setModalAberto(false) }} titulo="Convidar Aluno">
        <div className={styles.inviteForm}>
          <div className={styles.inviteField}>
            <Label htmlFor="convite-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail do aluno</Label>
            <Input id="convite-email" type="email" placeholder="aluno@exemplo.com" value={email} disabled={ocupado} onChange={(e) => { setEmail(e.target.value); setErro(null) }} className="h-10" />
            <p className={styles.inviteNote}>
              Se o aluno ainda não tem conta, ele recebera um e-mail de convite.
            </p>
          </div>
          {erro ? (
            <div className={styles.inviteError} role="alert">
              <p>{erro}</p>
            </div>
          ) : null}
          <div className={styles.inviteActions}>
            <Button variant="outline" disabled={ocupado} onClick={() => setModalAberto(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={convidar} disabled={ocupado || !emailValido} className="rounded-xl shadow-sm">
              {ocupado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {ocupado ? 'Enviando...' : 'Convidar e vincular'}
            </Button>
          </div>
        </div>
      </Modal>
    </PersonalWorkspace>
  )
}

