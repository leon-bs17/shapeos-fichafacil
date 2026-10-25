'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { registrosDoAluno, type RegistroRelatorio } from '@/services/registros'
import { comparisonWindows, type PeriodDays } from '@/lib/fitness/period-comparison'
export function useRegistrosDoAluno(alunoId?: string, days?: PeriodDays) {
  return useQuery<RegistroRelatorio[]>({
    queryKey: ['registros', alunoId, days ?? 'todos'], enabled: !!alunoId,
    queryFn: ({ signal }) => registrosDoAluno(createClient(), alunoId!, { ...(days ? comparisonWindows(days) : {}), signal }),
  })
}
