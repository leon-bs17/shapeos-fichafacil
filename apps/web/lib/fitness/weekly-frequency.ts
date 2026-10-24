export interface FrequencyDay {
  date: string
  previousDate: string
  current: number
  previous: number
}

/** Equal seven-day blocks from each period's start; retain the final partial block. */
export function weeklyFrequency(points: FrequencyDay[]) {
  return Array.from({ length: Math.ceil(points.length / 7) }, (_, index) => {
    const days = points.slice(index * 7, index * 7 + 7)
    return {
      label: `Semana ${index + 1}`,
      start: days[0].date,
      end: days[days.length - 1].date,
      previousStart: days[0].previousDate,
      previousEnd: days[days.length - 1].previousDate,
      days: days.length,
      current: days.reduce((sum, day) => sum + day.current, 0),
      previous: days.reduce((sum, day) => sum + day.previous, 0),
    }
  })
}
