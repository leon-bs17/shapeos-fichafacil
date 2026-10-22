import { createClient } from '@/lib/supabase/client'
import { localCalendarDate } from '@/lib/fitness/deadlines'
import { followUpWindows, type FollowUpSession, type StudentFollowUp } from '@/lib/fitness/follow-up'

export async function fetchStudentFollowUp(alunoId: string, signal?: AbortSignal): Promise<StudentFollowUp> {
  if (!alunoId) throw new Error('Aluno indisponível.')
  const db = createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) throw new Error('Sessão expirada. Entre novamente.')
  const requestSignal = signal ?? new AbortController().signal
  const { data: link, error: linkError } = await db.from('personal_alunos')
    .select('status,proxima_avaliacao_em').eq('personal_id', user.id).eq('aluno_id', alunoId)
    .abortSignal(requestSignal).maybeSingle()
  if (linkError) throw new Error('Não foi possível verificar o vínculo deste aluno.')
  if (!link) throw new Error('Aluno não vinculado à sua conta.')
  if (link.status !== 'ATIVO') throw new Error('O acompanhamento está disponível para vínculos ativos.')

  const now = new Date()
  const window = followUpWindows(now)
  // Exact counts are independent of the Data API row limit and include only
  // completed sessions. Do not load students' prescriptions or photos here.
  const [last, week, month, assessment] = await Promise.all([
    db.from('sessoes_treino').select('id,titulo,inicio,fim').eq('aluno_id', alunoId)
      .eq('status', 'CONCLUIDO').lte('inicio', window.end)
      .order('inicio', { ascending: false }).limit(1).abortSignal(requestSignal),
    db.from('sessoes_treino').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoId)
      .eq('status', 'CONCLUIDO').gte('inicio', window.weekStart).lte('inicio', window.end).abortSignal(requestSignal),
    db.from('sessoes_treino').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoId)
      .eq('status', 'CONCLUIDO').gte('inicio', window.monthStart).lte('inicio', window.end).abortSignal(requestSignal),
    db.from('avaliacoes_fisicas').select('data').eq('aluno_id', alunoId).lte('data', localCalendarDate(now))
      .order('data', { ascending: false }).limit(1).abortSignal(requestSignal),
  ])
  if (last.error || week.error || month.error || assessment.error || week.count == null || month.count == null) {
    throw new Error('Não foi possível carregar o acompanhamento. Tente novamente.')
  }
  return {
    lastSession: ((last.data ?? []) as FollowUpSession[])[0] ?? null,
    completed7Days: week.count,
    completed30Days: month.count,
    latestAssessment: assessment.data?.[0]?.data ?? null,
    nextAssessment: link.proxima_avaliacao_em,
    asOf: window.end,
  }
}
