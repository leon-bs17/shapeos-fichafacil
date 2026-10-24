'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Users } from 'lucide-react'
import { PersonalSearch } from '@/components/ui/personal-search'
import styles from './personal-report.module.css'

type Student = { aluno_id: string; nome: string; email: string }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
export function ReportStudentPicker({ students, value, onChange }: { students: Student[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState('')
  const field = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null)
  const id = useId()
  const selected = students.find(student => student.aluno_id === value)
  const close = () => { setOpen(false); setSearch(''); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const outside = (event: PointerEvent) => { if (!field.current?.contains(event.target as Node)) { setOpen(false); setSearch('') } }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const filtered = students.filter(student => normalize(student.nome + ' ' + student.email).includes(normalize(search)))
  return <div className={styles.picker} ref={field}>
    <span id={id + '-label'} className={styles.label}>Aluno</span>
    <button ref={trigger} className={styles.pickerTrigger} type="button" aria-labelledby={id + '-label ' + id + '-value'}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setOpen(state => !state); setSearch('') }}>
      {selected ? <span className={styles.avatar} aria-hidden="true">{selected.nome.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span> : <Users size={17} aria-hidden="true" />}
      <span id={id + '-value'}>{selected?.nome ?? 'Selecione o aluno…'}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id={id} role="dialog" aria-labelledby={id + '-label'} className={styles.pickerMenu}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !trigger.current?.contains(event.relatedTarget as Node)) { setOpen(false); setSearch('') } }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button'))
          const current = controls.indexOf(document.activeElement as HTMLElement)
          const next = event.key === 'ArrowDown' ? Math.min(current + 1, controls.length - 1) : Math.max(current - 1, 0)
          event.preventDefault(); controls[next]?.focus()
        }
      }}>
      <PersonalSearch ref={input} type="search" aria-label="Buscar aluno por nome ou e-mail" placeholder="Buscar aluno…" value={search} onChange={event => setSearch(event.target.value)} />
      <div className={styles.pickerOptions}>
        {filtered.map(student => <button type="button" key={student.aluno_id} aria-pressed={value === student.aluno_id}
          onClick={() => { onChange(student.aluno_id); close() }}><span><strong>{student.nome}</strong><small>{student.email}</small></span>{value === student.aluno_id && <Check size={15} aria-hidden="true" />}</button>)}
        {!filtered.length && <p role="status">Nenhum aluno encontrado.</p>}
      </div>
    </div>}
  </div>
}
