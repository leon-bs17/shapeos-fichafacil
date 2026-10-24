'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPersonalReport } from '@/services/personal-report'
import type { PeriodDays } from '@/lib/fitness/period-comparison'
import { ProgressPanel } from './progress-panel'
import styles from './personal-report.module.css'

export function PersonalReportIndicators({ alunoId, studentName, days }: {
  alunoId: string; studentName: string; days: PeriodDays
}) {
  // Same query as Resumo: the cache shares the request across both components.
  const query = useQuery({
    queryKey: ['personal-report-overview', alunoId, days],
    queryFn: ({ signal }) => fetchPersonalReport(alunoId, days, signal),
  })
  return <section className={styles.topIndicators} aria-label="Indicadores do aluno e período selecionados">
    <p className={styles.indicatorContext}>{studentName} · últimos {days} dias</p>
    {query.isPending ? <p className={styles.note} role="status">Carregando indicadores…</p> :
      query.isError ? <div className={styles.indicatorError} role="alert"><p>Não foi possível carregar os indicadores.</p><button type="button" className={styles.textAction} onClick={() => void query.refetch()}>Tentar novamente</button></div> :
      <ProgressPanel sessions={query.data.sessions} compact periodDays={days} metricsOnly />}
  </section>
}
