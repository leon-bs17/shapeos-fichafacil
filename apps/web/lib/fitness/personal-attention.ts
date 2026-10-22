import { assessmentDeadline, workoutDeadline } from '@/lib/fitness/deadlines'

export type AttentionKind = 'inatividade' | 'ficha' | 'avaliacao' | 'vencimento'

export interface StudentAttentionSnapshot {
  aluno_id: string
  nome: string
  vinculado_em: string
  ultima_sessao: string | null
  tem_ficha_ativa: boolean
  tem_avaliacao: boolean
  valida_ate?: string | null
  titulo_ficha?: string | null
  proxima_avaliacao_em?: string | null
  ultima_avaliacao?: string | null
}

export interface StudentAttention extends StudentAttentionSnapshot {
  motivos: AttentionKind[]
  dias_sem_sessao: number
  prazo_ficha: ReturnType<typeof workoutDeadline>
  prazo_avaliacao: ReturnType<typeof assessmentDeadline>
}

const DAY = 86_400_000
export const INACTIVITY_DAYS = 7

export function buildStudentAttention(students: StudentAttentionSnapshot[], now = new Date()): StudentAttention[] {
  const seen = new Set<string>()
  const result: StudentAttention[] = []
  for (const student of students) {
    if (!student.aluno_id || seen.has(student.aluno_id)) continue
    seen.add(student.aluno_id)
    // A new relationship starts its own grace period, even with older sessions.
    const linked = Date.parse(student.vinculado_em)
    const last = student.ultima_sessao ? Date.parse(student.ultima_sessao) : linked
    const elapsed = now.getTime() - Math.max(linked, last)
    const days = Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / DAY)) : 0
    const motivos: AttentionKind[] = []
    const prazo_ficha = workoutDeadline(student.valida_ate, now)
    const prazo_avaliacao = assessmentDeadline(student.proxima_avaliacao_em, student.ultima_avaliacao, now)
    if (days >= INACTIVITY_DAYS) motivos.push('inatividade')
    if (!student.tem_ficha_ativa) motivos.push('ficha')
    if (!student.tem_avaliacao || prazo_avaliacao?.pending) motivos.push('avaliacao')
    if (prazo_ficha?.warning) motivos.push('vencimento')
    if (motivos.length) result.push({ ...student, motivos, dias_sem_sessao: days, prazo_ficha, prazo_avaliacao })
  }
  const priority = (row: StudentAttention) => row.prazo_avaliacao?.pending || (row.prazo_ficha && row.prazo_ficha.days < 0) ? 2 : row.prazo_ficha?.warning ? 1 : 0
  return result.sort((a, b) => priority(b) - priority(a) || b.dias_sem_sessao - a.dias_sem_sessao || b.motivos.length - a.motivos.length || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function studentReportHref(id: string, tab: 'evolucao' | 'avaliacao' = 'evolucao') {
  return `/relatorios?${new URLSearchParams({ aluno: id, aba: tab })}`
}

export function resolveLinkedStudent(requested: string | null, students: { aluno_id: string }[]) {
  return requested && students.some(student => student.aluno_id === requested) ? requested : ''
}

