'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, CircleUserRound, Library, LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { studentTrainers } from '@/services/support'
import { ExercisePreview, ExerciseThumbnail } from './exercise-demonstration'
import dynamic from 'next/dynamic'
const MysChat = dynamic(() => import('@/components/mys/mys-chat').then(module => module.MysChat), { loading: () => <p role="status">Carregando a Mys…</p> })
import { PersonalSearch } from '@/components/ui/personal-search'
import type { Workout } from '@/services/fitness'
import s from './student-experience.module.css'
export function StudentTrainers({ studentId, onSupport }: { studentId: string; onSupport: () => void }) {
  const trainers = useQuery({ queryKey: ['fitness-student', studentId, 'trainers'], queryFn: studentTrainers })

  return (
    <section className="personal-panel" aria-labelledby="student-trainers-title">
      <header className={`personal-panel-heading ${s.sectionHeading}`}>
        <h2 id="student-trainers-title">Vínculos ativos</h2>
        <Button variant="outline" onClick={onSupport}><LifeBuoy size={16} aria-hidden="true" />Falar com meu Personal</Button>
      </header>
      {trainers.isPending ? <p className={s.state} role="status">Carregando seus vínculos…</p> : trainers.isError ? (
        <div className={s.state}><div className="personal-load-error" role="alert">
          <p>Não foi possível consultar seus vínculos.</p>
          <Button variant="outline" onClick={() => void trainers.refetch()}>Tentar novamente</Button>
        </div></div>
      ) : !trainers.data.length ? (
        <div className="personal-empty">
          <CircleUserRound size={28} aria-hidden="true" />
          <h3>Nenhum Personal vinculado</h3>
          <p>Peça um convite ao Personal e aceite-o no painel para iniciar o acompanhamento.</p>
        </div>
      ) : (
        <ul className={s.list}>
          {trainers.data.map(trainer => (
            <li key={trainer.id} className={s.listRow}>
              <div className="personal-student-identity">
                <span className="personal-avatar" aria-hidden="true"><CircleUserRound size={18} /></span>
                <div>
                  <strong>{trainer.nome}</strong>
                  <p>{trainer.proxima_avaliacao_em ? <>Próxima avaliação em <time dateTime={trainer.proxima_avaliacao_em}>{new Date(`${trainer.proxima_avaliacao_em}T12:00:00`).toLocaleDateString('pt-BR')}</time></> : 'Próxima avaliação ainda não informada.'}</p>
                </div>
              </div>
              <span className="personal-status" data-active="true"><CheckCircle2 size={12} aria-hidden="true" />Ativo</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function StudentLibrary({ workouts }: { workouts: Workout[] }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('')
  const exercises = Array.from(new Map(workouts.flatMap(workout => workout.itens).map(exercise => [exercise.exercicio_id, exercise])).values())
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const groups = Array.from(new Set(exercises.map(exercise => exercise.grupo_muscular).filter(Boolean))).sort()
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const term = normalize(search.trim())
  const rows = exercises.filter(exercise => (!group || exercise.grupo_muscular === group) && normalize(exercise.nome).includes(term))

  return (
    <div className={s.stack}>
      <div className="personal-toolbar">
        <div className="personal-toolbar-field">
          <label htmlFor="student-exercise-search">Buscar exercício</label>
          <PersonalSearch id="student-exercise-search" value={search} placeholder="Buscar por nome…" onChange={event => setSearch(event.target.value)} />
        </div>
        {groups.length > 0 && <div className="personal-filter-chips" role="group" aria-label="Grupo muscular">
          {['', ...groups].map(value => <button key={value} type="button" className="personal-filter-chip" aria-pressed={group === value} onClick={() => setGroup(value)}>{value || 'Todos os grupos'}</button>)}
        </div>}
      </div>
      <p className="personal-results-note" role="status">{rows.length} de {exercises.length} exercícios</p>
      {!rows.length ? (
        <div className="personal-panel personal-empty">
          <Library size={26} aria-hidden="true" />
          <h3>Nenhum exercício encontrado</h3>
          <p>{exercises.length ? 'Ajuste a busca ou o grupo muscular.' : 'Os exercícios aparecerão quando seu Personal disponibilizar uma ficha ativa.'}</p>
        </div>
      ) : (
        <div className="personal-exercise-grid">
          {rows.map(exercise => (
            <article key={exercise.exercicio_id} className="personal-panel personal-exercise-card">
              <div className={s.exerciseCard}>
                <div className={s.thumbnail}><ExerciseThumbnail name={exercise.nome} exerciseId={exercise.exercicio_id} videoUrl={exercise.video_url} /></div>
                <div className="min-w-0">
                  <h3 className="personal-exercise-name">{exercise.nome}</h3>
                  <p className="personal-exercise-meta">{exercise.grupo_muscular}</p>
                  <ExercisePreview name={exercise.nome} exerciseId={exercise.exercicio_id} videoUrl={exercise.video_url} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function StudentMys({studentId,name}:{studentId:string;name:string}) {
 const connection=useQuery({queryKey:['student-mys-connection',studentId],queryFn:async()=>{const response=await fetch('/api/mys',{cache:'no-store'});if(!response.ok)throw new Error('Não foi possível verificar a conexão da Mys.');const data=await response.json();if(data.role!=='ALUNO')throw new Error('Entre novamente na conta do Aluno.');return data as {configured:boolean}}})
 if(connection.isPending)return <p role="status">Preparando sua assistente…</p>
 if(connection.isError)return <div className="personal-load-error" role="alert"><p>{connection.error.message}</p><Button variant="outline" onClick={()=>void connection.refetch()}>Tentar novamente</Button></div>
 return <div data-personal-mys data-student-mys><MysChat role="ALUNO" name={name} configured={connection.data.configured}/></div>
}
