export type AttentionKind = 'inatividade' | 'ficha' | 'avaliacao'

export interface StudentAttentionSnapshot {
  aluno_id: string
  nome: string
  vinculado_em: string
  ultima_sessao: string | null
  tem_ficha_ativa: boolean
  tem_avaliacao: boolean
}

export interface StudentAttention extends StudentAttentionSnapshot {
  motivos: AttentionKind[]
  dias_sem_sessao: number
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
    if (days >= INACTIVITY_DAYS) motivos.push('inatividade')
    if (!student.tem_ficha_ativa) motivos.push('ficha')
    if (!student.tem_avaliacao) motivos.push('avaliacao')
    if (motivos.length) result.push({ ...student, motivos, dias_sem_sessao: days })
  }
  return result.sort((a, b) => b.dias_sem_sessao - a.dias_sem_sessao || b.motivos.length - a.motivos.length || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function studentReportHref(id: string, tab: 'evolucao' | 'avaliacao' = 'evolucao') {
  return `/relatorios?${new URLSearchParams({ aluno: id, aba: tab })}`
}

export function resolveLinkedStudent(requested: string | null, students: { aluno_id: string }[]) {
  return requested && students.some(student => student.aluno_id === requested) ? requested : ''
}
