'use client'

import { useId, useRef, useState } from 'react'
import { weeklyFrequency, type FrequencyDay } from '@/lib/fitness/weekly-frequency'
import { formatCalendarDate } from '@/lib/fitness/deadlines'
import styles from './personal-report.module.css'

const shortDate = (date: string) => formatCalendarDate(date).slice(0, 5)

export function WeeklyTrainingFrequency({ points }: { points: FrequencyDay[] }) {
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const groups = useRef<(SVGGElement | null)[]>([])
  const weeks = weeklyFrequency(points)
  const current = weeks.reduce((sum, week) => sum + week.current, 0)
  const previous = weeks.reduce((sum, week) => sum + week.previous, 0)
  const peak = Math.max(1, ...weeks.flatMap(week => [week.current, week.previous]))
  const step = Math.max(1, Math.ceil(peak / 4))
  const ceiling = Math.ceil(peak / step) * step
  const ticks = Array.from({ length: ceiling / step + 1 }, (_, index) => index * step)
  const width = Math.max(360, weeks.length * 84 + 48)
  const slot = (width - 48) / Math.max(1, weeks.length)
  const barWidth = Math.min(24, slot * .25)
  const selected = active == null ? undefined : weeks[active]
  return <section className={`${styles.panel} ${styles.frequencyPanel}`} aria-labelledby={id + '-heading'}>
    <header className={styles.frequencyHeading}>
      <div><h2 id={id + '-heading'}>Frequência de treinos</h2><p className={styles.note}>Compare suas sessões concluídas por semana.</p></div>
      <div className={styles.frequencyTotal}><strong>{current}</strong><span>sessões concluídas</span><small>Anterior: {previous}</small></div>
    </header>
    <div className={styles.legend} aria-label="Legenda do gráfico"><span><i />Atual</span><span><i />Anterior</span></div>
    <div className={styles.frequencyScroll} tabIndex={0} role="region" aria-label="Gráfico semanal; role horizontalmente para ver todas as semanas">
      <div className={styles.frequencyPlot} style={{ minWidth: Math.max(280, weeks.length * 62 + 48) }}>
        <svg className={styles.weeklyChart} viewBox={`0 0 ${width} 216`} role="group" aria-labelledby={id + '-title ' + id + '-description'} onPointerLeave={() => setActive(null)}>
          <title id={id + '-title'}>Frequência semanal de treinos</title>
          <desc id={id + '-description'}>{current} sessões no período atual e {previous} no anterior. Blocos de sete dias a partir do início de cada período. Use Tab ou as setas para consultar cada semana.</desc>
          {ticks.map(tick => {
            const y = 174 - tick / ceiling * 132
            return <g key={tick} aria-hidden="true"><line x1="34" x2={width - 8} y1={y} y2={y} className={styles.gridLine} /><text x="25" y={y + 4} textAnchor="end">{tick}</text></g>
          })}
          {weeks.map((week, index) => {
            const center = 34 + slot * (index + .5)
            return <g key={week.start} ref={element => { groups.current[index] = element }} role="button" tabIndex={0}
              aria-label={`${week.label}${week.days < 7 ? `, parcial de ${week.days} dias` : ''}: ${shortDate(week.start)} a ${shortDate(week.end)}, ${week.current} sessões atuais; ${shortDate(week.previousStart)} a ${shortDate(week.previousEnd)}, ${week.previous} anteriores`}
              aria-describedby={selected && active === index ? id + '-tooltip' : undefined}
              className={styles.weekGroup} data-active={active === index}
              onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(index)}
              onKeyDown={event => {
                if (event.key === 'Escape') setActive(null)
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(index) }
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault()
                  groups.current[Math.max(0, Math.min(weeks.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))]?.focus()
                }
              }}>
              <rect className={styles.weekTarget} x={center - slot / 2 + 3} y="18" width={slot - 6} height="194" rx="8" />
              {(['current', 'previous'] as const).map((key, series) => {
                const height = week[key] / ceiling * 132
                const x = center + (series ? 4 : -barWidth - 4)
                return <g key={key} aria-hidden="true">
                  {height > 0 && <rect className={series ? styles.previousBar : styles.currentBar} x={x} y={174 - height} width={barWidth} height={height} rx={Math.min(5, height / 2)} />}
                  <text className={series ? styles.previousValue : styles.currentValue} x={x + barWidth / 2} y={height ? 166 - height : 166} textAnchor="middle">{week[key]}</text>
                </g>
              })}
              <text x={center} y="194" textAnchor="middle" aria-hidden="true">{week.label}</text>
              {week.days < 7 && <text x={center} y="209" textAnchor="middle" className={styles.partialWeek} aria-hidden="true">{week.days} dias</text>}
            </g>
          })}
        </svg>
        {selected && <div id={id + '-tooltip'} role="tooltip" className={styles.frequencyTooltip} style={{ left: `clamp(96px, ${((34 + slot * (active! + .5)) / width) * 100}%, calc(100% - 96px))` }}>
          <strong>{selected.label}{selected.days < 7 ? ' · Parcial' : ''}</strong>
          <span>Atual · {shortDate(selected.start)}–{shortDate(selected.end)}: <b>{selected.current}</b></span>
          <span>Anterior · {shortDate(selected.previousStart)}–{shortDate(selected.previousEnd)}: <b>{selected.previous}</b></span>
        </div>}
      </div>
    </div>
    {points.length > 0 && <p className={styles.range}>Atual: {formatCalendarDate(points[0].date)} a {formatCalendarDate(points[points.length - 1].date)}<br />Anterior: {formatCalendarDate(points[0].previousDate)} a {formatCalendarDate(points[points.length - 1].previousDate)}</p>}
    <p className={styles.frequencyHelp}>Blocos de 7 dias desde o início do período. A última semana pode ser parcial.</p>
    <details className={styles.chartData}><summary>Dados do gráfico</summary><div className={styles.dailyData}>
      {weeks.map(week => <p key={week.start}>{week.label} ({shortDate(week.start)}–{shortDate(week.end)}{week.days < 7 ? `, ${week.days} dias` : ''}): {week.current} atual · {week.previous} anterior ({shortDate(week.previousStart)}–{shortDate(week.previousEnd)})</p>)}
    </div></details>
  </section>
}
