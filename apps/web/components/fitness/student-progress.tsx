'use client'
import { useState } from 'react'
import { ProgressPanel } from './progress-panel'
import type { PeriodDays } from '@/lib/fitness/period-comparison'
import type { Session } from '@/services/fitness'
import styles from './student-experience.module.css'
export function StudentProgress({ sessions }: { sessions: Session[] }) {
  const [period, setPeriod] = useState<PeriodDays>(30)
  return <div className={styles.stack}><div className={styles.toolbar}><h2 className="font-semibold">Seu acompanhamento</h2><div className={styles.choices} role="group" aria-label="Período da evolução">{([7,30,90] as const).map(days => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} dias</button>)}</div></div><ProgressPanel sessions={sessions} compact periodDays={period} /></div>
}
