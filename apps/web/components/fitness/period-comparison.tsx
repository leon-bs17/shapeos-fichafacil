'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { comparePeriods, difference, type PeriodDays } from '@/lib/fitness/period-comparison'
import { formatCalendarDate } from '@/lib/fitness/deadlines'
import { fetchPeriodComparison } from '@/services/period-comparison'
import styles from './period-comparison.module.css'

const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
function value(value: number | null | undefined, unit = '') {
  return value == null ? 'Sem registro' : `${number(value)}${unit ? ` ${unit}` : ''}`
}
function change(current: number | null, previous: number | null, unit = '') {
  const delta = difference(current, previous)
  return delta == null ? 'Sem comparação' : delta === 0 ? 'Sem mudança' : `${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}${unit ? ` ${unit}` : ''}`
}
export function PeriodComparison({ alunoId, compact = false, periodDays }: { alunoId: string; compact?: boolean; periodDays?: PeriodDays }) {
  const [localDays, setDays] = useState<PeriodDays>(30)
  const days = periodDays ?? localDays
  const query = useQuery({
    queryKey: ['personal-period-comparison', alunoId, days],
    queryFn: ({ signal }) => fetchPeriodComparison(alunoId, days, signal),
  })
  const data = query.data
  const comparison = data ? comparePeriods(data.sessions, data.window) : null
  return <section className={`${styles.panel} ${compact ? styles.compact : ''}`} aria-label="Comparação entre períodos">
    <header className={styles.header}>
      <div><h2>Comparação entre períodos</h2><p>Frequência, cargas e medidas do aluno.</p></div>
      {periodDays == null && <div className={styles.periods} role="group" aria-label="Período da comparação">
        {([7, 30, 90] as const).map(period => <Button key={period} variant="outline" aria-pressed={days === period}
          onClick={() => setDays(period)}>{period} dias</Button>)}
      </div>}
    </header>
    {query.isPending && <p role="status">Carregando comparação…</p>}
    {query.isError && <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
    {!query.isError && data && comparison && <>
      <div className={styles.ranges}>
        <p><strong>Atual</strong> {formatCalendarDate(data.window.startDate)} a {formatCalendarDate(data.window.endDate)}</p>
        <p><strong>Anterior</strong> {formatCalendarDate(data.window.previousStartDate)} a {formatCalendarDate(data.window.previousEndDate)}</p>
      </div>
      <p className={styles.note}>O período atual inclui hoje até a consulta. Apenas sessões concluídas; séries de aquecimento não entram nas cargas e no volume.</p>
      <dl className={styles.metrics}>
        {[
          { label: 'Sessões concluídas', current: comparison.current.sessions, previous: comparison.previous.sessions, unit: '' },
          { label: 'Dias com treino', current: comparison.current.trainingDays, previous: comparison.previous.trainingDays, unit: '' },
          { label: 'Volume registrado', current: comparison.current.volume, previous: comparison.previous.volume, unit: 'kg·rep' },
        ].map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd><strong>{value(metric.current, metric.unit)}</strong>
          <span>Anterior: {value(metric.previous, metric.unit)}</span><span>{change(metric.current, metric.previous, metric.unit)}</span></dd></div>)}
      </dl>
      <div className={compact ? styles.columns : styles.sectionStack}>
      <div className={styles.section}><h3>Carga por exercício</h3>
        <p className={styles.note}>Maior carga registrada com repetições em cada período. Compare junto da prescrição e da execução; os valores não indicam, sozinhos, melhora ou piora.</p>
        {comparison.exercises.length === 0 ? <p className={styles.note}>Nenhuma carga registrada nesses períodos.</p> :
          compact ? <div className={styles.tableFrame}><table className={styles.comparisonTable}>
            <caption className={styles.srOnly}>Carga por exercício nos períodos anterior e atual</caption>
            <thead><tr><th scope="col">Exercício</th><th scope="col">Anterior</th><th scope="col">Atual</th><th scope="col">Variação</th></tr></thead>
            <tbody>{comparison.exercises.map(exercise => <tr key={exercise.id}><th scope="row">{exercise.name}</th><td>{value(exercise.previous, 'kg')}</td><td>{value(exercise.current, 'kg')}</td><td>{change(exercise.current, exercise.previous, 'kg')}</td></tr>)}</tbody>
          </table></div> : <div className={styles.rows}>
            {comparison.exercises.map(exercise => <div className={styles.row} key={exercise.id}>
              <strong>{exercise.name}</strong><dl>
                <div><dt>Anterior</dt><dd>{value(exercise.previous, 'kg')}</dd></div>
                <div><dt>Atual</dt><dd>{value(exercise.current, 'kg')}</dd></div>
                <div><dt>Variação</dt><dd>{change(exercise.current, exercise.previous, 'kg')}</dd></div>
              </dl>
            </div>)}
          </div>}
      </div>
      <div className={styles.section}><h3>Medidas</h3>
        <p className={styles.note}>Última avaliação registrada dentro de cada período. Atual: {data.currentAssessment ? formatCalendarDate(data.currentAssessment.data) : 'sem avaliação'}; anterior: {data.previousAssessment ? formatCalendarDate(data.previousAssessment.data) : 'sem avaliação'}.</p>
        {compact ? <div className={styles.tableFrame}><table className={styles.comparisonTable}>
          <caption className={styles.srOnly}>Medidas das avaliações dos períodos anterior e atual</caption>
          <thead><tr><th scope="col">Medida</th><th scope="col">Anterior</th><th scope="col">Atual</th><th scope="col">Variação</th></tr></thead>
          <tbody>{([
            ['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['quadril', 'Quadril', 'cm'], ['braco', 'Braço', 'cm'],
          ] as const).map(([key, label, unit]) => <tr key={key}><th scope="row">{label}</th><td>{value(data.previousAssessment?.[key], unit)}</td><td>{value(data.currentAssessment?.[key], unit)}</td><td>{change(data.currentAssessment?.[key] ?? null, data.previousAssessment?.[key] ?? null, unit)}</td></tr>)}</tbody>
        </table></div> : <div className={styles.rows}>
          {([
            ['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['quadril', 'Quadril', 'cm'], ['braco', 'Braço', 'cm'],
          ] as const).map(([key, label, unit]) => {
            const current = data.currentAssessment?.[key] ?? null, previous = data.previousAssessment?.[key] ?? null
            return <div className={styles.row} key={key}><strong>{label}</strong><dl>
              <div><dt>Anterior</dt><dd>{value(previous, unit)}</dd></div>
              <div><dt>Atual</dt><dd>{value(current, unit)}</dd></div>
              <div><dt>Variação</dt><dd>{change(current, previous, unit)}</dd></div>
            </dl></div>
          })}
        </div>}
      </div>
      </div>
    </>}
  </section>
}
