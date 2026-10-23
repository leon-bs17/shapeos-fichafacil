'use client'

import { useAlunos } from '@/hooks/use-alunos'
import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Users } from 'lucide-react'
import styles from './mys-student-picker.module.css'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR')

export type MysSelectedStudent = { id: string; name: string }
export function MysStudentPicker({ selected, locked, onSelect, onSummary }: {
  selected: MysSelectedStudent | null; locked: boolean;
  onSelect: (student: MysSelectedStudent | null) => void; onSummary: () => void
}) {
  const query = useAlunos()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const field = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const menuId = useId()
  const close = () => { setOpen(false); setSearch(''); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    searchInput.current?.focus()
    const outside = (event: PointerEvent) => {
      if (!field.current?.contains(event.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => { if (locked || query.isError || query.isPending) { setOpen(false); setSearch('') } }, [locked, query.isError, query.isPending])
  const students = query.data?.filter(student => student.status === 'ATIVO' && student.aluno_id) ?? []
  const filtered = students.filter(student => normalize(student.nome + ' ' + student.email).includes(normalize(search)))
  if (locked) return <section className={styles.context} aria-label="Aluno desta conversa"><strong>{selected ? `Aluno: ${selected.name}` : 'Conversa geral'}</strong><span>Nova conversa para trocar o aluno.{selected ? ' Dados atualizados a cada mensagem.' : ''}</span></section>
  return <section className={styles.picker} aria-label="Acompanhamento de aluno com a Mys">
    <div className={styles.field} ref={field}>
      <span id={menuId + '-label'} className={styles.label}>Aluno desta conversa</span>
      <button ref={trigger} type="button" className={styles.trigger} disabled={query.isPending || query.isError}
        aria-labelledby={menuId + '-label ' + menuId + '-value'} aria-describedby="mys-student-note"
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? menuId : undefined}
        onClick={() => { setOpen(value => !value); setSearch('') }}>
        <Users size={16} aria-hidden="true" /><span id={menuId + '-value'}>{selected?.name ?? 'Conversa geral'}</span><ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <div id={menuId} className={styles.menu} role="dialog" aria-labelledby={menuId + '-label'}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !trigger.current?.contains(event.relatedTarget as Node)) { setOpen(false); setSearch('') } }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, button'))
            const current = controls.indexOf(document.activeElement as HTMLElement)
            const next = event.key === 'ArrowDown' ? Math.min(current + 1, controls.length - 1) : Math.max(current - 1, 0)
            event.preventDefault(); controls[next]?.focus()
          }
        }}>
        <div className={styles.search}><Search size={15} aria-hidden="true" /><input ref={searchInput} type="search" aria-label="Buscar aluno por nome ou e-mail" placeholder="Buscar aluno…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className={styles.options}>
          {!search.trim() && <button type="button" className={styles.option} aria-pressed={!selected} onClick={() => { onSelect(null); close() }}><span><strong>Conversa geral</strong><small>Sem aluno selecionado</small></span>{!selected && <Check size={16} aria-hidden="true" />}</button>}
          {filtered.map(student =>
            <button type="button" className={styles.option} key={student.vinculo_id} aria-pressed={selected?.id === student.aluno_id} onClick={() => { onSelect({ id: student.aluno_id, name: student.nome }); close() }}><span><strong>{student.nome}</strong><small>{student.email}</small></span>{selected?.id === student.aluno_id && <Check size={16} aria-hidden="true" />}</button>)}
          {search.trim() && !filtered.length && <p className={styles.empty} role="status">Nenhum aluno encontrado.</p>}
        </div>
      </div>}
    </div>
    <button type="button" className={styles.summary} onClick={onSummary} disabled={locked || !selected || query.isError || query.isPending}><Users size={15} aria-hidden="true" />Resumir aluno</button>
    <p id="mys-student-note" className={styles.note}>{query.isPending ? 'Carregando seus alunos…' : locked ? 'Inicie uma nova conversa para trocar o aluno. O resumo é atualizado a cada mensagem.' : selected ? 'Prepare o resumo e envie a pergunta para consultar o acompanhamento.' : 'Selecione um aluno com vínculo ativo para consultar seu acompanhamento.'}</p>
    {query.isError && <div className={styles.error} role="alert"><span>Não foi possível carregar seus alunos.</span><button type="button" disabled={locked} onClick={() => void query.refetch()}>Tentar novamente</button></div>}
  </section>
}
