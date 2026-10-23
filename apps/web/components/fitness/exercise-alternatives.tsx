'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { ExercisePreview, ExerciseThumbnail } from './exercise-demonstration'
import { exerciseAlternatives } from '@/lib/fitness/exercise-library'
import type { ExercicioBiblioteca } from '@/services/exercicios'
import styles from './exercise-library.module.css'

export function ExerciseAlternatives({ exercise, exercises, onClose }: { exercise: ExercicioBiblioteca; exercises: ExercicioBiblioteca[]; onClose: () => void }) {
  const [equipment, setEquipment] = useState('Todos')
  const alternatives = exerciseAlternatives(exercise, exercises, equipment)
  const availableEquipment = Array.from(new Set([exercise, ...exerciseAlternatives(exercise, exercises)].map(item => item.equipamento || 'Sem equipamento informado'))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return <Modal personal open onClose={onClose} titulo="Alternativas de exercício">
    <div className={styles.alternatives}>
      <div className={styles.source}><strong>{exercise.nome}</strong><p>{exercise.grupo_muscular}{exercise.equipamento ? ` · ${exercise.equipamento}` : ''}</p></div>
      <p className={styles.note}>Exercícios do mesmo grupo muscular, priorizando o mesmo equipamento. Revise movimento, prescrição e necessidades do aluno antes de substituir na ficha.</p>
      <div><label htmlFor="alternative-equipment">Equipamento disponível</label><select id="alternative-equipment" value={equipment} onChange={event => setEquipment(event.target.value)}><option value="Todos">Todos os equipamentos</option>{availableEquipment.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      <p className={styles.note} aria-live="polite">{alternatives.length} {alternatives.length === 1 ? 'alternativa encontrada' : 'alternativas encontradas'}.</p>
      {!alternatives.length ? <p className={styles.note}>Nenhuma alternativa encontrada com esse equipamento.</p> : <ul className={styles.list}>
        {alternatives.map(item => <li key={item.id}>
          <ExerciseThumbnail name={item.nome} exerciseId={item.id} videoUrl={item.video_url} />
          <div><strong>{item.nome}</strong><p>{item.equipamento || 'Equipamento não informado'}{exercise.equipamento && item.equipamento === exercise.equipamento ? ' · Mesmo equipamento' : ''}</p><ExercisePreview name={item.nome} exerciseId={item.id} videoUrl={item.video_url} /></div>
        </li>)}
      </ul>}
      <p className={styles.note}>A consulta não altera nenhum treino. Para substituir, edite a ficha em Treinos.</p>
    </div>
  </Modal>
}
