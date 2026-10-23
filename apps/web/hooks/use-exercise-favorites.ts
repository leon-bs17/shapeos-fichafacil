'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fitnessRequest } from '@/lib/api/client'

const key = ['personal-exercise-favorites'] as const
export function useExerciseFavorites() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: key, queryFn: () => fitnessRequest<string[]>('/api/exercicios/favoritos'), gcTime: 0 })
  const mutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      fitnessRequest<{ id: string; favorite: boolean }>(`/api/exercicios/${encodeURIComponent(id)}/favorito`, favorite ? 'PUT' : 'DELETE'),
    onSuccess: async result => {
      // Finish any older read before updating the confirmed state, preventing it
      // from overwriting a save when the window regains focus.
      await client.cancelQueries({ queryKey: key })
      client.setQueryData<string[]>(key, previous => result.favorite
        ? Array.from(new Set([...(previous ?? []), result.id]))
        : (previous ?? []).filter(id => id !== result.id))
    },
  })
  const ids = useMemo(() => new Set(query.data ?? []), [query.data])
  return { query, mutation, ids }
}
