import type { SupabaseClient } from '@supabase/supabase-js'
import { fitnessRequest } from '@/lib/api/client'

export interface ItemFicha {
  id: string
  ordem: number
  series: number
  repeticoes: string
  descanso_segundos: number
  exercicio: { id: string; nome: string; grupo_muscular: string; video_url?: string | null }
}

export interface FichaResumo {
  id: string
  titulo: string
  ativo: boolean
  criado_em: string
  aluno_id: string
  aluno_nome: string
  itens: ItemFicha[]
}

export interface NovaFicha {
  aluno_id: string
  titulo: string
  itens: {
    exercicio_id: string
    series: number
    repeticoes: string
    descanso_segundos: number
    ordem: number
  }[]
}

// Calls the same authenticated REST API documented for the Sprint 3 demonstration.
export async function listarFichas(_supabase:SupabaseClient,_personalId:string):Promise<FichaResumo[]> {
  return fitnessRequest<FichaResumo[]>('/api/treinos')
}
export async function criarFicha(_supabase:SupabaseClient,_personalId:string,ficha:NovaFicha):Promise<string> {
  const created=await fitnessRequest<FichaResumo>('/api/treinos','POST',ficha)
  return created.id
}
export async function duplicarFicha(_supabase:SupabaseClient,fichaId:string):Promise<void> {
  await fitnessRequest(`/api/treinos/${encodeURIComponent(fichaId)}/duplicar`,'POST')
}
export async function alternarFichaAtiva(_supabase:SupabaseClient,fichaId:string,ativo:boolean):Promise<void> {
  await fitnessRequest(`/api/treinos/${encodeURIComponent(fichaId)}`,'PATCH',{ativo})
}
export async function excluirFicha(_supabase:SupabaseClient,fichaId:string):Promise<void> {
  await fitnessRequest(`/api/treinos/${encodeURIComponent(fichaId)}`,'DELETE')
}
export async function editarFicha(_supabase:SupabaseClient,fichaId:string,ficha:Omit<NovaFicha,'aluno_id'>):Promise<void> {
  await fitnessRequest(`/api/treinos/${encodeURIComponent(fichaId)}`,'PATCH',ficha)
}
