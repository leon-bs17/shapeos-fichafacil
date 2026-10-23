'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applyWorkoutModel, deleteWorkoutModel, listWorkoutModels, saveWorkoutModel } from '@/services/workout-models'

export function useWorkoutModels() {
  return useInfiniteQuery({ queryKey: ['workout-models'], queryFn: ({ pageParam }) => listWorkoutModels(pageParam), initialPageParam: 0, getNextPageParam: page => page.proximaPagina ?? undefined, gcTime: 0 })
}
export function useWorkoutModelActions() {
  const client = useQueryClient()
  const invalidate = () => { void client.invalidateQueries({ queryKey: ['workout-models'] }) }
  const save = useMutation({ mutationFn: ({ fichaId, titulo }: { fichaId: string; titulo: string }) => saveWorkoutModel(fichaId, titulo), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: deleteWorkoutModel, onSuccess: invalidate })
  const apply = useMutation({ mutationFn: ({ id, alunoId, titulo }: { id: string; alunoId: string; titulo: string }) => applyWorkoutModel(id, alunoId, titulo), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['fichas'] })
    void client.invalidateQueries({ queryKey: ['alunos'] })
    void client.invalidateQueries({ queryKey: ['personal-attention'] })
  } })
  return { save, remove, apply }
}
