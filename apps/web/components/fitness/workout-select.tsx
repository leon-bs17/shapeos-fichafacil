'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useAnchoredPopover } from '@/components/ui/use-anchored-popover'
import styles from './workout-select.module.css'

export function WorkoutSelect({ id, label, value, options, disabled = false, onChange }: {
  id: string; label: string; value: string; options: { value: string; label: string }[]; disabled?: boolean; onChange: (value: string) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null)
  const selected = Math.max(0, options.findIndex(option => option.value === value))
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
  useAnchoredPopover({ open: open && !disabled, trigger, panel, matchWidth: true, heightLimit: 300, onHidden: () => setOpen(false) })
  useEffect(() => {
    if (!open || disabled) return
    panel.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, disabled])
  useEffect(() => { if (open) panel.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [open, active])
  const choose = (index: number) => { if (!options[index]) return; onChange(options[index].value); close() }
  return <div className={styles.root} ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false) }}>
    <button type="button" id={id} ref={trigger} className={styles.trigger} disabled={disabled} aria-label={`${label}: ${options[selected]?.label ?? 'Selecione'}`} aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open && !disabled ? listId : undefined}
      onClick={() => { setActive(selected); setOpen(previous => !previous) }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(selected); setOpen(true) } }}>
      <span>{options[selected]?.label ?? 'Selecione'}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && !disabled && <div ref={panel} id={listId} role="listbox" aria-label={label} aria-activedescendant={`${listId}-${active}`} tabIndex={-1} className={styles.menu} popover="manual" style={{ visibility: 'hidden' }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(index => (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length) }
        else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1) }
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active) }
        else if (event.key.length === 1) { const index = options.findIndex(option => option.label.toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR'))); if (index >= 0) { event.preventDefault(); setActive(index) } }
      }}>
      {options.map((option, index) => <button type="button" key={option.value} id={`${listId}-${index}`} data-index={index} role="option" aria-selected={value === option.value} data-active={active === index} tabIndex={-1} onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <Check size={14} aria-hidden="true" />}</button>)}
    </div>}
  </div>
}
