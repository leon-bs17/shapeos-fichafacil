'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useAnchoredPopover } from '@/components/ui/use-anchored-popover'
import { PersonalSearch } from '@/components/ui/personal-search'
import styles from './workout-select.module.css'

type Option = { value: string; label: string; group?: string }
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
export function WorkoutSelect({ id, label, value, options, disabled = false, searchable = false, className, onChange }: {
  id: string; label: string; value: string; options: Option[]; disabled?: boolean; searchable?: boolean; className?: string; onChange: (value: string) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null)
  const filtered = searchable && query.trim() ? options.filter(option => normalize(`${option.label} ${option.group ?? ''}`).includes(normalize(query.trim()))) : options
  const selected = Math.max(0, options.findIndex(option => option.value === value))
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
  useAnchoredPopover({ open: open && !disabled, trigger, panel, matchWidth: true, heightLimit: searchable ? 240 : 300, preferBelow: searchable, onHidden: () => setOpen(false) })
  useEffect(() => {
    if (!open || disabled) return
    if (searchable) search.current?.focus({ preventScroll: true }); else list.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, disabled, searchable])
  useEffect(() => {
    if (!open) return
    const container = list.current, option = container?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    if (!container || !option) return
    const row = option.getBoundingClientRect(), box = container.getBoundingClientRect()
    if (row.top < box.top) container.scrollTop -= box.top - row.top
    else if (row.bottom > box.bottom) container.scrollTop += row.bottom - box.bottom
  }, [open, active, query])
  const choose = (index: number) => { if (!filtered[index]) return; onChange(filtered[index].value); close() }
  return <div className={`${styles.root} ${className ?? ''}`} ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false) }}>
    <button type="button" id={id} ref={trigger} className={styles.trigger} disabled={disabled} aria-label={`${label}: ${options[selected]?.label ?? 'Selecione'}`} aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open && !disabled ? listId : undefined}
      onClick={() => { setQuery(''); setActive(selected); setOpen(previous => !previous) }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setQuery(''); setActive(selected); setOpen(true) } }}>
      <span>{options[selected]?.label ?? 'Selecione'}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && !disabled && <div ref={panel} className={styles.menu} popover="manual" style={{ visibility: 'hidden' }}
      onKeyDown={event => {
        const typing = event.target === search.current
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
        else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && filtered.length) { event.preventDefault(); if (typing) { setActive(0); list.current?.focus({ preventScroll: true }) } else setActive(index => (index + (event.key === 'ArrowDown' ? 1 : filtered.length - 1)) % filtered.length) }
        else if (!typing && (event.key === 'Home' || event.key === 'End')) { event.preventDefault(); setActive(event.key === 'Home' ? 0 : Math.max(0, filtered.length - 1)) }
        else if ((!typing && event.key === ' ') || event.key === 'Enter') { event.preventDefault(); choose(active) }
        else if (!typing && event.key.length === 1) { const index = filtered.findIndex(option => normalize(option.label).startsWith(normalize(event.key))); if (index >= 0) { event.preventDefault(); setActive(index) } }
      }}>
      {searchable && <div className={styles.search}><PersonalSearch ref={search} aria-label={`Buscar ${label.toLocaleLowerCase('pt-BR')}`} placeholder="Buscar exercício ou grupo muscular" value={query} onChange={event => { setQuery(event.target.value); setActive(0) }} /></div>}
      <div ref={list} id={listId} role="listbox" aria-label={label} aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined} tabIndex={-1} className={styles.options}>
        {filtered.map((option, index) => <div key={option.value} role="presentation">
          {option.group && option.group !== filtered[index - 1]?.group && <div className={styles.group} aria-hidden="true">{option.group}</div>}
          <button type="button" id={`${listId}-${index}`} data-index={index} role="option" aria-label={option.group ? `${option.label} — ${option.group}` : undefined} aria-selected={value === option.value} data-active={active === index} tabIndex={-1} onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <Check size={14} aria-hidden="true" />}</button>
        </div>)}
        {!filtered.length && <p className={styles.empty} role="status">Nenhum exercício encontrado.</p>}
      </div>
    </div>}
  </div>
}
