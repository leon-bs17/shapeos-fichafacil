'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { weekDates } from '@/lib/fitness/student-experience'
import { today, dayOf, type Agenda, type Session, type Workout } from '@/services/fitness'
import styles from './student-experience.module.css'
export function StudentWeek({ agenda, sessions, workouts, onStart }: { agenda: Agenda[]; sessions: Session[]; workouts: Workout[]; onStart?: (workout: Workout) => void }) {
  const [selected, setSelected] = useState(today)
  const week = weekDates(selected)
  const rows = agenda.filter(item => item.data === selected)
  function moveWeek(offset: number) { const date = new Date(`${selected}T12:00:00`); date.setDate(date.getDate() + offset); setSelected(dayOf(date.toISOString())) }
  return <section className={styles.panel} aria-label="Agenda semanal">
    <div className={styles.toolbar}><h2>Sua semana</h2><div className={styles.choices}><button type="button" aria-label="Semana anterior" onClick={() => moveWeek(-7)}>Anterior</button><button type="button" onClick={() => setSelected(today())}>Hoje</button><button type="button" aria-label="Próxima semana" onClick={() => moveWeek(7)}>Próxima</button></div></div>
    <p>{new Date(`${week[0]}T12:00:00`).toLocaleDateString('pt-BR')} a {new Date(`${week[6]}T12:00:00`).toLocaleDateString('pt-BR')}</p>
    <div className={styles.week} role="group" aria-label="Dias da semana">{week.map(date => { const parsed = new Date(`${date}T12:00:00`); const count = agenda.filter(item => item.data === date).length; return <button key={date} type="button" aria-label={`${parsed.toLocaleDateString('pt-BR')}: ${count} treinos agendados`} aria-pressed={selected === date} aria-current={date === today() ? 'date' : undefined} onClick={() => setSelected(date)}><span>{parsed.toLocaleDateString('pt-BR', { weekday: 'short' })}</span><strong>{parsed.getDate()}</strong><small>{count ? `${count} treino${count > 1 ? 's' : ''}` : '—'}</small></button> })}</div>
    <div className={styles.stack} aria-live="polite"><p>Treinos em {new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR')}</p>{!rows.length && <p>Nenhum treino agendado para este dia.</p>}{rows.map(item => {
      const workout = workouts.find(row => row.id === item.treino_id)
      const actual = sessions.filter(session => session.treino_id === item.treino_id && dayOf(session.inicio) === selected)
      const finished = actual.some(session => session.status === 'CONCLUIDO')
      return <div key={item.id} className={styles.row}><div><h3>{workout?.titulo ?? 'Ficha indisponível'}</h3><p>{finished ? 'Realizado' : actual.length ? 'Em andamento' : 'Planejado'}</p></div>{workout && onStart && !finished && <Button onClick={() => onStart(workout)} disabled={!workout.itens.length}>Treinar</Button>}</div>
    })}</div>
  </section>
}
