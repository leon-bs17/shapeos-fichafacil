'use client'
import { Button } from '@/components/ui/button'
import { estimatedWorkoutMinutes, todayWorkouts } from '@/lib/fitness/student-experience'
import { today, type Agenda, type Session, type Workout } from '@/services/fitness'
import styles from './student-experience.module.css'
export function StudentToday({ workouts, agenda, sessions, onStart, onAgenda }: { workouts: Workout[]; agenda: Agenda[]; sessions: Session[]; onStart: (workout: Workout) => void; onAgenda: () => void }) {
  const rows = todayWorkouts(workouts, agenda, sessions, today())
  return <section className={`${styles.panel} ${styles.today}`} aria-labelledby="student-today-title">
    <h2 id="student-today-title">Seu treino de hoje</h2>
    {!rows.length ? <div className={styles.row}><p>Nenhuma ficha ativa agendada para hoje. Você pode escolher uma abaixo ou organizar a agenda.</p><Button variant="outline" onClick={onAgenda}>Organizar agenda</Button></div> : rows.map(({ workout, completed }) => {
      const minutes = estimatedWorkoutMinutes(workout)
      const ongoing = sessions.some(session => session.treino_id === workout.id && session.status === 'EM_ANDAMENTO')
      return <div className={styles.row} key={workout.id}><div><h3>{workout.titulo}</h3><p>{workout.itens.length} exercícios{minutes != null ? ` · estimativa de ${minutes} min` : ''}{completed ? ' · Concluído hoje' : ''}</p></div><Button disabled={!workout.itens.length} variant={completed ? 'outline' : 'default'} onClick={() => onStart(workout)}>{ongoing ? 'Continuar treino' : completed ? 'Treinar novamente' : 'Iniciar treino'}</Button></div>
    })}
    {rows.length > 0 && <p>A duração é estimada pelas séries, repetições e descansos. Seu ritmo pode variar.</p>}
  </section>
}
