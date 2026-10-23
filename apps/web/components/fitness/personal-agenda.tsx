'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, ClipboardCheck, ArrowUpRight, NotebookPen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { localCalendarDate, formatCalendarDate } from '@/lib/fitness/deadlines'
import { moveWeek, weekWindow } from '@/lib/fitness/personal-agenda'
import { fetchPersonalAgenda } from '@/services/personal-agenda'
import styles from './personal-agenda.module.css'
import { fitnessRequest } from '@/lib/api/client'
import { mergeReminderEvents,type PersonalReminder } from '@/lib/fitness/personal-reminders'
import { ReminderActions,ReminderEditor } from './personal-reminders'

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
        <div><label htmlFor="agenda-week-date">Ir para a semana de</label><input id="agenda-week-date" type="date" value={anchor} onChange={event => { if (event.target.value) setAnchor(event.target.value) }} /></div>
        <div><label htmlFor="agenda-student">Aluno</label><select id="agenda-student" value={student} onChange={event => setStudent(event.target.value)}><option value="">Todos os alunos</option>{query.data?.students.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div><label htmlFor="agenda-kind">Compromisso</label><select id="agenda-kind" value={kind} onChange={event => setKind(event.target.value)}><option value="todos">Todos</option><option value="treino">Treinos</option><option value="avaliacao">Avaliações</option><option value="lembrete">Lembretes pessoais</option></select></div>
      </div>
      <p className={styles.note}>Treinos das suas fichas e próxima avaliação dos alunos com vínculo ativo. Para agendar ou remarcar, abra o acompanhamento do aluno em Relatórios.</p>
      <p className={styles.note}>Lembretes pessoais aparecem com o filtro “Todos os alunos”.</p>
      <div className={styles.toolbarActions}><Link href="/relatorios" className="personal-command">Planejar em Relatórios <ArrowUpRight size={15} aria-hidden="true" /></Link><Button variant="outline" onClick={()=>setEditor('new')}><Plus size={15} aria-hidden="true"/>Novo lembrete</Button></div>
    </section>
    {query.isPending && <p role="status" className={styles.notice}>Carregando agenda…</p>}
    {query.isError && <div role="alert" className={styles.error}><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
    {reminders.isPending && <p role="status" className={styles.notice}>Carregando lembretes…</p>}
    {reminders.isError && <div role="alert" className={styles.error}><p>Não foi possível carregar seus lembretes.</p><Button variant="outline" onClick={()=>void reminders.refetch()}>Recarregar lembretes</Button></div>}
    {!query.isError && query.data && reminders.isSuccess && <>
      <dl className={styles.metrics}>
        {[{ label: 'Treinos na semana', value: events.filter(event => event.kind === 'treino').length, icon: Dumbbell },
          { label: 'Avaliações na semana', value: events.filter(event => event.kind === 'avaliacao').length, icon: ClipboardCheck },
          { label: 'Lembretes pendentes', value: events.filter(event => event.kind === 'lembrete' && !event.complete).length, icon: NotebookPen },
          { label: 'Dias com compromissos', value: new Set(events.map(event => event.date)).size, icon: CalendarDays }].map(({label,value,icon:Icon}) => <div key={label}><dt><Icon size={16} aria-hidden="true" />{label}</dt><dd>{value}</dd></div>)}
      </dl>
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
                {event.kind !== 'lembrete' && <Link href={event.href} className={styles.open} aria-label={`${event.kind === 'treino' ? 'Planejar treino' : 'Ver avaliação'} de ${event.studentName}`}>Ver <ArrowUpRight size={14} aria-hidden="true" /></Link>}
              </div>{event.kind === 'lembrete' && <ReminderActions reminder={event.reminder} onEdit={()=>setEditor(event.reminder)}/>}</li>)}
            </ul>}
          </section>
        })}
      </div>
    </>}
    {editor && <ReminderEditor key={editor === 'new' ? `new:${week.start}` : editor.id} reminder={editor === 'new' ? undefined : editor} defaultDate={anchor} onClose={()=>setEditor(null)} onSaved={date=>{setAnchor(date);setStudent('');if(kind==='treino'||kind==='avaliacao')setKind('todos');setEditor(null)}}/>}
  </div>
}

