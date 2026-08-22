import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemTreinoComExercicio } from '@shapeos/shared'

export interface FichaDoAluno {
  id: string
  titulo: string
  criado_em: string
  itens: ItemTreinoComExercicio[]
}

export async function fichasAtivasDoAluno(
  supabase: SupabaseClient,
  alunoId: string
): Promise<FichaDoAluno[]> {
  const { data, error } = await supabase
    .from('treinos')
    .select(
      `id, titulo, criado_em,
       itens_treino (
         id, treino_id, exercicio_id, series, repeticoes,
         descanso_segundos, ordem,
         exercicio:exercicios!itens_treino_exercicio_id_fkey ( id, nome, grupo_muscular, video_url, equipamento )
       )`
    )
    .eq('aluno_id', alunoId)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as {
    id: string
    titulo: string
    criado_em: string
    itens_treino: ItemTreinoComExercicio[]
  }[]).map((row) => ({
    id: row.id,
    titulo: row.titulo,
    criado_em: row.criado_em,
    itens: [...(row.itens_treino ?? [])].sort((a, b) => a.ordem - b.ordem),
  }))
}

export interface MeuRegistro {
  carga_utilizada: number | null
  repeticoes_feitas: number | null
  data_registro: string
  exercicio_nome: string
}

export async function meusRegistros(
  supabase: SupabaseClient,
  alunoId: string
): Promise<MeuRegistro[]> {
  const { data, error } = await supabase
    .from('registro_execucao')
    .select(
      `carga_utilizada, repeticoes_feitas, data_registro,
       item:itens_treino!registro_execucao_item_treino_id_fkey (
         exercicio:exercicios!itens_treino_exercicio_id_fkey ( nome )
       )`
    )
    .eq('aluno_id', alunoId)
    .order('data_registro', { ascending: false })
    .limit(30)

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

export async function registrarExecucaoWeb(
  supabase: SupabaseClient,
  alunoId: string,
  entrada: {
    item_treino_id: string
    carga_utilizada: number | null
    repeticoes_feitas: number | null
  }
): Promise<void> {
  const { error } = await supabase.from('registro_execucao').insert({
    aluno_id: alunoId,
    item_treino_id: entrada.item_treino_id,
    carga_utilizada: entrada.carga_utilizada,
    repeticoes_feitas: entrada.repeticoes_feitas,
  })

  if (error) throw error
}
