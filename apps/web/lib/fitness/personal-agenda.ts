import { localCalendarDate } from './deadlines'

export function weekWindow(anchor: string) {
  const date = new Date(`${anchor}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || !Number.isFinite(date.getTime()) || localCalendarDate(date) !== anchor) throw new Error('Data inválida.')
  date.setDate(date.getDate() - (date.getDay() + 6) % 7)
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date)
    day.setDate(day.getDate() + index)
    return localCalendarDate(day)
  })
  const start = new Date(`${days[0]}T00:00:00`), end = new Date(`${days[6]}T00:00:00`)
  end.setDate(end.getDate() + 1)
  return { start: days[0], end: days[6], days, startIso: start.toISOString(), endExclusiveIso: end.toISOString() }
}
export function moveWeek(anchor: string, direction: number) {
  const date = new Date(`${weekWindow(anchor).start}T12:00:00`)
  date.setDate(date.getDate() + direction * 7)
  return localCalendarDate(date)
}
export interface AgendaStudent { id: string; name: string; nextAssessment: string | null; latestAssessment: string | null }
export interface PlannedWorkout { id: string; aluno_id: string; treino_id: string; data: string; ficha: { titulo: string; ativo: boolean } }
export interface AgendaSession { aluno_id: string; treino_id: string; inicio: string; status: string }
export interface PersonalAgendaEvent {
  id: string; studentId: string; studentName: string; date: string; kind: 'treino' | 'avaliacao'; title: string; state: string; complete: boolean; href: string
}
export function agendaEvents(students: AgendaStudent[], planned: PlannedWorkout[], sessions: AgendaSession[], anchor: string, now = new Date()): PersonalAgendaEvent[] {
  const week = weekWindow(anchor), today = localCalendarDate(now), events: PersonalAgendaEvent[] = []
  const members = new Map(students.map(student => [student.id, student]))
  const actual = new Map<string, { done: boolean; started: boolean }>()
  for (const session of sessions) {
    const timestamp = Date.parse(session.inicio)
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) continue
    const key = `${session.aluno_id}:${session.treino_id}:${localCalendarDate(new Date(session.inicio))}`
    const previous = actual.get(key)
    actual.set(key, { done: previous?.done === true || session.status === 'CONCLUIDO', started: previous?.started === true || session.status === 'EM_ANDAMENTO' })
  }
  for (const row of planned) {
    const student = members.get(row.aluno_id)
    if (!student || row.data < week.start || row.data > week.end || !row.ficha) continue
    const status = actual.get(`${row.aluno_id}:${row.treino_id}:${row.data}`)
    const complete = status?.done === true
    events.push({ id: `treino:${row.id}`, studentId: student.id, studentName: student.name, date: row.data, kind: 'treino',
      title: row.ficha.titulo + (row.ficha.ativo ? '' : ' · Ficha pausada'), complete,
      state: complete ? 'Realizado' : status?.started ? 'Em andamento' : row.data < today ? 'Sem sessão registrada' : row.data === today ? 'Hoje' : 'Planejado',
      href: `/relatorios?${new URLSearchParams({ aluno: student.id, aba: 'agenda' })}`,
    })
  }
  for (const student of students) {
    const date = student.nextAssessment
    if (!date || date < week.start || date > week.end) continue
    const complete = !!student.latestAssessment && student.latestAssessment >= date && student.latestAssessment <= today
    events.push({ id: `avaliacao:${student.id}`, studentId: student.id, studentName: student.name, date, kind: 'avaliacao', title: 'Avaliação física', complete,
      state: complete ? 'Registrada' : date < today ? 'Pendente' : date === today ? 'Prevista para hoje' : 'Agendada',
      href: `/relatorios?${new URLSearchParams({ aluno: student.id, aba: 'avaliacao' })}`,
    })
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.studentName.localeCompare(b.studentName, 'pt-BR') || a.id.localeCompare(b.id))
}
