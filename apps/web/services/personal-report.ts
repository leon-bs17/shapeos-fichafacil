import { createClient } from '@/lib/supabase/client'
import { comparisonWindows, type PeriodDays } from '@/lib/fitness/period-comparison'
import type { Assessment, Session } from './fitness'

/** Read-only, bounded by the selected window and the authenticated Personal's active link. */
export async function fetchPersonalReport(alunoId: string, days: PeriodDays, signal?: AbortSignal) {
  if (!alunoId) throw new Error('Aluno indisponível.')
  const db = createClient()
  const window = comparisonWindows(days)
  const requestSignal = signal ?? new AbortController().signal
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) throw new Error('Sessão expirada. Entre novamente.')
  const { data: link, error: linkError } = await db.from('personal_alunos').select('status')
    .eq('personal_id', user.id).eq('aluno_id', alunoId).abortSignal(requestSignal).maybeSingle()
  if (linkError || link?.status !== 'ATIVO') throw new Error('Selecione um aluno com vínculo ativo para consultar o relatório.')

  async function sessions() {
    const rows: Session[] = []
    for (;;) {
      const { data, error } = await db.from('sessoes_treino').select('*').eq('aluno_id', alunoId)
        .gte('inicio', window.previousStart).lte('inicio', window.end)
        .order('inicio', { ascending: false }).order('id', { ascending: false })
        .range(rows.length, rows.length + 199).abortSignal(requestSignal)
      if (error || !data) throw new Error('Não foi possível carregar as sessões deste aluno.')
      if (!data.length) return rows
      rows.push(...data as Session[])
    }
  }
  async function assessments() {
    const rows: Assessment[] = []
    for (;;) {
      const { data, error } = await db.from('avaliacoes_fisicas')
        .select('id,aluno_id,data,peso,cintura,quadril,braco,observacoes,foto_path')
        .eq('aluno_id', alunoId).lte('data', window.endDate)
        .order('data', { ascending: false }).order('id', { ascending: false })
        .range(rows.length, rows.length + 199).abortSignal(requestSignal)
      if (error || !data) throw new Error('Não foi possível carregar as avaliações deste aluno.')
      if (!data.length) return rows
      rows.push(...data as Assessment[])
    }
  }
  const [sessionRows, assessmentRows] = await Promise.all([sessions(), assessments()])
  return { window, sessions: sessionRows, assessments: assessmentRows }
}
