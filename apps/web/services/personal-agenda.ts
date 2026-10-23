import { createClient } from '@/lib/supabase/client'
import { localCalendarDate } from '@/lib/fitness/deadlines'
import { agendaEvents, weekWindow, type AgendaStudent, type AgendaSession, type PlannedWorkout } from '@/lib/fitness/personal-agenda'

interface StudentRow { id: string; nome: string; vinculos: { proxima_avaliacao_em: string | null }[]; avaliacoes: { data: string }[] }

export async function fetchPersonalAgenda(anchor: string, signal?: AbortSignal) {
  const week = weekWindow(anchor), now = new Date(), db = createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) throw new Error('Sessão expirada. Entre novamente.')
  const requestSignal = signal ?? new AbortController().signal
  const students: AgendaStudent[] = []
  for (;;) {
    const { data, error } = await db.from('usuarios').select(`id,nome,
      vinculos:personal_alunos!personal_alunos_aluno_id_fkey!inner(proxima_avaliacao_em),
      avaliacoes:avaliacoes_fisicas!avaliacoes_fisicas_aluno_id_fkey(data)`)
      .eq('vinculos.personal_id', user.id).eq('vinculos.status', 'ATIVO')
      .lte('avaliacoes.data', localCalendarDate(now))
      .order('data', { referencedTable: 'avaliacoes', ascending: false }).limit(1, { referencedTable: 'avaliacoes' })
      .order('id').range(students.length, students.length + 199).abortSignal(requestSignal)
    if (error || !data) throw new Error('Não foi possível carregar os alunos da agenda.')
    const rows = data as unknown as StudentRow[]
    if (!rows.length) break
    for (const row of rows) {
      if (!row.vinculos[0]) throw new Error('Vínculo indisponível. Atualize a agenda.')
      students.push({ id: row.id, name: row.nome, nextAssessment: row.vinculos[0].proxima_avaliacao_em, latestAssessment: row.avaliacoes[0]?.data ?? null })
    }
  }
  const planned: PlannedWorkout[] = [], sessions: AgendaSession[] = []
  // Small ID batches keep URLs bounded; every result is paginated independently.
  for (let batch = 0; batch < students.length; batch += 50) {
    const ids = students.slice(batch, batch + 50).map(student => student.id)
    for (let offset = 0; ;) {
      const { data, error } = await db.from('agenda_treino')
        .select('id,aluno_id,treino_id,data,ficha:treinos!agenda_treino_treino_id_fkey!inner(titulo,ativo,personal_id)')
        .in('aluno_id', ids).eq('ficha.personal_id', user.id).gte('data', week.start).lte('data', week.end)
        .order('id').range(offset, offset + 199).abortSignal(requestSignal)
      if (error || !data) throw new Error('Não foi possível carregar os treinos programados.')
      if (!data.length) break
      planned.push(...data as unknown as PlannedWorkout[])
      offset += data.length
    }
    for (let offset = 0; ;) {
      const { data, error } = await db.from('sessoes_treino')
        .select('id,aluno_id,treino_id,inicio,status,ficha:treinos!sessoes_treino_treino_id_fkey!inner(personal_id)')
        .in('aluno_id', ids).eq('ficha.personal_id', user.id)
        .gte('inicio', week.startIso).lt('inicio', week.endExclusiveIso).lte('inicio', now.toISOString())
        .order('id').range(offset, offset + 199).abortSignal(requestSignal)
      if (error || !data) throw new Error('Não foi possível conferir as sessões da semana.')
      if (!data.length) break
      sessions.push(...data as unknown as AgendaSession[])
      offset += data.length
    }
  }
  return { students: students.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), events: agendaEvents(students, planned, sessions, anchor, now), asOf: now.toISOString() }
}
