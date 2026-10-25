'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useAnchoredPopover } from '@/components/ui/use-anchored-popover'
import type { Assessment } from '@/services/fitness'
import styles from './personal-report.module.css'
export function StudentAssessmentPicker({ label, value, options, onChange }: { label: string; value: string; options: Assessment[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const id = useId(), field = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
  useAnchoredPopover({ open, trigger, panel: menu, matchWidth: true, heightLimit: 300, preferBelow: true, onHidden: () => setOpen(false) })
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!field.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const chosen = options.find(row => row.id === value)
  return <div className={styles.picker} ref={field}><span id={`${id}-label`} className={styles.label}>{label}</span>
    <button ref={trigger} type="button" className={styles.pickerTrigger} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(v => !v)}><span id={`${id}-value`}>{chosen ? new Date(`${chosen.data}T12:00:00`).toLocaleDateString('pt-BR') : 'Escolha a avaliação'}</span><ChevronDown size={15} aria-hidden="true" /></button>
    {open && <div ref={menu} popover="manual" style={{ visibility: 'hidden' }} id={id} role="dialog" aria-label={label} className={styles.pickerMenu} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !trigger.current?.contains(event.relatedTarget as Node)) setOpen(false) }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button')); const current = buttons.indexOf(document.activeElement as HTMLButtonElement); event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus() }
    }}><div className={styles.pickerOptions}>{options.map(row => <button type="button" key={row.id} aria-pressed={value === row.id} onClick={() => { onChange(row.id); close() }}><span>{new Date(`${row.data}T12:00:00`).toLocaleDateString('pt-BR')}</span>{value === row.id && <Check size={15} aria-hidden="true" />}</button>)}</div></div>}
  </div>
}
