import type { SupabaseClient } from '@supabase/supabase-js'

export interface AlunoVinculado {
  vinculo_id: string
  status: 'ATIVO' | 'INATIVO'
  criado_em: string
  aluno_id: string
  nome: string
  email: string
  treinos_ativos: number
}

export async function buscarAlunosDoPersonal(
  supabase: SupabaseClient,
  personalId: string
): Promise<AlunoVinculado[]> {
  const { data, error } = await supabase
    .from('personal_alunos')
    .select(
      `id, status, criado_em,
       aluno:usuarios!personal_alunos_aluno_id_fkey ( id, nome, email ),
       treinos!treinos_aluno_id_fkey ( ativo )`
    )
    .eq('personal_id', personalId)
    .order('criado_em', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const aluno = Array.isArray(row.aluno) ? row.aluno[0] : row.aluno
    const treinosDoAluno = Array.isArray(row.treinos) ? row.treinos : []
    return {
      vinculo_id: row.id,
      status: row.status,
      criado_em: row.criado_em,
      aluno_id: aluno?.id ?? '',
      nome: aluno?.nome ?? '—',
      email: aluno?.email ?? '—',
      treinos_ativos: treinosDoAluno.filter((t) => t.ativo).length,
    }
  })
}
