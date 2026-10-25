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
  } | null
}

export async function buscarAlunosDoPersonal(
  supabase: SupabaseClient,
  personalId: string
): Promise<AlunoVinculado[]> {
  const rows: LinhaBruta[] = []
  const counts = new Map<string, number>()
  for (;;) {
    const { data, error } = await supabase.from('personal_alunos')
      .select('id,status,criado_em,aluno:usuarios!personal_alunos_aluno_id_fkey(id,nome,email)')
      .eq('personal_id', personalId).order('criado_em', { ascending: false }).order('id')
      .range(rows.length, rows.length + 199)
    if (error || !data) throw new Error('Não foi possível carregar seus alunos.')
    if (!data.length) break
    rows.push(...data as unknown as LinhaBruta[])
  }
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await supabase.from('treinos').select('aluno_id')
      .eq('personal_id', personalId).eq('ativo', true).order('id').range(offset, offset + 199)
    if (error || !data) throw new Error('Não foi possível contar as fichas dos seus alunos.')
    if (!data.length) break
    for (const workout of data) counts.set(workout.aluno_id, (counts.get(workout.aluno_id) ?? 0) + 1)
  }
  return rows.map(row => ({
    vinculo_id: row.id, status: row.status as AlunoVinculado['status'], criado_em: row.criado_em,
    aluno_id: row.aluno?.id ?? '', nome: row.aluno?.nome ?? '—', email: row.aluno?.email ?? '—',
    treinos_ativos: counts.get(row.aluno?.id ?? '') ?? 0,
  }))
}
