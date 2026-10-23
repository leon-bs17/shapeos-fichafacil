import type { Assessment, Session } from '@/services/fitness'
import { localCalendarDate } from './deadlines'

export type PeriodDays = 7 | 30 | 90
export type ComparisonSession = Pick<Session, 'id' | 'inicio' | 'status' | 'prescricao' | 'series'>
export type ComparisonAssessment = Pick<Assessment, 'id' | 'data' | 'peso' | 'cintura' | 'quadril' | 'braco'>
export function comparisonWindows(days: PeriodDays, now = new Date()) {
  if (![7, 30, 90].includes(days)) throw new Error('Período inválido.')
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days + 1)
  const previous = new Date(start)
  previous.setDate(previous.getDate() - days)
  const previousEnd = new Date(start.getTime() - 1)
  return {
    days, start: start.toISOString(), previousStart: previous.toISOString(), end: now.toISOString(),
    startDate: localCalendarDate(start), endDate: localCalendarDate(now),
    previousStartDate: localCalendarDate(previous), previousEndDate: localCalendarDate(previousEnd),
  }
}
export type ComparisonWindows = ReturnType<typeof comparisonWindows>
export function summarizePeriod(sessions: ComparisonSession[]) {
  const days = new Set<string>()
  const loads = new Map<string, { id: string; name: string; load: number }>()
  let volume: number | null = null
  for (const session of sessions) {
    days.add(localCalendarDate(new Date(session.inicio)))
    for (const set of session.series ?? []) {
      if (set.aquecimento || set.carga == null || !Number.isFinite(set.carga) || set.carga < 0) continue
      const exercise = session.prescricao?.find(item => item.id === set.item_id)
      if (!exercise?.exercicio_id) continue
      // Only recorded working sets with actual repetitions contribute to load and volume.
      if (set.reps == null || !Number.isFinite(set.reps) || set.reps <= 0) continue
      volume = (volume ?? 0) + set.carga * set.reps
      const previous = loads.get(exercise.exercicio_id)
      if (!previous || set.carga > previous.load) loads.set(exercise.exercicio_id, {
        id: exercise.exercicio_id, name: exercise.nome, load: set.carga,
      })
    }
  }
  return { sessions: sessions.length, trainingDays: days.size, volume, loads }
}
export function comparePeriods(sessions: ComparisonSession[], window: ComparisonWindows) {
  const valid = sessions.filter(session => session.status === 'CONCLUIDO' &&
    Number.isFinite(Date.parse(session.inicio)) && Date.parse(session.inicio) >= Date.parse(window.previousStart) &&
    Date.parse(session.inicio) <= Date.parse(window.end))
  const current = summarizePeriod(valid.filter(session => Date.parse(session.inicio) >= Date.parse(window.start)))
  const previous = summarizePeriod(valid.filter(session => Date.parse(session.inicio) < Date.parse(window.start)))
  const ids = new Set([...current.loads.keys(), ...previous.loads.keys()])
  const exercises = Array.from(ids, id => ({
    id, name: current.loads.get(id)?.name ?? previous.loads.get(id)!.name,
    current: current.loads.get(id)?.load ?? null, previous: previous.loads.get(id)?.load ?? null,
  })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return { current, previous, exercises }
}
export function difference(current: number | null, previous: number | null) {
  return current == null || previous == null ? null : current - previous
}
