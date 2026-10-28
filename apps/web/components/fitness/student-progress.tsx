'use client'
import { useState } from 'react'
import { ProgressPanel } from './progress-panel'
import type { PeriodDays } from '@/lib/fitness/period-comparison'
import type { Session } from '@/services/fitness'
import styles from './student-experience.module.css'
import evolutionStyles from './student-progress.module.css'
export function StudentProgress({ sessions }: { sessions: Session[] }) {
  const [period, setPeriod] = useState<PeriodDays>(30)
  return <div className={`${styles.stack} ${evolutionStyles.evolution}`}>
    <section className={evolutionStyles.overview} aria-label="Resumo da evolução">
      <header className={evolutionStyles.toolbar}>
        <div><h2>Seu acompanhamento</h2><p>Resumo dos últimos {period} dias</p></div>
        <div className={styles.choices} role="group" aria-label="Período da evolução">
          {([7,30,90] as const).map(days => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} dias</button>)}
        </div>
      </header>
      <ProgressPanel sessions={sessions} compact periodDays={period} metricsOnly conciseMetrics />
    </section>
    <ProgressPanel sessions={sessions} compact periodDays={period} hideMetrics />
  </div>
}
