import type { SupabaseClient } from '@supabase/supabase-js'

export interface ItemFicha {
  id: string
  ordem: number
  series: number
  repeticoes: string
  descanso_segundos: number
  exercicio: { id: string; nome: string; grupo_muscular: string }
}

export interface FichaResumo {
  id: string
  titulo: string
  ativo: boolean
  criado_em: string
  aluno_id: string
  aluno_nome: string
  itens: ItemFicha[]
}

export interface NovaFicha {
  aluno_id: string
  titulo: string
  itens: {
    exercicio_id: string
    series: number
    repeticoes: string
    descanso_segundos: number
    ordem: number
  }[]
}

function itensParaRpc(itens: NovaFicha['itens']) {
  return itens.map((item) => ({
    exercicio_id: item.exercicio_id,
    series: item.series,
    repeticoes: item.repeticoes,
    descanso_segundos: item.descanso_segundos,
    ordem: item.ordem,
  }))
}

export async function listarFichas(
  supabase: SupabaseClient,
  personalId: string
): Promise<FichaResumo[]> {
  const { data, error } = await supabase
    .from('treinos')
    .select(
      \`id, titulo, ativo, criado_em, aluno_id,
       aluno:usuarios!treinos_aluno_id_fkey ( nome ),
       itens_treino (
         id, ordem, series, repeticoes, descanso_segundos,
         exercicio:exercicios ( id, nome, grupo_muscular )
       )\`
    )
    .eq('personal_id', personalId)
    .order('criado_em', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as {
    id: string
    titulo: string
    ativo: boolean
    criado_em: string
    aluno_id: string
    aluno: { nome: string } | null
    itens_treino: ItemFicha[]
  }[]).map((row) => ({
    id: row.id,
    titulo: row.titulo,
    ativo: row.ativo,
    criado_em: row.criado_em,
    aluno_id: row.aluno_id,
    aluno_nome: row.aluno?.nome ?? '—',
    itens: [...(row.itens_treino ?? [])].sort((a, b) => a.ordem - b.ordem),
  }))
}

export async function criarFicha(
  supabase: SupabaseClient,
  _personalId: string,
  ficha: NovaFicha
): Promise<string> {
  const { data, error } = await supabase.rpc('criar_ficha_atomica', {
    p_aluno_id: ficha.aluno_id,
    p_titulo: ficha.titulo.trim(),
    p_itens: itensParaRpc(ficha.itens),
  })

  if (error) throw error
  if (!data) throw new Error('Nao foi possivel criar a ficha.')

  return data as string
}

export async function duplicarFicha(
  supabase: SupabaseClient,
  fichaId: string
): Promise<void> {
  const { error } = await supabase.rpc('duplicar_ficha_atomica', {
    p_ficha_id: fichaId,
  })

  if (error) throw error
}

export async function alternarFichaAtiva(
  supabase: SupabaseClient,
  fichaId: string,
  ativo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('treinos')
    .update({ ativo })
    .eq('id', fichaId)

  if (error) throw error
}

export async function excluirFicha(
  supabase: SupabaseClient,
  fichaId: string
): Promise<void> {
  const { error } = await supabase.from('treinos').delete().eq('id', fichaId)
  if (error) throw error
}

export async function editarFicha(
  supabase: SupabaseClient,
  fichaId: string,
  ficha: Omit<NovaFicha, 'aluno_id'>
): Promise<void> {
  const { error } = await supabase.rpc('editar_ficha_atomica', {
    p_ficha_id: fichaId,
    p_titulo: ficha.titulo.trim(),
    p_itens: itensParaRpc(ficha.itens),
  })

  if (error) throw error
}
