'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Dumbbell } from 'lucide-react'
import { studentTrainers } from '@/services/support'
import { ExercisePreview } from './exercise-demonstration'
import dynamic from 'next/dynamic'
const MysChat = dynamic(() => import('@/components/mys/mys-chat').then(module => module.MysChat), { loading: () => <p role="status">Carregando a Mys…</p> })
import { PersonalSearch } from '@/components/ui/personal-search'
import { SupportSelect } from '@/components/support/support-select'
import type { Workout } from '@/services/fitness'
import s from './student-experience.module.css'
export function StudentTrainers({studentId,onSupport}:{studentId:string;onSupport:()=>void}) {
 const trainers=useQuery({queryKey:['fitness-student',studentId,'trainers'],queryFn:studentTrainers})
 return <section className={s.panel}><h2>Meu Personal</h2><p>Seus vínculos ativos e as próximas avaliações informadas pelo profissional.</p>{trainers.isPending?<p role="status">Carregando seus vínculos…</p>:trainers.isError?<div role="alert"><p>Não foi possível consultar seus vínculos.</p><button type="button" onClick={()=>void trainers.refetch()}>Tentar novamente</button></div>:!trainers.data.length?<p>Peça um convite ao Personal e aceite-o no painel para iniciar o acompanhamento.</p>:<div className={s.stack}>{trainers.data.map(trainer=><article key={trainer.id} className={s.notice}><div className={s.row}><h3><Dumbbell size={14} className="inline mr-2" aria-hidden="true"/>{trainer.nome}</h3><span className="personal-status" data-active="true"><CheckCircle2 size={12} aria-hidden="true"/>Ativo</span></div><p>{trainer.proxima_avaliacao_em?`Próxima avaliação informada: ${new Date(`${trainer.proxima_avaliacao_em}T12:00:00`).toLocaleDateString('pt-BR')}`:'Próxima avaliação ainda não informada.'}</p></article>)}</div>}<div className={s.choices}><button type="button" onClick={onSupport}>Falar com meu Personal</button></div></section>
}
export function StudentLibrary({workouts}:{workouts:Workout[]}) {
 const [search,setSearch]=useState(''),[group,setGroup]=useState('')
 const exercises=Array.from(new Map(workouts.flatMap(w=>w.itens).map(e=>[e.exercicio_id,e])).values()).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 const rows=exercises.filter(e=>(!group||e.grupo_muscular===group)&&normalize(e.nome).includes(normalize(search)))
 return <section className={`${s.panel} ${s.stack}`}><h2>Biblioteca dos seus treinos</h2><p>Demonstrações dos exercícios presentes nas suas fichas ativas. A prescrição é definida pelo Personal.</p><div className={s.row}><div className="min-w-0 flex-1"><label htmlFor="student-exercise-search" className="text-xs">Buscar exercício</label><PersonalSearch id="student-exercise-search" value={search} placeholder="Buscar exercício…" onChange={e=>setSearch(e.target.value)}/></div><SupportSelect label="Grupo muscular" value={group} options={[{value:'',label:'Todos os grupos'},...Array.from(new Set(exercises.map(e=>e.grupo_muscular))).sort().map(g=>({value:g,label:g}))]} onChange={setGroup}/></div><p role="status">{rows.length} exercícios encontrados</p>{!rows.length?<p>{exercises.length?'Nenhum exercício corresponde aos filtros.':'Os exercícios aparecerão quando seu Personal disponibilizar uma ficha ativa.'}</p>:rows.map(e=><article key={e.exercicio_id} className={s.notice}><h3>{e.nome}</h3><p>{e.grupo_muscular}</p><ExercisePreview name={e.nome} exerciseId={e.exercicio_id} videoUrl={e.video_url}/></article>)}</section>
}
export function StudentMys({studentId,name}:{studentId:string;name:string}) {
 const connection=useQuery({queryKey:['student-mys-connection',studentId],queryFn:async()=>{const response=await fetch('/api/mys',{cache:'no-store'});if(!response.ok)throw new Error('Não foi possível verificar a conexão da Mys.');const data=await response.json();if(data.role!=='ALUNO')throw new Error('Entre novamente na conta do Aluno.');return data as {configured:boolean}}})
 if(connection.isPending)return <p role="status">Preparando sua assistente…</p>
 if(connection.isError)return <div role="alert"><p>{connection.error.message}</p><button onClick={()=>void connection.refetch()}>Tentar novamente</button></div>
 return <div data-personal-mys data-student-mys><MysChat role="ALUNO" name={name} configured={connection.data.configured}/></div>
}
