import { localCalendarDate } from '@/lib/fitness/deadlines'
import { createClient } from '@/lib/supabase/client'
import type { StudentAttentionSnapshot } from '@/lib/fitness/personal-attention'

interface AttentionRow {
  id: string
  nome: string
  vinculos: { criado_em: string; proxima_avaliacao_em: string | null }[]
  sessoes: { inicio: string }[]
  avaliacoes: { id: string; data: string }[]
  fichas: { id: string; titulo: string; valida_ate: string | null }[]
}

export async function fetchPersonalAttention(signal?: AbortSignal): Promise<StudentAttentionSnapshot[]> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão expirada')
  const result: StudentAttentionSnapshot[] = []
  const pageSize = 200
  const now = new Date().toISOString()
  for (let offset = 0; ; offset += pageSize) {
    // Limit each embedded relationship, never the global session history.
    // RLS remains enabled; the inner relationship also scopes the owning Personal.
    let query = supabase.from('usuarios').select(`
      id, nome,
      vinculos:personal_alunos!personal_alunos_aluno_id_fkey!inner(criado_em,proxima_avaliacao_em),
      sessoes:sessoes_treino!sessoes_treino_aluno_id_fkey(inicio),
      avaliacoes:avaliacoes_fisicas!avaliacoes_fisicas_aluno_id_fkey(id,data),
      fichas:treinos!treinos_aluno_id_fkey(id,titulo,valida_ate)
    `)
      .eq('vinculos.personal_id', user.id)
      .eq('vinculos.status', 'ATIVO')
      .eq('sessoes.status', 'CONCLUIDO')
      .lte('sessoes.inicio', now)
      .order('inicio', { referencedTable: 'sessoes', ascending: false })
      .limit(1, { referencedTable: 'sessoes' })
      .lte('avaliacoes.data', localCalendarDate())
      .order('data', { referencedTable: 'avaliacoes', ascending: false })
      .limit(1, { referencedTable: 'avaliacoes' })
      .eq('fichas.personal_id', user.id)
      .eq('fichas.ativo', true)
      .order('valida_ate', { referencedTable: 'fichas', ascending: true, nullsFirst: false })
      .limit(1, { referencedTable: 'fichas' })
      .order('criado_em', { referencedTable: 'vinculos', ascending: false })
      .limit(1, { referencedTable: 'vinculos' })
      .order('id')
      .range(offset, offset + pageSize - 1)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    const rows = (data ?? []) as unknown as AttentionRow[]
    for (const row of rows) {
      if (!row.vinculos[0]) throw new Error('Vínculo indisponível. Atualize os dados.')
      result.push({
        aluno_id: row.id, nome: row.nome, vinculado_em: row.vinculos[0].criado_em,
        ultima_sessao: row.sessoes[0]?.inicio ?? null,
        tem_ficha_ativa: row.fichas.length > 0,
        tem_avaliacao: row.avaliacoes.length > 0,
        valida_ate: row.fichas[0]?.valida_ate ?? null,
        titulo_ficha: row.fichas[0]?.titulo ?? null,
        proxima_avaliacao_em: row.vinculos[0].proxima_avaliacao_em,
        ultima_avaliacao: row.avaliacoes[0]?.data ?? null,
      })
    }
    if (rows.length < pageSize) return result
  }
}

