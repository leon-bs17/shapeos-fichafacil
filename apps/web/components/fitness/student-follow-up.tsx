'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Dumbbell, RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { AlunoVinculado } from '@/services/alunos'
import { fetchStudentFollowUp } from '@/services/student-follow-up'
import { assessmentDeadline, formatCalendarDate } from '@/lib/fitness/deadlines'
import { studentReportHref } from '@/lib/fitness/personal-attention'
import styles from './student-follow-up.module.css'

export function StudentFollowUpPanel({ student, onClose }: { student: AlunoVinculado; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['personal-student-follow-up', student.aluno_id],
    queryFn: ({ signal }) => fetchStudentFollowUp(student.aluno_id, signal),
    enabled: student.status === 'ATIVO',
    gcTime: 0,
    refetchOnMount: 'always',
  })
  const data = query.data
  const assessment = assessmentDeadline(data?.nextAssessment, data?.latestAssessment)
  const active = student.status === 'ATIVO'
  return <Modal personal open onClose={onClose} titulo="Acompanhamento do aluno" className="max-w-2xl">
    <div className={styles.panel}>
      <header className={styles.identity}><span className="personal-avatar" aria-hidden="true">{student.nome.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR') || '?'}</span><div><h3>{student.nome}</h3><p>{student.email}</p><span className="personal-status" data-active={active}>{active ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{active ? 'Ativo' : 'Inativo'}</span></div></header>
      {!active ? <p className={styles.note}>O acompanhamento está disponível para vínculos ativos.</p> : query.isPending ? <div className={styles.loading} role="status">Carregando acompanhamento…</div> : query.isError ? <div className={styles.error} role="alert"><p>{query.error.message}</p><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Tentar novamente</Button></div> : data ? <>
        <div className={styles.sectionHeading}><h3>Resumo do acompanhamento</h3><Button variant="outline" className={styles.refresh} disabled={query.isFetching} onClick={() => void query.refetch()} aria-label="Atualizar acompanhamento" data-shapeos-tooltip="Atualizar acompanhamento"><RefreshCw size={15} aria-hidden="true" /></Button></div>
        <dl className={styles.metrics} aria-busy={query.isFetching}>
          <div><dt><Dumbbell size={16} aria-hidden="true" />Último treino concluído</dt><dd>{data.lastSession ? <><strong>{new Date(data.lastSession.inicio).toLocaleDateString('pt-BR')}</strong><span>{data.lastSession.titulo}</span></> : <><strong className={styles.emptyValue}>Sem registro</strong><span>Este aluno ainda não concluiu uma sessão no app.</span></>}</dd></div>
          <div><dt><Clock3 size={16} aria-hidden="true" />Frequência recente</dt><dd><strong>{data.completed7Days} <small>{data.completed7Days === 1 ? 'sessão' : 'sessões'}</small></strong><span>Nos últimos 7 dias</span><span className={styles.secondaryCount}>{data.completed30Days} {data.completed30Days === 1 ? 'sessão nos últimos 30 dias' : 'sessões nos últimos 30 dias'}</span></dd></div>
          <div><dt><CalendarDays size={16} aria-hidden="true" />Próxima avaliação</dt><dd><strong className={styles.emptyValue}>{data.nextAssessment && !assessment?.completed ? formatCalendarDate(data.nextAssessment) : 'Não agendada'}</strong><span data-pending={assessment?.pending || undefined}>{assessment?.label ?? (data.latestAssessment ? `Última avaliação: ${formatCalendarDate(data.latestAssessment)}` : 'Nenhuma avaliação registrada.')}</span>{assessment?.completed && <span>Defina a próxima data para continuar o acompanhamento.</span>}</dd></div>
        </dl>
        <p className={styles.note}>A frequência considera sessões concluídas iniciadas no período, incluindo hoje. Os dados refletem os registros feitos no app.</p>
        <nav className={styles.actions} aria-label={`Ações de acompanhamento de ${student.nome}`}>
          <Link className="personal-command" href={studentReportHref(student.aluno_id)}>Ver evolução <ArrowUpRight size={14} aria-hidden="true" /></Link>
          <Link className="personal-command" href={`/treinos?${new URLSearchParams({ aluno: student.aluno_id })}`}>Ver fichas <ArrowUpRight size={14} aria-hidden="true" /></Link>
          <Link className="personal-command" href={studentReportHref(student.aluno_id, 'avaliacao')}>{data.nextAssessment && !assessment?.completed ? 'Gerenciar avaliação' : 'Agendar avaliação'} <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </nav>
        <p className={styles.updated}>Atualizado às <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></p>
      </> : null}
    </div>
  </Modal>
}
