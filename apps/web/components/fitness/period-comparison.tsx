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
export function PeriodComparison({ alunoId }: { alunoId: string }) {
  const [days, setDays] = useState<PeriodDays>(30)
  const query = useQuery({
    queryKey: ['personal-period-comparison', alunoId, days],
    queryFn: ({ signal }) => fetchPeriodComparison(alunoId, days, signal),
  })
  const data = query.data
  const comparison = data ? comparePeriods(data.sessions, data.window) : null
  return <section data-period-part="panel" className={styles.panel} aria-label="Comparação entre períodos">
    <header data-period-part="header" className={styles.header}>
      <div><h2>Comparação entre períodos</h2><p>Frequência, cargas e medidas do aluno.</p></div>
      <div data-period-part="periods" className={styles.periods} role="group" aria-label="Período da comparação">
        {([7, 30, 90] as const).map(period => <Button key={period} variant="outline" aria-pressed={days === period}
          onClick={() => setDays(period)}>{period} dias</Button>)}
      </div>
    </header>
    {query.isPending && <p role="status">Carregando comparação…</p>}
    {query.isError && <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
    {!query.isError && data && comparison && <>
      <div data-period-part="ranges" className={styles.ranges}>
        <p><strong>Atual</strong> {formatCalendarDate(data.window.startDate)} a {formatCalendarDate(data.window.endDate)}</p>
        <p><strong>Anterior</strong> {formatCalendarDate(data.window.previousStartDate)} a {formatCalendarDate(data.window.previousEndDate)}</p>
      </div>
      <p data-period-part="note" className={styles.note}>O período atual inclui hoje até a consulta. Apenas sessões concluídas; séries de aquecimento não entram nas cargas e no volume.</p>
      <dl data-period-part="metrics" className={styles.metrics}>
        {[
          { label: 'Sessões concluídas', current: comparison.current.sessions, previous: comparison.previous.sessions, unit: '' },
          { label: 'Dias com treino', current: comparison.current.trainingDays, previous: comparison.previous.trainingDays, unit: '' },
          { label: 'Volume registrado', current: comparison.current.volume, previous: comparison.previous.volume, unit: 'kg·rep' },
        ].map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd><strong>{value(metric.current, metric.unit)}</strong>
          <span>Anterior: {value(metric.previous, metric.unit)}</span><span>{change(metric.current, metric.previous, metric.unit)}</span></dd></div>)}
      </dl>
      <div data-period-part="section" className={styles.section}><h3>Carga por exercício</h3>
        <p data-period-part="note" className={styles.note}>Maior carga registrada com repetições em cada período. Compare junto da prescrição e da execução; os valores não indicam, sozinhos, melhora ou piora.</p>
        {comparison.exercises.length === 0 ? <p data-period-part="note" className={styles.note}>Nenhuma carga registrada nesses períodos.</p> :
          <div data-period-part="rows" className={styles.rows}>
            {comparison.exercises.map(exercise => <div data-period-part="row" className={styles.row} key={exercise.id}>
              <strong>{exercise.name}</strong><dl>
                <div><dt>Anterior</dt><dd>{value(exercise.previous, 'kg')}</dd></div>
                <div><dt>Atual</dt><dd>{value(exercise.current, 'kg')}</dd></div>
                <div><dt>Variação</dt><dd>{change(exercise.current, exercise.previous, 'kg')}</dd></div>
              </dl>
            </div>)}
          </div>}
      </div>
      <div data-period-part="section" className={styles.section}><h3>Medidas</h3>
        <p data-period-part="note" className={styles.note}>Última avaliação registrada dentro de cada período. Atual: {data.currentAssessment ? formatCalendarDate(data.currentAssessment.data) : 'sem avaliação'}; anterior: {data.previousAssessment ? formatCalendarDate(data.previousAssessment.data) : 'sem avaliação'}.</p>
        <div data-period-part="rows" className={styles.rows}>
          {([
            ['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['quadril', 'Quadril', 'cm'], ['braco', 'Braço', 'cm'],
          ] as const).map(([key, label, unit]) => {
            const current = data.currentAssessment?.[key] ?? null, previous = data.previousAssessment?.[key] ?? null
            return <div data-period-part="row" className={styles.row} key={key}><strong>{label}</strong><dl>
              <div><dt>Anterior</dt><dd>{value(previous, unit)}</dd></div>
              <div><dt>Atual</dt><dd>{value(current, unit)}</dd></div>
              <div><dt>Variação</dt><dd>{change(current, previous, unit)}</dd></div>
            </dl></div>
          })}
        </div>
      </div>
    </>}
  </section>
}
