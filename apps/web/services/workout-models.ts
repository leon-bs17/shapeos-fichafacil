import { fitnessRequest } from '@/lib/api/client'
import type { FichaResumo } from '@/services/treinos'

export interface WorkoutModel { id: string; titulo: string; quantidade_exercicios: number; criado_em: string }
export interface WorkoutModelPage { modelos: WorkoutModel[]; proximaPagina: number | null }
export const listWorkoutModels = (page: number) => fitnessRequest<WorkoutModelPage>(`/api/modelos-treino?pagina=${page}`)
export const saveWorkoutModel = (fichaId: string, titulo: string) => fitnessRequest<WorkoutModel>('/api/modelos-treino', 'POST', { ficha_id: fichaId, titulo })
export const deleteWorkoutModel = (id: string) => fitnessRequest<void>(`/api/modelos-treino/${encodeURIComponent(id)}`, 'DELETE')
export const applyWorkoutModel = (id: string, alunoId: string, titulo: string) => fitnessRequest<FichaResumo>(`/api/modelos-treino/${encodeURIComponent(id)}/aplicar`, 'POST', { aluno_id: alunoId, titulo })
