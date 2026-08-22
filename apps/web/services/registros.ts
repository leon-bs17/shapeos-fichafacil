import type { SupabaseClient } from '@supabase/supabase-js'

export interface RegistroRelatorio {
  carga_utilizada: number | null
  repeticoes_feitas: number | null
  data_registro: string
  exercicio_nome: string
}

export async function registrosDoAluno(
  supabase: SupabaseClient,
  alunoId: string
): Promise<RegistroRelatorio[]> {
  const { data, error } = await supabase
    .from('registro_execucao')
    .select(
      `carga_utilizada, repeticoes_feitas, data_registro,
       item:itens_treino!registro_execucao_item_treino_id_fkey (
         exercicio:exercicios ( nome )
       )`
    )
    .eq('aluno_id', alunoId)
    .order('data_registro', { ascending: false })
    .limit(300)

  if (error) throw error

  return ((data ?? []) as unknown as {
    carga_utilizada: number | null
    repeticoes_feitas: number | null
    data_registro: string
    item: { exercicio: { nome: string } | null } | null
  }[]).map((r) => ({
    carga_utilizada: r.carga_utilizada,
    repeticoes_feitas: r.repeticoes_feitas,
    data_registro: r.data_registro,
    exercicio_nome: r.item?.exercicio?.nome ?? 'Exercício removido',
  }))
}
