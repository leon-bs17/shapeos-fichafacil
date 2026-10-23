'use client'

import { useState } from 'react'
import { BookOpen, Dumbbell, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useWorkoutModels, useWorkoutModelActions } from '@/hooks/use-workout-models'
import type { FichaResumo } from '@/services/treinos'
import type { WorkoutModel } from '@/services/workout-models'
import { PausedWorkoutCopy, type WorkoutCopyCallbacks } from './duplicate-workout'

export function SaveWorkoutModel({ ficha, onClose, onSaved }: { ficha: FichaResumo; onClose: () => void; onSaved: (model: WorkoutModel) => void }) {
  const { save } = useWorkoutModelActions()
  const [title, setTitle] = useState(ficha.titulo)
  const [error, setError] = useState('')
  async function submit() {
    setError('')
    if (title.trim().length < 3 || title.trim().length > 80) { setError('Informe um nome entre 3 e 80 caracteres.'); return }
    try { const model = await save.mutateAsync({ fichaId: ficha.id, titulo: title.trim() }); onSaved(model); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar o modelo.') }
  }
  return <Modal personal open titulo="Salvar como modelo" onClose={() => { if (!save.isPending) onClose() }}>
    <div className="space-y-4" aria-busy={save.isPending}><p className="text-xs text-muted-foreground">Guarde os exercícios e a prescrição desta ficha para reutilizar com seus alunos. O modelo é privado da sua conta e não inclui vínculos ou histórico de treinos.</p>
      <div className="space-y-1.5"><Label htmlFor="workout-model-name">Nome do modelo</Label><Input id="workout-model-name" value={title} maxLength={80} disabled={save.isPending} onChange={event => { setTitle(event.target.value); setError('') }} /></div>
      <p className="text-xs text-muted-foreground">Alterar ou excluir a ficha original depois não muda este modelo. Revise as orientações ao utilizá-lo com outro aluno.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button><Button onClick={() => void submit()} disabled={save.isPending || !ficha.itens.length}><BookOpen size={15} aria-hidden="true" />{save.isPending ? 'Salvando…' : 'Salvar modelo'}</Button></div>
    </div>
  </Modal>
}

export function WorkoutModelsLibrary({ onClose, onUse }: { onClose: () => void; onUse: (model: WorkoutModel) => void }) {
  const query = useWorkoutModels()
  const { remove } = useWorkoutModelActions()
  const [confirmId, setConfirmId] = useState('')
  const models = [...new Map(query.data?.pages.flatMap(page => page.modelos).map(model => [model.id, model] as const) ?? []).values()]
  async function removeModel(id: string) {
    try { await remove.mutateAsync(id); setConfirmId('') } catch { /* Mutation state displays the error without hiding the library. */ }
  }
  return <Modal personal open titulo="Meus modelos" className="max-w-2xl" onClose={() => { if (!remove.isPending) onClose() }}>
    <div className="space-y-4"><p className="text-xs text-muted-foreground">Use um modelo para criar uma ficha pausada e revisar a prescrição para o aluno escolhido. Excluir um modelo mantém as fichas já criadas a partir dele.</p>
      {query.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando modelos…</p> : query.isError && !models.length ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Não foi possível carregar os modelos.</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : !models.length ? <div className="rounded-xl border border-border p-5 text-center space-y-2"><BookOpen size={24} className="mx-auto text-muted-foreground" aria-hidden="true" /><h3>Nenhum modelo salvo</h3><p className="text-xs text-muted-foreground">Na lista de fichas, escolha “Salvar modelo” para começar.</p></div> : <>
        <p className="personal-results-note">{models.length} {models.length === 1 ? 'modelo carregado' : 'modelos carregados'}</p>
        <ul className="space-y-3">{models.map(model => <li key={model.id} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex flex-wrap items-start gap-3"><Dumbbell size={20} className="shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0 flex-1"><h3 className="break-words">{model.titulo}</h3><p className="mt-1 text-xs text-muted-foreground">{model.quantidade_exercicios} {model.quantidade_exercicios === 1 ? 'exercício' : 'exercícios'} · Salvo em {new Date(model.criado_em).toLocaleDateString('pt-BR')}</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><Button variant="outline" disabled={remove.isPending} onClick={() => onUse(model)}>Usar modelo</Button><Button className="personal-danger" variant="outline" disabled={remove.isPending} onClick={() => { setConfirmId(model.id); remove.reset() }} aria-label={`Excluir modelo ${model.titulo}`} data-shapeos-tooltip="Excluir modelo"><Trash2 size={15} aria-hidden="true" /></Button></div></div>
          {confirmId === model.id && <div className="border-t border-border pt-3 space-y-3"><p className="text-xs text-muted-foreground">Excluir este modelo? As fichas já criadas serão mantidas.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={remove.isPending} onClick={() => { setConfirmId(''); remove.reset() }}>Cancelar</Button><Button className="personal-danger" variant="outline" disabled={remove.isPending} onClick={() => void removeModel(model.id)}>{remove.isPending ? 'Excluindo…' : 'Excluir modelo'}</Button></div></div>}
        </li>)}</ul>
        {query.hasNextPage && <Button variant="outline" disabled={query.isFetchingNextPage || query.isRefetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais modelos'}</Button>}
        {query.isError && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">Não foi possível atualizar todos os modelos.</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
      </>}
      {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
    </div>
  </Modal>
}

export function ApplyWorkoutModel({ model, initialStudentId, ...callbacks }: { model: WorkoutModel; initialStudentId?: string } & WorkoutCopyCallbacks) {
  const { apply } = useWorkoutModelActions()
  return <PausedWorkoutCopy {...callbacks} heading="Usar modelo de treino" sourceLabel="Modelo de origem" sourceTitle={model.titulo} itemCount={model.quantidade_exercicios} initialTitle={model.titulo} initialStudentId={initialStudentId} pending={apply.isPending} create={({ alunoId, titulo }) => apply.mutateAsync({ id: model.id, alunoId, titulo })} />
}
