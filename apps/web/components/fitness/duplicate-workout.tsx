'use client'

import { useRef, useState } from 'react'
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

export type WorkoutReviewMode = 'exercicios' | 'prescricao'
export interface WorkoutCopyCallbacks {
  onClose: () => void
  onCreated: (copy: FichaResumo) => void
  onReview: (copy: FichaResumo, mode: WorkoutReviewMode) => void
}

export function DuplicateWorkout({ ficha, ...callbacks }: { ficha: FichaResumo } & WorkoutCopyCallbacks) {
  const { duplicar } = useAcoesFichas()
  return <PausedWorkoutCopy {...callbacks} heading="Duplicar ficha" sourceLabel="Ficha de origem" sourceTitle={ficha.titulo} sourceDescription={ficha.aluno_nome} itemCount={ficha.itens.length} initialTitle={copyTitle(ficha.titulo)} initialStudentId={ficha.aluno_id} pending={duplicar.isPending} create={({ alunoId, titulo }) => duplicar.mutateAsync({ fichaId: ficha.id, alunoId, titulo })} />
}

export function PausedWorkoutCopy({ heading, sourceLabel, sourceTitle, sourceDescription, itemCount, initialTitle, initialStudentId = '', pending: mutationPending, create, ...callbacks }: {
  heading: string
  sourceLabel: string
  sourceTitle: string
  sourceDescription?: string
  itemCount: number
  initialTitle: string
  initialStudentId?: string
  pending: boolean
  create: (input: { alunoId: string; titulo: string }) => Promise<FichaResumo>
} & WorkoutCopyCallbacks) {
  const { onClose, onCreated, onReview } = callbacks
  const students = useAlunos()
  const inFlight = useRef(false)
  const [saving, setSaving] = useState(false)
  const pending = mutationPending || saving
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<FichaResumo | null>(null)
  const activeStudents = (students.data ?? []).filter(student => student.status === 'ATIVO' && student.aluno_id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const alunoId = selectedId ?? (activeStudents.some(student => student.aluno_id === initialStudentId) ? initialStudentId : '')
  async function copy() {
    if (inFlight.current || mutationPending) return
    setError('')
    if (!activeStudents.some(student => student.aluno_id === alunoId)) { setError('Selecione um aluno com vínculo ativo.'); return }
    if (title.trim().length < 3 || title.trim().length > 80) { setError('Informe um título entre 3 e 80 caracteres.'); return }
    inFlight.current = true
    setSaving(true)
    try {
      const result = await create({ alunoId, titulo: title.trim() })
      setCreated(result)
      onCreated(result)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível duplicar a ficha.') }
    finally { inFlight.current = false; setSaving(false) }
  }
  return <Modal personal open onClose={() => { if (!pending) onClose() }} titulo={created ? 'Cópia criada' : heading}>
    {created ? <div className="space-y-4">
      <div role="status" className="space-y-2"><h3>{created.titulo}</h3><p className="text-sm text-muted-foreground">Salva para {created.aluno_nome}.</p><span className="personal-status"><Pause size={12} aria-hidden="true" />Pausada para revisão</span></div>
      <p className="text-xs text-muted-foreground">Revise os exercícios, as cargas e as orientações para este aluno. A ativação fica disponível na lista de fichas.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onReview(created, 'exercicios')}>Revisar exercícios</Button><Button variant="outline" onClick={() => onReview(created, 'prescricao')}>Revisar prescrição</Button><Button variant="outline" onClick={onClose}>Concluir</Button></div>
    </div> : <div className="space-y-4" aria-busy={pending}>
      <div className="rounded-xl border border-border p-4 space-y-1"><p className="text-xs text-muted-foreground">{sourceLabel}</p><h3 className="break-words">{sourceTitle}</h3><p className="text-xs text-muted-foreground">{sourceDescription ? `${sourceDescription} · ` : ''}{itemCount} {itemCount === 1 ? 'exercício' : 'exercícios'}</p></div>
      {students.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando alunos…</p> : students.error ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Não foi possível carregar os alunos.</p><Button variant="outline" onClick={() => void students.refetch()}>Tentar novamente</Button></div> : !activeStudents.length ? <p className="text-sm text-muted-foreground">Você precisa de um aluno com vínculo ativo para duplicar esta ficha.</p> : <>
        <div className="space-y-1.5"><Label htmlFor="duplicate-student">Aluno de destino</Label><select id="duplicate-student" className="w-full" value={alunoId} disabled={pending} onChange={event => { setSelectedId(event.target.value); setError('') }}><option value="">Selecione o aluno…</option>{activeStudents.map(student => <option key={student.vinculo_id} value={student.aluno_id}>{student.nome}{sourceDescription && student.aluno_id === initialStudentId ? ' (mesmo aluno)' : ''}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="duplicate-title">Título da cópia</Label><Input id="duplicate-title" value={title} disabled={pending} maxLength={80} onChange={event => { setTitle(event.target.value); setError('') }} /></div>
        <p id="duplicate-note" className="text-xs text-muted-foreground">A cópia mantém exercícios e prescrição, começa pausada e sem validade definida. Revise a prescrição para o aluno escolhido antes de ativar.</p>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button disabled={pending || students.isPending || Boolean(students.error) || !alunoId || !activeStudents.length} aria-describedby="duplicate-note" onClick={() => void copy()}><Copy size={15} aria-hidden="true" />{pending ? 'Duplicando…' : 'Criar cópia pausada'}</Button></div>
    </div>}
  </Modal>
}

