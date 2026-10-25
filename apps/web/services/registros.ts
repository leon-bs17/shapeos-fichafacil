import type { SupabaseClient } from '@supabase/supabase-js'

export interface RegistroRelatorio {
  id: string
  item_treino_id: string | null
  exercicio_id: string | null
  carga_utilizada: number | null
  repeticoes_feitas: number | null
  data_registro: string
  exercicio_nome: string
}
export interface RegistroWindow { start?: string; end?: string; signal?: AbortSignal }
interface RawRecord {
  id: string; item_treino_id: string | null; carga_utilizada: number | null; repeticoes_feitas: number | null; data_registro: string
  item: { exercicio: { id: string; nome: string } | null } | null
}
export async function registrosDoAluno(db: SupabaseClient, alunoId: string, window: RegistroWindow = {}): Promise<RegistroRelatorio[]> {
  const rows: RawRecord[] = []
  for (;;) {
    let query = db.from('registro_execucao').select(`id,item_treino_id,carga_utilizada,repeticoes_feitas,data_registro,
      item:itens_treino!registro_execucao_item_treino_id_fkey(exercicio:exercicios(id,nome))`)
      .eq('aluno_id', alunoId).order('data_registro', { ascending: false }).order('id', { ascending: false })
      .range(rows.length, rows.length + 199)
    if (window.start) query = query.gte('data_registro', window.start)
    if (window.end) query = query.lte('data_registro', window.end)
    if (window.signal) query = query.abortSignal(window.signal)
    const { data, error } = await query
    if (error || !data) throw new Error('Não foi possível carregar o histórico de cargas. Tente novamente.')
    rows.push(...data as unknown as RawRecord[])
    if (!data.length) break
  }
  return rows.map(row => ({ id: row.id, item_treino_id: row.item_treino_id, exercicio_id: row.item?.exercicio?.id ?? null,
    carga_utilizada: row.carga_utilizada, repeticoes_feitas: row.repeticoes_feitas, data_registro: row.data_registro,
    exercicio_nome: row.item?.exercicio?.nome ?? 'Exercício removido' }))
}
