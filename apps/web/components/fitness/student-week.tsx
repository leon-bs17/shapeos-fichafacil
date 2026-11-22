'use client'

import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { weekDates } from '@/lib/fitness/student-experience'
import { today, dayOf, type Agenda, type Session, type Workout } from '@/services/fitness'
import styles from './student-experience.module.css'

const toDate = (date: string) => new Date(`${date}T12:00:00`)

export function StudentWeek({ agenda, sessions, workouts, onStart }: {
  agenda: Agenda[]
  sessions: Session[]
  workouts: Workout[]
  onStart?: (workout: Workout) => void
}) {
  const [selected, setSelected] = useState(today)
  const currentDay = today()
  const week = weekDates(selected)
  const rows = agenda.filter(item => item.data === selected)

  function moveWeek(offset: number) {
    const date = toDate(selected)
    date.setDate(date.getDate() + offset)
    setSelected(dayOf(date.toISOString()))
  }

  return <section className="personal-panel" aria-labelledby="student-week-title">
    <header className={`personal-panel-heading ${styles.sectionHeading}`}>
      <div>
        <h2 id="student-week-title">Sua semana</h2>
        <p>{toDate(week[0]).toLocaleDateString('pt-BR')} a {toDate(week[6]).toLocaleDateString('pt-BR')}</p>
      </div>
      <div className={styles.choices}>
        <button type="button" className="personal-command" aria-label="Semana anterior" onClick={() => moveWeek(-7)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <button type="button" className="personal-command" onClick={() => setSelected(currentDay)}>Hoje</button>
        <button type="button" className="personal-command" aria-label="Próxima semana" onClick={() => moveWeek(7)}><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </header>
    <div className={styles.week} role="group" aria-label="Dias da semana">
      {week.map(date => {
        const parsed = toDate(date)
        const count = agenda.filter(item => item.data === date).length
        return <button key={date} type="button" aria-label={`${parsed.toLocaleDateString('pt-BR')}: ${count} treinos agendados`} aria-pressed={selected === date} aria-current={date === currentDay ? 'date' : undefined} onClick={() => setSelected(date)}>
          <span>{parsed.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
          <strong>{parsed.getDate()}</strong>
          <small>{count || '—'}</small>
        </button>
      })}
    </div>
    <div aria-live="polite">
      <p className={styles.state}>Treinos em {toDate(selected).toLocaleDateString('pt-BR')}</p>
      {!rows.length ? <div className="personal-empty"><CalendarDays size={24} aria-hidden="true" /><p>Nenhum treino agendado para este dia.</p></div> : (
        <ul className={styles.list}>
          {rows.map(item => {
            const workout = workouts.find(row => row.id === item.treino_id)
            const actual = sessions.filter(session => session.treino_id === item.treino_id && dayOf(session.inicio) === selected)
            const finished = actual.some(session => session.status === 'CONCLUIDO')
            return <li className={`${styles.listRow} ${styles.sectionHeading}`} key={item.id}>
              <h3>{workout?.titulo ?? 'Ficha indisponível'}</h3>
              <div className={styles.choices}>
                <span className="personal-status" data-active={finished}>{finished ? 'Realizado' : actual.length ? 'Em andamento' : 'Planejado'}</span>
                {workout && onStart && !finished && <Button onClick={() => onStart(workout)} disabled={!workout.itens.length}>Treinar</Button>}
              </div>
            </li>
          })}
        </ul>
      )}
    </div>
  </section>
}
