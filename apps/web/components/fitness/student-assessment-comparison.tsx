'use client'

import { useState } from 'react'
import { Ruler } from 'lucide-react'
import { StudentAssessmentPicker } from './student-assessment-picker'
import type { Assessment } from '@/services/fitness'
import { measureDelta } from '@/lib/fitness/student-experience'
import styles from './student-experience.module.css'

const measurements = [
  { field: 'peso', label: 'Peso', unit: 'kg' },
  { field: 'cintura', label: 'Cintura', unit: 'cm' },
  { field: 'quadril', label: 'Quadril', unit: 'cm' },
  { field: 'braco', label: 'Braço', unit: 'cm' },
] as const

export function StudentAssessmentComparison({ assessments }: { assessments: Assessment[] }) {
  const [beforeId, setBeforeId] = useState('')
  const [afterId, setAfterId] = useState('')
  const sorted = [...assessments].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id))
  const before = sorted.find(row => row.id === beforeId) ?? sorted[0]
  const after = sorted.find(row => row.id === afterId) ?? sorted.at(-1)

  return <section className="personal-panel" aria-labelledby="student-comparison-title">
    <header className="personal-panel-heading"><h2 id="student-comparison-title">Comparar medidas</h2></header>
    {sorted.length < 2 || !before || !after ? (
      <div className="personal-empty"><Ruler size={26} aria-hidden="true" /><p>Registre ao menos duas avaliações para comparar suas medidas.</p></div>
    ) : (
      <div className={styles.state}>
        <div className={styles.row}>
          <StudentAssessmentPicker label="Avaliação inicial" value={before.id} options={sorted} onChange={setBeforeId} />
          <StudentAssessmentPicker label="Avaliação final" value={after.id} options={sorted} onChange={setAfterId} />
        </div>
        {before.id === after.id || before.data > after.data ? (
          <p role="status">Escolha avaliações diferentes, com a inicial anterior à final.</p>
        ) : <>
          <dl className={styles.comparison}>
            {measurements.map(({ field, label, unit }) => {
              const delta = measureDelta(before, after, field)
              return <div key={field}>
                <dt>{label}</dt>
                <dd>{before[field] ?? '—'} → {after[field] ?? '—'} {unit}</dd>
                <dd>{delta == null ? 'Sem comparação' : `${delta > 0 ? '+' : ''}${delta.toLocaleString('pt-BR')} ${unit}`}</dd>
              </div>
            })}
          </dl>
          <p className="personal-results-note">Diferenças entre os registros selecionados. A interpretação depende dos seus objetivos e do acompanhamento do Personal.</p>
        </>}
      </div>
    )}
  </section>
}
