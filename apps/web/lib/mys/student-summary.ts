import type { SupabaseClient } from '@supabase/supabase-js'

export class MysSummaryError extends Error {
  constructor(public status: 403 | 503, message: string) { super(message) }
}
export async function readMysStudentSummary(db: SupabaseClient, personalId: string, studentId: string, signal: AbortSignal) {
  const now = new Date(), end = now.toISOString()
  const start7 = new Date(now.getTime() - 7 * 86400000).toISOString(), start30 = new Date(now.getTime() - 30 * 86400000).toISOString()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)!.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const { data: link, error: linkError } = await db.from('personal_alunos').select('aluno_id,proxima_avaliacao_em')
    .eq('personal_id', personalId).eq('aluno_id', studentId).eq('status', 'ATIVO').abortSignal(signal).maybeSingle()
  if (linkError) throw new MysSummaryError(503, 'Não foi possível verificar o vínculo do aluno.')
  if (!link) throw new MysSummaryError(403, 'Aluno não encontrado ou sem vínculo ativo com sua conta.')
  const [profile, week, month, last, workouts, assessments] = await Promise.all([
    db.from('usuarios').select('id,nome').eq('id', studentId).eq('tipo', 'ALUNO').abortSignal(signal).maybeSingle(),
    db.from('sessoes_treino').select('id', { count: 'exact', head: true }).eq('aluno_id', studentId).eq('status', 'CONCLUIDO').gte('inicio', start7).lte('inicio', end).abortSignal(signal),
    db.from('sessoes_treino').select('id', { count: 'exact', head: true }).eq('aluno_id', studentId).eq('status', 'CONCLUIDO').gte('inicio', start30).lte('inicio', end).abortSignal(signal),
    db.from('sessoes_treino').select('titulo,inicio,fim').eq('aluno_id', studentId).eq('status', 'CONCLUIDO').lte('inicio', end).order('inicio', { ascending: false }).order('id').limit(1).abortSignal(signal),
    db.from('treinos').select('id,titulo,valida_ate', { count: 'exact' }).eq('aluno_id', studentId).eq('personal_id', personalId).eq('ativo', true).order('valida_ate', { ascending: true, nullsFirst: false }).order('id').limit(20).abortSignal(signal),
    db.from('avaliacoes_fisicas').select('data,peso,cintura,quadril,braco').eq('aluno_id', studentId).lte('data', today).order('data', { ascending: false }).order('id').limit(5).abortSignal(signal),
  ])
  if ([profile, week, month, last, workouts, assessments].some(result => result.error) || week.count == null || month.count == null || workouts.count == null) throw new MysSummaryError(503, 'O acompanhamento está indisponível. Tente novamente; a falha não significa ausência de registros.')
  if (!profile.data) throw new MysSummaryError(403, 'Aluno não encontrado ou fora do seu acesso.')
  return {
    aluno: profile.data,
    periodo: { inicio7Dias: start7, inicio30Dias: start30, fim: end, criterio: 'Últimos 7 e 30 dias corridos (24 horas por dia), até o momento da consulta; apenas sessões concluídas. Não são dias de calendário.' },
    frequencia: { sessoesConcluidas7Dias: week.count, sessoesConcluidas30Dias: month.count, ultimaSessao: last.data?.[0] ?? null },
    fichasAtivas: workouts.data ?? [], totalFichasAtivas: workouts.count,
    avaliacoesRecentes: assessments.data ?? [], proximaAvaliacaoEm: link.proxima_avaliacao_em ?? null,
    limites: { fichasAtivas: 20, avaliacoes: 5, observacao: 'Avaliações ausentes e medidas nulas não equivalem a zero. As avaliações recentes não representam todo o histórico. Não há dados suficientes para concluir dor, adesão fora do app ou adequação da prescrição.' },
  }
}
