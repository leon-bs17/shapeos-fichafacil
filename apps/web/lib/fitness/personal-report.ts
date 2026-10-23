import type { Assessment, Session } from '@/services/fitness'
import { comparePeriods, type ComparisonWindows } from './period-comparison'
import { localCalendarDate } from './deadlines'

export function personalReportSummary(sessions: Session[], assessments: Assessment[], window: ComparisonWindows) {
  const comparison = comparePeriods(sessions, window)
  const current = sessions.filter(session => Number.isFinite(Date.parse(session.inicio)) &&
    Date.parse(session.inicio) >= Date.parse(window.start) && Date.parse(session.inicio) <= Date.parse(window.end))
    .sort((a, b) => b.inicio.localeCompare(a.inicio) || b.id.localeCompare(a.id))
  const inPeriod = assessments.filter(item => item.data >= window.startDate && item.data <= window.endDate)
  const latest = assessments.filter(item => item.data <= window.endDate).sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))[0]
  const points = Array.from({ length: window.days }, (_, index) => {
    const currentDate = new Date(window.start)
    currentDate.setDate(currentDate.getDate() + index)
    const previousDate = new Date(window.previousStart)
    previousDate.setDate(previousDate.getDate() + index)
    return { date: localCalendarDate(currentDate), previousDate: localCalendarDate(previousDate), current: 0, previous: 0 }
  })
  const currentPoints = new Map(points.map(point => [point.date, point]))
  const previousPoints = new Map(points.map(point => [point.previousDate, point]))
  for (const session of sessions) {
    const time = Date.parse(session.inicio)
    if (session.status !== 'CONCLUIDO' || !Number.isFinite(time) || time < Date.parse(window.previousStart) || time > Date.parse(window.end)) continue
    const date = localCalendarDate(new Date(session.inicio))
    const now = currentPoints.get(date), before = previousPoints.get(date)
    if (now) now.current++
    if (before) before.previous++
  }
  return { comparison, current, assessments: inPeriod, latest, points,
    completionRate: current.length ? Math.round(comparison.current.sessions / current.length * 100) : null }
}
