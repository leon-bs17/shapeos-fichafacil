'use client'

import { useAlunos } from '@/hooks/use-alunos'
import { Users } from 'lucide-react'
import styles from './mys-student-picker.module.css'

export type MysSelectedStudent = { id: string; name: string }
export function MysStudentPicker({ selected, locked, onSelect, onSummary }: {
  selected: MysSelectedStudent | null; locked: boolean;
  onSelect: (student: MysSelectedStudent | null) => void; onSummary: () => void
}) {
  const query = useAlunos()
  const students = query.data?.filter(student => student.status === 'ATIVO' && student.aluno_id) ?? []
  if (locked) return <section className={styles.context} aria-label="Aluno desta conversa"><strong>{selected ? `Aluno: ${selected.name}` : 'Conversa geral'}</strong><span>Nova conversa para trocar o aluno.{selected ? ' Dados atualizados a cada mensagem.' : ''}</span></section>
  return <section className={styles.picker} aria-label="Acompanhamento de aluno com a Mys">
    <div className={styles.field}><label htmlFor="mys-student">Aluno desta conversa</label>
      <select id="mys-student" value={selected?.id ?? ''} disabled={locked || query.isPending || query.isError} onChange={event => {
        const student = students.find(item => item.aluno_id === event.target.value)
        onSelect(student ? { id: student.aluno_id, name: student.nome } : null)
      }} aria-describedby="mys-student-note"><option value="">Conversa geral</option>
        {selected && !students.some(student => student.aluno_id === selected.id) && <option value={selected.id}>{selected.name}</option>}
        {students.map(student => <option key={student.vinculo_id} value={student.aluno_id}>{student.nome} · {student.email}</option>)}
      </select>
    </div>
    <button type="button" className={styles.summary} onClick={onSummary} disabled={locked || !selected || query.isError || query.isPending}><Users size={15} aria-hidden="true" />Resumir aluno</button>
    <p id="mys-student-note" className={styles.note}>{query.isPending ? 'Carregando seus alunos…' : locked ? 'Inicie uma nova conversa para trocar o aluno. O resumo é atualizado a cada mensagem.' : selected ? 'Prepare o resumo e envie a pergunta para consultar o acompanhamento.' : 'Selecione um aluno com vínculo ativo para consultar seu acompanhamento.'}</p>
    {query.isError && <div className={styles.error} role="alert"><span>Não foi possível carregar seus alunos.</span><button type="button" disabled={locked} onClick={() => void query.refetch()}>Tentar novamente</button></div>}
  </section>
}
