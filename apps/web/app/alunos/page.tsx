'use client'

import { Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { WorkoutSelect } from '@/components/fitness/workout-select'
import { filterLinkedStudents, studentStatusFilter, paginationPages } from '@/lib/fitness/list-filters'
import { UserPlus, Users, Loader2, CheckCircle2, Clock3, Eye, FileText, UserRound, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { useAlunos } from '@/hooks/use-alunos'
import { StudentFollowUpPanel } from '@/components/fitness/student-follow-up'
import { PersonalBannerWireframe } from '@/components/layout/personal-banner-wireframe'
import { ShapeosBanner } from '@/components/layout/shapeos-banner'
import styles from './page.module.css'

function studentInitials(nome: string) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean)
  return partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : (partes[0]?.slice(0, 2).toUpperCase() || '?')
}

export default function AlunosPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<p role="status">Carregando alunos…</p>}><AlunosConteudo /></Suspense>
    </DashboardShell>
  )
}

function AlunosConteudo() {
  const { data: alunos, isLoading, error, refetch } = useAlunos()
  const params = useSearchParams(), router = useRouter()
  const status = studentStatusFilter(params.get('status'))
  const filteredStudents = filterLinkedStudents(alunos ?? [], status)
  function changeStatus(value: string) {
    const query = new URLSearchParams(params.toString())
    if (value === 'TODOS') query.delete('status'); else query.set('status', studentStatusFilter(value))
    router.replace('/alunos' + (query.size ? '?' + query.toString() : ''), { scroll: false }); setPage(1)
  }
  const [modalAberto, setModalAberto] = useState(false)
  const [page, setPage] = useState(1)
  const totalStudents = filteredStudents.length
  const totalPages = Math.max(1, Math.ceil(totalStudents / 5))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * 5
  const visibleStudents = filteredStudents.slice(start, start + 5)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const selectedStudent = alunos?.find(student => student.aluno_id === selectedStudentId)
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [avisoConvite, setAvisoConvite] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const conviteEmAndamento = useRef(false)
  const emailValido = email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const queryClient = useQueryClient()
  const convites = useQuery<{ id: string; email: string; expira_em: string }[]>({
    queryKey: ['personal-student-invitations'],
    queryFn: async () => {
      const db = createClient()
      const { data: auth, error: authError } = await db.auth.getUser()
      if (authError || !auth.user) throw new Error('Sessão expirada.')
      const { data, error } = await db.from('convites_aluno').select('id,email,expira_em')
        .eq('personal_id', auth.user.id).eq('estado', 'PENDENTE').gt('expira_em', new Date().toISOString()).order('criado_em', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

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
      const convite = (data as { data?: { convite?: { id?: string; novo?: boolean } } })?.data?.convite
      if (!convite?.id) throw new Error((data as { error?: string })?.error ?? 'Não foi possível registrar o convite.')
      setAvisoConvite(convite.novo ? 'Convite enviado por e-mail. O vínculo será ativado somente quando o aluno aceitar.' : 'Convite pendente. O aluno pode aceitar ou recusar no painel da conta dele. Nenhum acesso foi liberado.')
      void queryClient.invalidateQueries({ queryKey: ['personal-student-invitations'] })
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
        art={<PersonalBannerWireframe variant="students"/>} />
      <dl className={styles.metrics} aria-label="Resumo dos alunos" aria-busy={isLoading}>{metrics.map(({label,value,icon:Icon}) => <div key={label}><span className={styles.metricIcon}><Icon aria-hidden="true" /></span><div><dt>{label}</dt><dd>{isLoading || error ? '—' : value ?? 0}</dd></div></div>)}</dl>
      {avisoConvite && <p role="status" className={styles.inviteNote}>{avisoConvite}</p>}
      {!!convites.data?.length && <section className={styles.pendingInvites} aria-labelledby="pending-invites-title"><h2 id="pending-invites-title">Convites pendentes <span>{convites.data.length}</span></h2><p>O acesso aos dados só será liberado após o aceite do aluno.</p><ul>{convites.data.map(invite => <li key={invite.id}><strong>{invite.email}</strong><span>Expira em {new Date(invite.expira_em).toLocaleString('pt-BR')}</span></li>)}</ul></section>}
      {convites.error && <div className="personal-load-error" role="alert"><p>Não foi possível consultar os convites pendentes.</p><Button variant="outline" onClick={() => void convites.refetch()}>Tentar novamente</Button></div>}
      {error ? <div className="personal-load-error" role="alert"><p>Não foi possível carregar seus alunos.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : isLoading ? <div role="status" aria-label="Carregando alunos" className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 skeleton" />)}</div> : !alunos?.length ? <Card><CardContent className="py-12 text-center"><Users size={28} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" /><h2>Nenhum aluno vinculado</h2><p className="text-muted-foreground text-xs mt-2 max-w-sm mx-auto">Convide um aluno por e-mail para começar a montar suas fichas.</p></CardContent></Card> :
        <section className={`personal-panel ${styles.panel}`} aria-labelledby="personal-students-title">
          <header className="personal-panel-heading"><h2 id="personal-students-title">Alunos vinculados</h2><p>{totalStudents} {totalStudents === 1 ? 'aluno' : 'alunos'}</p></header>
          <div className={styles.studentFilters}><label htmlFor="student-status">Status do vínculo</label><WorkoutSelect id="student-status" label="Status do vínculo" value={status} onChange={changeStatus} options={[{value:"TODOS",label:"Todos"},{value:"ATIVO",label:"Ativos"},{value:"INATIVO",label:"Inativos"}]} /></div>
          <div className={styles.tableFrame}><table className={`personal-table ${styles.table}`}><caption className="sr-only">Alunos vinculados, fichas ativas e acesso ao acompanhamento</caption><thead><tr><th scope="col">Aluno</th><th scope="col">Fichas ativas</th><th scope="col">Status</th><th scope="col" className={styles.actionCell}>Ações</th></tr></thead><tbody>
            {!visibleStudents.length && <tr><td colSpan={4}>Nenhum aluno neste status.</td></tr>}
            {visibleStudents.map(aluno => <tr key={aluno.vinculo_id}>
              <td data-label="Aluno"><div className="personal-student-identity"><span className={`personal-avatar ${styles.avatar}`} aria-hidden="true">{studentInitials(aluno.nome)}</span><div className={styles.studentIdentity}><div className={styles.nameProfile}><strong>{aluno.nome}</strong></div><span className={styles.studentEmail}>{aluno.email}</span></div></div></td>
              <td data-label="Fichas ativas"><span className="personal-student-count">{aluno.treinos_ativos}</span></td>
              <td data-label="Status"><span className={`personal-status ${styles.status}`} data-active={aluno.status === 'ATIVO'}>{aluno.status === 'ATIVO' ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{aluno.status === 'ATIVO' ? 'Ativo' : aluno.status}</span></td>
              <td data-label="Ações" className={styles.actionCell}><Button variant="outline" size="sm" className={styles.view} disabled={!aluno.aluno_id} onClick={() => setSelectedStudentId(aluno.aluno_id)} aria-label={`Ver acompanhamento de ${aluno.nome}`}><Eye size={14} strokeWidth={1.75} aria-hidden="true" />Ver</Button></td>
            </tr>)}
          </tbody></table></div>
          <footer className={styles.pagination}><span>{totalStudents ? start + 1 : 0}–{Math.min(start + 5, totalStudents)} de {totalStudents} {totalStudents === 1 ? 'aluno' : 'alunos'}</span><nav aria-label="Paginação de alunos">
            <Button variant="outline" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} aria-hidden="true" /></Button>
            {paginationPages(currentPage,totalPages).map(number => typeof number === 'number' ? <Button key={number} variant="outline" aria-label={`Página ${number}`} aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</Button> : <span key={number} aria-hidden="true">…</span>)}
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
              Se ainda não tem conta, o aluno receberá um e-mail. Se já tem, verá o convite no painel. O vínculo depende do aceite e o convite expira em 24 horas.
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
              {ocupado ? 'Enviando...' : 'Enviar convite'}
            </Button>
          </div>
        </div>
      </Modal>
    </PersonalWorkspace>
  )
}

