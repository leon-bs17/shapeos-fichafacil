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

interface LinhaBruta {
  id: string
  status: string
  criado_em: string
  aluno: {
    id: string
    nome: string
    email: string
    treinos: { ativo: boolean }[]
  } | null
}

export async function buscarAlunosDoPersonal(
  supabase: SupabaseClient,
  personalId: string
): Promise<AlunoVinculado[]> {
  const { data, error } = await supabase
    .from('personal_alunos')
    .select(
      `id, status, criado_em,
       aluno:usuarios!personal_alunos_aluno_id_fkey (
         id, nome, email,
         treinos!treinos_aluno_id_fkey ( ativo )
       )`
    )
    .eq('personal_id', personalId)
    .order('criado_em', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as LinhaBruta[]).map((row) => ({
    vinculo_id: row.id,
    status: row.status as AlunoVinculado['status'],
    criado_em: row.criado_em,
    aluno_id: row.aluno?.id ?? '',
    nome: row.aluno?.nome ?? '—',
    email: row.aluno?.email ?? '—',
    treinos_ativos: (row.aluno?.treinos ?? []).filter((t) => t.ativo).length,
  }))
}
