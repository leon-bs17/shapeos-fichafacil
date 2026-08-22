import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  buscarAlunosDoPersonal,
  type AlunoVinculado,
} from '@/services/alunos'

export function useAlunos() {
  return useQuery<AlunoVinculado[]>({
    queryKey: ['alunos'],
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Sessão expirada')

      return buscarAlunosDoPersonal(supabase, user.id)
    },
  })
}

export function useMetricasGerais(alunos?: AlunoVinculado[]) {
  return {
    totalAlunos: alunos?.length ?? 0,
    alunosAtivos: alunos?.filter((a) => a.status === 'ATIVO').length ?? 0,
    fichasAtivas: alunos?.reduce((acc, a) => acc + a.treinos_ativos, 0) ?? 0,
  }
}
