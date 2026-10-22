'use client'

import { useState } from 'react'
import { Copy, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useAlunos } from '@/hooks/use-alunos'
import { useAcoesFichas } from '@/hooks/use-fichas'
import type { FichaResumo } from '@/services/treinos'

function copyTitle(title: string) {
  let prefix = ''
  for (const character of title) {
    if (prefix.length + character.length > 72) break
    prefix += character
  }
  return `${prefix} (cópia)`
}

export function DuplicateWorkout({ ficha, onClose, onCreated, onReview }: {
  ficha: FichaResumo
  onClose: () => void
  onCreated: (copy: FichaResumo) => void
  onReview: (copy: FichaResumo, mode: 'exercicios' | 'prescricao') => void
}) {
  const students = useAlunos()
  const { duplicar } = useAcoesFichas()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState(() => copyTitle(ficha.titulo))
  const [error, setError] = useState('')
  const [created, setCreated] = useState<FichaResumo | null>(null)
  const activeStudents = (students.data ?? []).filter(student => student.status === 'ATIVO' && student.aluno_id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const alunoId = selectedId ?? (activeStudents.some(student => student.aluno_id === ficha.aluno_id) ? ficha.aluno_id : '')
  async function copy() {
    setError('')
    if (!activeStudents.some(student => student.aluno_id === alunoId)) { setError('Selecione um aluno com vínculo ativo.'); return }
    if (title.trim().length < 3 || title.trim().length > 80) { setError('Informe um título entre 3 e 80 caracteres.'); return }
    try {
      const result = await duplicar.mutateAsync({ fichaId: ficha.id, alunoId, titulo: title.trim() })
      setCreated(result)
      onCreated(result)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível duplicar a ficha.') }
  }
  return <Modal personal open onClose={() => { if (!duplicar.isPending) onClose() }} titulo={created ? 'Cópia criada' : 'Duplicar ficha'}>
    {created ? <div className="space-y-4">
      <div role="status" className="space-y-2"><h3>{created.titulo}</h3><p className="text-sm text-muted-foreground">Salva para {created.aluno_nome}.</p><span className="personal-status"><Pause size={12} aria-hidden="true" />Pausada para revisão</span></div>
      <p className="text-xs text-muted-foreground">Revise os exercícios, as cargas e as orientações para este aluno. A ativação fica disponível na lista de fichas.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onReview(created, 'exercicios')}>Revisar exercícios</Button><Button variant="outline" onClick={() => onReview(created, 'prescricao')}>Revisar prescrição</Button><Button variant="outline" onClick={onClose}>Concluir</Button></div>
    </div> : <div className="space-y-4" aria-busy={duplicar.isPending}>
      <div className="rounded-xl border border-border p-4 space-y-1"><p className="text-xs text-muted-foreground">Ficha de origem</p><h3 className="break-words">{ficha.titulo}</h3><p className="text-xs text-muted-foreground">{ficha.aluno_nome} · {ficha.itens.length} {ficha.itens.length === 1 ? 'exercício' : 'exercícios'}</p></div>
      {students.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando alunos…</p> : students.error ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Não foi possível carregar os alunos.</p><Button variant="outline" onClick={() => void students.refetch()}>Tentar novamente</Button></div> : !activeStudents.length ? <p className="text-sm text-muted-foreground">Você precisa de um aluno com vínculo ativo para duplicar esta ficha.</p> : <>
        <div className="space-y-1.5"><Label htmlFor="duplicate-student">Aluno de destino</Label><select id="duplicate-student" className="w-full" value={alunoId} disabled={duplicar.isPending} onChange={event => { setSelectedId(event.target.value); setError('') }}><option value="">Selecione o aluno…</option>{activeStudents.map(student => <option key={student.vinculo_id} value={student.aluno_id}>{student.nome}{student.aluno_id === ficha.aluno_id ? ' (mesmo aluno)' : ''}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="duplicate-title">Título da cópia</Label><Input id="duplicate-title" value={title} disabled={duplicar.isPending} maxLength={80} onChange={event => { setTitle(event.target.value); setError('') }} /></div>
        <p id="duplicate-note" className="text-xs text-muted-foreground">A cópia mantém exercícios e prescrição, começa pausada e sem validade definida. Revise a prescrição para o aluno escolhido antes de ativar.</p>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" disabled={duplicar.isPending} onClick={onClose}>Cancelar</Button><Button disabled={duplicar.isPending || students.isPending || Boolean(students.error) || !alunoId || !activeStudents.length} aria-describedby="duplicate-note" onClick={() => void copy()}><Copy size={15} aria-hidden="true" />{duplicar.isPending ? 'Duplicando…' : 'Criar cópia pausada'}</Button></div>
    </div>}
  </Modal>
}
