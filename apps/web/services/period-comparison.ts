import { createClient } from '@/lib/supabase/client'
import { comparisonWindows, type PeriodDays, type ComparisonSession, type ComparisonAssessment } from '@/lib/fitness/period-comparison'

export async function fetchPeriodComparison(alunoId: string, days: PeriodDays, signal?: AbortSignal) {
  if (!alunoId) throw new Error('Aluno indisponível.')
  const window = comparisonWindows(days)
  const db = createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) throw new Error('Sessão expirada. Entre novamente.')
  const requestSignal = signal ?? new AbortController().signal
  const { data: link, error: linkError } = await db.from('personal_alunos').select('status')
    .eq('personal_id', user.id).eq('aluno_id', alunoId).abortSignal(requestSignal).maybeSingle()
  if (linkError) throw new Error('Não foi possível verificar o vínculo deste aluno.')
  if (!link || link.status !== 'ATIVO') throw new Error('A comparação está disponível para alunos com vínculo ativo.')

  async function sessionsInWindow() {
    const rows: ComparisonSession[] = []
    // Keep fetching until exhaustion, including when the API caps a page below 200 rows.
    for (;;) {
      const { data, error } = await db.from('sessoes_treino')
        .select('id,inicio,status,prescricao,series').eq('aluno_id', alunoId).eq('status', 'CONCLUIDO')
        .gte('inicio', window.previousStart).lte('inicio', window.end)
        .order('inicio', { ascending: true }).order('id', { ascending: true })
        .range(rows.length, rows.length + 199).abortSignal(requestSignal)
      if (error || !data) throw new Error('Não foi possível carregar as sessões para comparação.')
      if (!data.length) return rows
      rows.push(...data as ComparisonSession[])
    }
  }
  async function assessment(start: string, end: string): Promise<ComparisonAssessment | null> {
    const { data, error } = await db.from('avaliacoes_fisicas').select('id,data,peso,cintura,quadril,braco')
      .eq('aluno_id', alunoId).gte('data', start).lte('data', end)
      .order('data', { ascending: false }).order('id', { ascending: false }).limit(1).abortSignal(requestSignal)
    if (error || !data) throw new Error('Não foi possível carregar as medidas para comparação.')
    return data[0] as ComparisonAssessment ?? null
  }
  const [sessions, currentAssessment, previousAssessment] = await Promise.all([
    sessionsInWindow(), assessment(window.startDate, window.endDate),
    assessment(window.previousStartDate, window.previousEndDate),
  ])
  return { window, sessions, currentAssessment, previousAssessment }
}
