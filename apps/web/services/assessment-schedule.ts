import { createClient } from '@/lib/supabase/client'
import { calendarDaysUntil } from '@/lib/fitness/deadlines'

export async function getAssessmentSchedule(alunoId: string): Promise<string | null> {
  const db = createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão expirada')
  const { data, error } = await db.from('personal_alunos')
    .select('proxima_avaliacao_em').eq('personal_id', user.id).eq('aluno_id', alunoId).eq('status', 'ATIVO').single()
  if (error) throw new Error('Não foi possível consultar a próxima avaliação deste vínculo.')
  return data.proxima_avaliacao_em
}

export async function saveAssessmentSchedule(alunoId: string, date: string | null) {
  if (date !== null && calendarDaysUntil(date) == null) throw new Error('Informe uma data válida.')
  const { error } = await createClient().rpc('agendar_avaliacao_shapeos', { p_aluno_id: alunoId, p_data: date })
  if (error) throw new Error(error.code === '42501' ? 'Somente o Personal com vínculo ativo pode agendar esta avaliação.' : 'Não foi possível salvar a próxima avaliação. Tente novamente.')
}
