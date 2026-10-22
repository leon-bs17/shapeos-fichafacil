const DAY = 86_400_000
export const DEADLINE_WARNING_DAYS = 7

export function localCalendarDate(now = new Date()) {
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function calendarDaysUntil(value: string | null | undefined, now = new Date()): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  // Construct today's local calendar date in UTC, avoiding DST and midnight shifts.
  const today = new Date(0)
  today.setUTCFullYear(now.getFullYear(), now.getMonth(), now.getDate())
  today.setUTCHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / DAY)
}

export function formatCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

export function workoutDeadline(value: string | null | undefined, now = new Date()) {
  const days = calendarDaysUntil(value, now)
  if (days == null) return null
  return {
    days,
    warning: days <= DEADLINE_WARNING_DAYS,
    label: days < 0 ? `Ficha vencida em ${formatCalendarDate(value!)}` : days === 0 ? 'Ficha vence hoje' : days === 1 ? 'Ficha vence amanhã' : days <= DEADLINE_WARNING_DAYS ? `Ficha vence em ${days} dias` : `Válida até ${formatCalendarDate(value!)}`,
  }
}

export function assessmentDeadline(scheduled: string | null | undefined, latest: string | null | undefined, now = new Date()) {
  const days = calendarDaysUntil(scheduled, now)
  if (days == null) return null
  const completed = calendarDaysUntil(latest, now) != null && latest! >= scheduled! && calendarDaysUntil(latest, now)! <= 0
  return {
    days, completed, pending: !completed && days <= 0,
    label: completed ? 'Avaliação registrada para esta data' : days < 0 ? `Avaliação pendente desde ${formatCalendarDate(scheduled!)}` : days === 0 ? 'Avaliação prevista para hoje' : `Próxima avaliação: ${formatCalendarDate(scheduled!)}`,
  }
}
