import type { Agenda, Assessment, Session, Workout } from '@/services/fitness'

/** Estimate only: three seconds per repetition plus prescribed rests; never a promise. */
export function estimatedWorkoutMinutes(workout: Workout): number | null {
  if (!workout.itens.length) return null
  let seconds = 0
  for (const exercise of workout.itens) {
    const reps = Number(exercise.repeticoes.match(/\d+/g)?.at(-1))
    const effort = exercise.config.duracao_segundos ?? (reps > 0 ? reps * 3 : null)
    if (effort == null || !Number.isFinite(effort) || effort <= 0) return null
    const sets = exercise.series + exercise.config.aquecimento
    seconds += sets * effort + Math.max(0, sets - 1) * exercise.descanso_segundos
  }
  return Math.max(1, Math.ceil(seconds / 60))
}

export function todayWorkouts(workouts: Workout[], agenda: Agenda[], sessions: Session[], date: string) {
  return workouts.filter(workout => agenda.some(item => item.data === date && item.treino_id === workout.id))
    .map(workout => ({ workout, completed: sessions.some(session => session.treino_id === workout.id && session.status === 'CONCLUIDO' && localDate(session.inicio) === date) }))
}
export function localDate(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function weekDates(anchor: string) {
  const date = new Date(`${anchor}T12:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date); day.setDate(date.getDate() + index)
    return localDate(day.toISOString())
  })
}
export function measureDelta(before: Assessment, after: Assessment, field: 'peso' | 'cintura' | 'quadril' | 'braco') {
  const first = before[field], last = after[field]
  return first == null || last == null ? null : Math.round((last - first) * 100) / 100
}
