'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Clock3, ClipboardList, Eye, FileText, Target } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { completion, type Session } from '@/services/fitness'
import { fetchPersonalReport } from '@/services/personal-report'
import { personalReportSummary } from '@/lib/fitness/personal-report'
import { formatCalendarDate } from '@/lib/fitness/deadlines'
import type { PeriodDays } from '@/lib/fitness/period-comparison'
import { WeeklyTrainingFrequency } from './weekly-training-frequency'
import styles from './personal-report.module.css'

const PAGE_SIZE = 4
const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const dateTime = (date: string) => new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function SessionStatus({ session }: { session: Session }) {
  const done = session.status === 'CONCLUIDO'
  return <span className={styles.status} data-complete={done}>{done ? <CircleCheck size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{done ? 'Finalizado' : 'Em andamento'}</span>
}
export function PersonalReportOverview({ alunoId, studentName, days, onAssessments }: {
  alunoId: string; studentName: string; days: PeriodDays; onAssessments: () => void
}) {
  const query = useQuery({ queryKey: ['personal-report-overview', alunoId, days], queryFn: ({ signal }) => fetchPersonalReport(alunoId, days, signal) })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Session | null>(null)
  if (query.isPending) return <div className={styles.state} role="status">Carregando sessões e avaliações…</div>
  if (query.isError) return <div className={styles.state} role="alert"><p>{query.error.message}</p><button type="button" onClick={() => void query.refetch()}>Tentar novamente</button></div>
  const report = personalReportSummary(query.data.sessions, query.data.assessments, query.data.window)
  const { comparison, current, latest, points } = report
  const pages = Math.max(1, Math.ceil(current.length / PAGE_SIZE)), currentPage = Math.min(page, pages), start = (currentPage - 1) * PAGE_SIZE
  const pageNumbers = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, pages].filter(value => value >= 1 && value <= pages))).sort((a, b) => a - b)
  const window = query.data.window
  return <div className={styles.overview}>
    <dl className={styles.metrics} aria-label="Indicadores do período">
      {[
        { icon: ClipboardList, label: 'Sessões concluídas', value: number(comparison.current.sessions), note: `Anterior: ${number(comparison.previous.sessions)}` },
        { icon: Target, label: 'Conclusão das sessões', value: report.completionRate == null ? '—' : report.completionRate + '%', note: current.length ? `${comparison.current.sessions} de ${current.length} sessões iniciadas` : 'Nenhuma sessão iniciada' },
        { icon: FileText, label: 'Avaliações no período', value: number(report.assessments.length), note: `${formatCalendarDate(window.startDate)} a ${formatCalendarDate(window.endDate)}` },
      ].map(metric => <div key={metric.label}><metric.icon size={25} strokeWidth={1.6} aria-hidden="true" /><div><dt>{metric.label}</dt><dd>{metric.value}</dd><span>{metric.note}</span></div></div>)}
    </dl>
    <div className={styles.charts}>
      <WeeklyTrainingFrequency points={points} />
      <section className={styles.panel} aria-label="Última avaliação">
        <header className={styles.panelHeading}><h2>Última avaliação</h2><button type="button" className={styles.textAction} onClick={onAssessments} aria-label="Ver avaliações do aluno"><CalendarDays size={15} aria-hidden="true" />Ver avaliações</button></header>
        {latest ? <><p className={styles.note}>{formatCalendarDate(latest.data)}{latest.data < window.startDate ? ' · Antes do período selecionado' : ''}</p><dl className={styles.measures}>
          {([['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['quadril', 'Quadril', 'cm'], ['braco', 'Braço', 'cm']] as const).map(([key, label, unit]) => <div key={key}><dt>{label}</dt><dd>{latest[key] == null ? 'Sem registro' : number(latest[key]) + ' ' + unit}</dd></div>)}
        </dl></> : <p className={styles.empty}>Este aluno ainda não possui avaliação registrada.</p>}
      </section>
    </div>
    <section className={styles.sessionPanel} aria-label="Sessões do período">
      <header className={styles.tableHeading}><h2>Sessões do período</h2><p>{current.length} {current.length === 1 ? 'sessão iniciada' : 'sessões iniciadas'}</p></header>
      {current.length ? <><div className={styles.tableFrame}><table className={styles.table}>
        <caption className={styles.srOnly}>Sessões de {studentName} no período selecionado</caption>
        <thead><tr><th scope="col">Treino</th><th scope="col">Data</th><th scope="col">Status</th><th scope="col">Conclusão</th><th scope="col">Ações</th></tr></thead>
        <tbody>{current.slice(start, start + PAGE_SIZE).map(session => <tr key={session.id}>
          <td><strong>{session.titulo}</strong></td>
          <td><span className={styles.mobileLabel} aria-hidden="true">Data</span><time dateTime={session.inicio}>{new Date(session.inicio).toLocaleDateString('pt-BR')}</time></td>
          <td><span className={styles.mobileLabel} aria-hidden="true">Status</span><SessionStatus session={session} /></td>
          <td><span className={styles.mobileLabel} aria-hidden="true">Conclusão</span><div className={styles.progress}><span>{completion(session)}%</span><span className={styles.track} data-complete={session.status === 'CONCLUIDO'} aria-hidden="true"><i style={{ width: completion(session) + '%' }} /></span></div></td>
          <td><button type="button" className={styles.view} aria-label={`Ver sessão ${session.titulo}, ${dateTime(session.inicio)}`} onClick={() => setSelected(session)}><Eye size={14} aria-hidden="true" />Ver</button></td>
        </tr>)}</tbody>
      </table></div><footer className={styles.footer}><p aria-live="polite">{start + 1}–{Math.min(start + PAGE_SIZE, current.length)} de {current.length} sessões</p><nav aria-label="Paginação de sessões do período">
        <button type="button" disabled={currentPage === 1} aria-label="Página anterior de sessões" onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} aria-hidden="true" /></button>
        {pageNumbers.map((number, index) => <span key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className={styles.ellipsis} aria-hidden="true">…</span>}<button type="button" aria-label={`Página ${number} de sessões`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button></span>)}
        <button type="button" disabled={currentPage === pages} aria-label="Próxima página de sessões" onClick={() => setPage(currentPage + 1)}><ChevronRight size={15} aria-hidden="true" /></button>
      </nav></footer></> : <p className={styles.empty}>Nenhuma sessão iniciada neste período. Tente outro período para consultar o histórico.</p>}
    </section>
    <Modal personal open={!!selected} onClose={() => setSelected(null)} titulo="Registro da sessão" className="max-w-2xl">
      {selected && <div className={styles.sessionDetails}>
        <div className={styles.sessionIdentity}><span className={styles.avatar} aria-hidden="true">{studentName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span><div><h3>{studentName}</h3><p>{selected.titulo}</p></div><SessionStatus session={selected} /></div>
        <dl className={styles.sessionFacts}><div><dt>Início</dt><dd>{dateTime(selected.inicio)}</dd></div><div><dt>Fim</dt><dd>{selected.fim ? dateTime(selected.fim) : 'Ainda não finalizada'}</dd></div><div><dt>Conclusão da prescrição</dt><dd>{completion(selected)}%</dd></div></dl>
        <section><h3>Exercícios e séries registradas</h3>
          {selected.prescricao.map(exercise => {
            const sets = selected.series.filter(set => set.item_id === exercise.id)
            return <div className={styles.exercise} key={exercise.id}><strong>{exercise.nome}</strong><p>Prescrição: {exercise.series} séries · {exercise.repeticoes} repetições</p>
              {sets.length ? <ul>{sets.map((set, index) => <li key={set.id}>Série {index + 1}{set.aquecimento ? ' · Aquecimento' : ''} · {set.carga == null ? 'Carga não registrada' : number(set.carga) + ' kg'} · {set.reps == null ? 'Repetições não registradas' : set.reps + ' repetições'}{set.segundos != null ? ' · ' + set.segundos + ' s' : ''}</li>)}</ul> : <p>Nenhuma série registrada.</p>}
            </div>
          })}
          {!selected.prescricao.length && <p className={styles.note}>Nenhum exercício na prescrição desta sessão.</p>}
        </section>
        {selected.observacoes && <section><h3>Observações</h3><p className={styles.observation}>{selected.observacoes}</p></section>}
      </div>}
    </Modal>
  </div>
}
