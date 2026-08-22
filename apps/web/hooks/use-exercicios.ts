'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  criarExercicio,
  listarExercicios,
  type ExercicioBiblioteca,
} from '@/services/exercicios'

export function useExercicios() {
  return useQuery<ExercicioBiblioteca[]>({
    queryKey: ['exercicios'],
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')
      return listarExercicios(supabase, user.id)
    },
  })
}

export function useCriarExercicio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entrada: {
      nome: string
      grupo_muscular: string
      equipamento: string
    }) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')
      await criarExercicio(supabase, user.id, entrada)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercicios'] })
    },
  })
}
