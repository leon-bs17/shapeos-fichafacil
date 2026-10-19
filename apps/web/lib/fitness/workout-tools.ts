import type { FichaResumo } from '@/services/treinos'
export type WorkoutStatus='TODAS'|'ATIVAS'|'PAUSADAS'
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
export function filterWorkouts(workouts:FichaResumo[],query:string,status:WorkoutStatus):FichaResumo[]{
  const term=normalize(query)
  return workouts.filter(w=>(status==='TODAS'||w.ativo===(status==='ATIVAS'))&&(!term||normalize(`${w.titulo} ${w.aluno_nome}`).includes(term)))
}
export function exportWorkouts(workouts:FichaResumo[],now=new Date()){
  return JSON.stringify({versao:1,exportado_em:now.toISOString(),total:workouts.length,fichas:workouts},null,2)
}
