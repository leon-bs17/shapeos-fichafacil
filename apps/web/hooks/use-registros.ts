'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { registrosDoAluno, type RegistroRelatorio } from '@/services/registros'

export function useRegistrosDoAluno(alunoId?: string) {
  return useQuery<RegistroRelatorio[]>({
    queryKey: ['registros', alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      if (!alunoId) return []
      return registrosDoAluno(createClient(), alunoId)
    },
  })
}
