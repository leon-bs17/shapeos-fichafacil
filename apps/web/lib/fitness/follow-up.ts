/** Inclusive local calendar windows, ending at the instant the summary is read. */
export function followUpWindows(now = new Date()) {
  const start = (days: number) => {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - days + 1)
    return date.toISOString()
  }
  return { weekStart: start(7), monthStart: start(30), end: now.toISOString() }
}

export interface FollowUpSession {
  id: string
  titulo: string
  inicio: string
  fim: string | null
}

export interface StudentFollowUp {
  lastSession: FollowUpSession | null
  completed7Days: number
  completed30Days: number
  latestAssessment: string | null
  nextAssessment: string | null
  asOf: string
}
