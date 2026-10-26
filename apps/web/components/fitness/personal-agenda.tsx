'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, ClipboardCheck, ArrowUpRight, NotebookPen, Plus, ChevronDown, Check, Eye } from 'lucide-react'
import { useAnchoredPopover } from '@/components/ui/use-anchored-popover'
import { Button } from '@/components/ui/button'
import { AgendaDatePicker } from './agenda-date-picker'
import { localCalendarDate, formatCalendarDate } from '@/lib/fitness/deadlines'
import { moveWeek, weekWindow } from '@/lib/fitness/personal-agenda'
import { fetchPersonalAgenda } from '@/services/personal-agenda'
import styles from './personal-agenda.module.css'
import { PersonalBannerWireframe } from '@/components/layout/personal-banner-wireframe'
import { ShapeosBanner } from '@/components/layout/shapeos-banner'
import { fitnessRequest } from '@/lib/api/client'
import { mergeReminderEvents,type PersonalReminder } from '@/lib/fitness/personal-reminders'
import { ReminderActions,ReminderEditor } from './personal-reminders'

function AgendaFilter({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const field = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
  useAnchoredPopover({ open, trigger, panel: menu, matchWidth: true, heightLimit: 300, onHidden: () => setOpen(false) })
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!field.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div className={styles.filter} ref={field} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false) }}>
    <button id={id} type="button" ref={trigger} className={styles.filterTrigger} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} onClick={() => setOpen(previous => !previous)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) } }}><span id={`${id}-value`}>{options.find(option => option.value === value)?.label ?? options[0]?.label}</span><ChevronDown size={15} aria-hidden="true" /></button>
    {open && <div popover="manual" style={{ visibility: 'hidden' }} id={`${id}-options`} ref={menu} className={styles.filterMenu} role="listbox" aria-label={label} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'))
      const current = controls.indexOf(document.activeElement as HTMLButtonElement)
      let next = current
      if (event.key === 'ArrowDown') next = (current + 1) % controls.length
      else if (event.key === 'ArrowUp') next = (current - 1 + controls.length) % controls.length
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = controls.length - 1
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
        const matches = controls.findIndex((control, index) => index > current && control.textContent?.trim().toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR')))
        next = matches >= 0 ? matches : controls.findIndex(control => control.textContent?.trim().toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR')))
      } else return
      if (next >= 0) { event.preventDefault(); controls[next]?.focus() }
    }}>{options.map(option => <button type="button" key={option.value} role="option" aria-selected={value === option.value} tabIndex={value === option.value ? 0 : -1} onClick={() => { onChange(option.value); close() }}><span>{option.label}</span>{value === option.value && <Check size={14} aria-hidden="true" />}</button>)}</div>}
  </div>
}

export function PersonalAgenda() {
  const [anchor, setAnchor] = useState(() => localCalendarDate())
  const [student, setStudent] = useState(''), [kind, setKind] = useState('todos')
  const [editor,setEditor] = useState<PersonalReminder | 'new' | null>(null)
  const week = weekWindow(anchor)
  const query = useQuery({ queryKey: ['personal-weekly-agenda', week.start], queryFn: ({ signal }) => fetchPersonalAgenda(week.start, signal) })
  const reminders = useQuery({ queryKey: ['personal-reminders',week.start], queryFn: () => fitnessRequest<PersonalReminder[]>(`/api/lembretes?semana=${week.start}`), gcTime: 0 })
  const events = mergeReminderEvents(query.data?.events ?? [],reminders.data ?? [],localCalendarDate()).filter(event => (!student || event.studentId === student) && (kind === 'todos' || event.kind === kind))
  const today = localCalendarDate()
  return <div className={styles.agenda}>
    <ShapeosBanner titleId="personal-agenda-title" eyebrow="Agenda do Personal"
      title={<>Organize a <span>semana</span> dos seus alunos</>}
      description="Acompanhe treinos, avaliações e lembretes em um só lugar."
      art={<PersonalBannerWireframe variant="agenda"/>} />
    {!query.isError && query.data && reminders.isSuccess && (
      <dl className={styles.metrics}>
        {[{ label: 'Treinos na semana', value: events.filter(event => event.kind === 'treino').length, icon: Dumbbell },
          { label: 'Avaliações na semana', value: events.filter(event => event.kind === 'avaliacao').length, icon: ClipboardCheck },
          { label: 'Lembretes pendentes', value: events.filter(event => event.kind === 'lembrete' && !event.complete).length, icon: NotebookPen },
          { label: 'Dias com compromissos', value: new Set(events.map(event => event.date)).size, icon: CalendarDays }].map(({label,value,icon:Icon}) => <div key={label}><span className={styles.metricIcon} aria-hidden="true"><Icon size={24} /></span><div><dt>{label}</dt><dd>{value}</dd></div></div>)}
      </dl>
    )}
    <section className={styles.toolbar} aria-label="Filtros da agenda">
      <div className={styles.weekControl}>
        <div className={styles.navigation}>
          <Button variant="outline" onClick={() => setAnchor(moveWeek(anchor, -1))} aria-label="Semana anterior"><ChevronLeft size={17} /></Button>
          <p aria-live="polite"><strong>{formatCalendarDate(week.start)} a {formatCalendarDate(week.end)}</strong><span>Segunda a domingo · sem horário definido</span></p>
          <Button variant="outline" onClick={() => setAnchor(moveWeek(anchor, 1))} aria-label="Próxima semana"><ChevronRight size={17} /></Button>
        </div>
        <Button variant="outline" onClick={() => setAnchor(today)}>Semana atual</Button>
      </div>
      <div className={styles.filters}>
        <div><label htmlFor="agenda-week-date">Ir para a semana de</label><AgendaDatePicker id="agenda-week-date" label="Ir para a semana de" value={anchor} align="start" onChange={date => { if (date) setAnchor(date) }} /></div>
        <div><label id="agenda-student-label" htmlFor="agenda-student">Aluno</label><AgendaFilter id="agenda-student" label="Aluno" value={student} onChange={setStudent} options={[{ value: '', label: 'Todos os alunos' }, ...(query.data?.students.map(item => ({ value: item.id, label: item.name })) ?? [])]} /></div>
        <div><label id="agenda-kind-label" htmlFor="agenda-kind">Compromisso</label><AgendaFilter id="agenda-kind" label="Compromisso" value={kind} onChange={setKind} options={[{ value: 'todos', label: 'Todos' }, { value: 'treino', label: 'Treinos' }, { value: 'avaliacao', label: 'Avaliações' }, { value: 'lembrete', label: 'Lembretes pessoais' }]} /></div>
      </div>
      <div className={styles.toolbarFooter}>
        <p className={styles.note}>Agende ou remarque treinos e avaliações em Relatórios. Lembretes pessoais aparecem em “Todos os alunos”.</p>
      <div className={styles.toolbarActions}><Link href="/relatorios" className="personal-command">Planejar em Relatórios <ArrowUpRight size={15} aria-hidden="true" /></Link><Button variant="outline" onClick={()=>setEditor('new')}><Plus size={15} aria-hidden="true"/>Novo lembrete</Button></div>
      </div>
    </section>
    {query.isPending && <p role="status" className={styles.notice}>Carregando agenda…</p>}
    {query.isError && <div role="alert" className={styles.error}><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
    {reminders.isPending && <p role="status" className={styles.notice}>Carregando lembretes…</p>}
    {reminders.isError && <div role="alert" className={styles.error}><p>Não foi possível carregar seus lembretes.</p><Button variant="outline" onClick={()=>void reminders.refetch()}>Recarregar lembretes</Button></div>}
    {!query.isError && query.data && reminders.isSuccess && <>
      <p className={styles.note} aria-live="polite">{events.length} {events.length === 1 ? 'compromisso nesta semana' : 'compromissos nesta semana'} com os filtros selecionados.</p>
      {!events.length && <p className={styles.notice}>Nenhum compromisso nesta semana com esses filtros.</p>}
      <div className={styles.days}>
        {week.days.map(date => {
          const items = events.filter(event => event.date === date)
          const day = new Date(`${date}T12:00:00`)
          return <section key={date} className={styles.day} aria-label={formatCalendarDate(date)} data-today={date === today}>
            <header><div><strong>{day.toLocaleDateString('pt-BR', { weekday: 'long' })}</strong><span>{formatCalendarDate(date)}{date === today ? ' · Hoje' : ''}</span></div><span>{items.length}</span></header>
            {!items.length ? <p className={styles.empty}>Sem compromissos</p> : <ul>
              {items.map(event => <li key={event.id}><div className={styles.event}>
                <span className={styles.eventIcon}>{event.kind === 'treino' ? <Dumbbell size={17} aria-hidden="true" /> : event.kind === 'lembrete' ? <NotebookPen size={17} aria-hidden="true" /> : <ClipboardCheck size={17} aria-hidden="true" />}</span>
                <div className={styles.identity}><strong>{event.kind === 'lembrete' ? event.title : event.studentName}</strong><p className={event.kind === 'lembrete' ? styles.reminderDescription : undefined}>{event.kind === 'lembrete' ? event.reminder.descricao || 'Lembrete pessoal' : event.title}</p><span className={styles.status} data-complete={event.complete}>{event.state}</span></div>
                {event.kind !== 'lembrete' && <Link href={event.href} className={styles.open} aria-label={`${event.kind === 'treino' ? 'Planejar treino' : 'Ver avaliação'} de ${event.studentName}`}><Eye size={14} aria-hidden="true" /> Ver</Link>}
              </div>{event.kind === 'lembrete' && <ReminderActions reminder={event.reminder} onEdit={()=>setEditor(event.reminder)}/>}</li>)}
            </ul>}
          </section>
        })}
      </div>
    </>}
    {editor && <ReminderEditor key={editor === 'new' ? `new:${week.start}` : editor.id} reminder={editor === 'new' ? undefined : editor} defaultDate={anchor} onClose={()=>setEditor(null)} onSaved={date=>{setAnchor(date);setStudent('');if(kind==='treino'||kind==='avaliacao')setKind('todos');setEditor(null)}}/>}
  </div>
}

