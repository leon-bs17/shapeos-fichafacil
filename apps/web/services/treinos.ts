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

export async function listarFichas(
  supabase: SupabaseClient,
  personalId: string
): Promise<FichaResumo[]> {
  const { data, error } = await supabase
    .from('treinos')
    .select(
      `id, titulo, ativo, criado_em, aluno_id,
       aluno:usuarios!treinos_aluno_id_fkey ( nome ),
       itens_treino (
         id, ordem, series, repeticoes, descanso_segundos,
         exercicio:exercicios ( id, nome, grupo_muscular )
       )`
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

async function inserirItens(
  supabase: SupabaseClient,
  treinoId: string,
  ficha: NovaFicha
): Promise<void> {
  const { error } = await supabase.from('itens_treino').insert(
    ficha.itens.map((i) => ({
      treino_id: treinoId,
      exercicio_id: i.exercicio_id,
      series: i.series,
      repeticoes: i.repeticoes,
      descanso_segundos: i.descanso_segundos,
      ordem: i.ordem,
    }))
  )
  if (error) throw error
}

export async function criarFicha(
  supabase: SupabaseClient,
  personalId: string,
  ficha: NovaFicha
): Promise<string> {
  const { data, error } = await supabase
    .from('treinos')
    .insert({
      aluno_id: ficha.aluno_id,
      personal_id: personalId,
      titulo: ficha.titulo.trim(),
    })
    .select('id')
    .single()

  if (error) throw error

  await inserirItens(supabase, data.id, ficha)
  return data.id as string
}

export async function duplicarFicha(
  supabase: SupabaseClient,
  fichaId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('treinos')
    .select(
      `id, aluno_id, personal_id, titulo,
       itens_treino ( exercicio_id, series, repeticoes, descanso_segundos, ordem )`
    )
    .eq('id', fichaId)
    .single()

  if (error) throw error

  const origem = data as unknown as {
    id: string
    aluno_id: string
    personal_id: string
    titulo: string
    itens_treino: NovaFicha['itens']
  }

  const { data: nova, error: erroNova } = await supabase
    .from('treinos')
    .insert({
      aluno_id: origem.aluno_id,
      personal_id: origem.personal_id,
      titulo: `${origem.titulo} (cópia)`,
      ativo: false,
    })
    .select('id')
    .single()

  if (erroNova) throw erroNova

  await inserirItens(supabase, nova.id as string, {
    aluno_id: origem.aluno_id,
    titulo: origem.titulo,
    itens: origem.itens_treino,
  })
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
  const { error: erroTitulo } = await supabase
    .from('treinos')
    .update({ titulo: ficha.titulo.trim() })
    .eq('id', fichaId)

  if (erroTitulo) throw erroTitulo

  const { error: erroDelete } = await supabase
    .from('itens_treino')
    .delete()
    .eq('treino_id', fichaId)

  if (erroDelete) throw erroDelete

  if (ficha.itens.length > 0) {
    await inserirItens(supabase, fichaId, {
      aluno_id: '',
      titulo: ficha.titulo,
      itens: ficha.itens,
    })
  }
}
