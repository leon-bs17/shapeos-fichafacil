'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CircleCheck, Clock3, Eye } from 'lucide-react'
import { completion, type Session } from '@/services/fitness'
import { studentReportHref } from '@/lib/fitness/personal-attention'
import styles from './recent-sessions.module.css'

const PAGE_SIZE = 4

export function RecentSessions({ sessions, students }: {
  sessions: Session[]
  students: { aluno_id: string; nome: string }[]
}) {
  const [page, setPage] = useState(1)
  const recent = sessions.slice(0, 12)
  const pages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  return <div className={styles.root}>
    <div className={styles.frame}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Últimas sessões de treino dos seus alunos</caption>
        <thead><tr><th scope="col">Aluno / treino</th><th scope="col">Data</th><th scope="col">Status</th><th scope="col">Conclusão</th><th scope="col">Ações</th></tr></thead>
        <tbody>{recent.slice(start, start + PAGE_SIZE).map(session => {
          const name = students.find(student => student.aluno_id === session.aluno_id)?.nome ?? 'Aluno'
          const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'
          const complete = session.status === 'CONCLUIDO'
          return <tr key={session.id}>
            <td><div className={styles.identity}><span className="personal-avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong><p>{session.titulo}</p></div></div></td>
            <td><span className={styles.mobileLabel} aria-hidden="true">Data</span><time dateTime={session.inicio}>{new Date(session.inicio).toLocaleDateString('pt-BR')}</time></td>
            <td><span className={styles.mobileLabel} aria-hidden="true">Status</span><span className={styles.status} data-complete={complete}>{complete ? <CircleCheck size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{complete ? 'Finalizado' : 'Em andamento'}</span></td>
            <td><span className={styles.mobileLabel} aria-hidden="true">Conclusão</span><span className={styles.progress}>{completion(session)}%</span></td>
            <td><Link className={styles.view} href={studentReportHref(session.aluno_id)} aria-label={`Ver acompanhamento de ${name}, treino ${session.titulo}, ${new Date(session.inicio).toLocaleDateString('pt-BR')}`}><Eye size={14} aria-hidden="true" />Ver</Link></td>
          </tr>
        })}</tbody>
      </table>
    </div>
    <footer className={styles.footer}>
      <p aria-live="polite">{recent.length ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, recent.length)} de {recent.length} sessões recentes</p>
      <nav aria-label="Paginação de sessões recentes">
        <button type="button" disabled={current === 1} aria-label="Página anterior de sessões" onClick={() => setPage(current - 1)}><ChevronLeft size={15} aria-hidden="true" /></button>
        {Array.from({ length: pages }, (_, index) => index + 1).map(number => <button key={number} type="button" aria-label={`Página ${number} de sessões`} aria-current={current === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}
        <button type="button" disabled={current === pages} aria-label="Próxima página de sessões" onClick={() => setPage(current + 1)}><ChevronRight size={15} aria-hidden="true" /></button>
      </nav>
    </footer>
  </div>
}
