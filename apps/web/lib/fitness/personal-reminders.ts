import type { PersonalAgendaEvent } from './personal-agenda'
import { calendarDaysUntil } from './deadlines'
export interface PersonalReminder { id: string; titulo: string; descricao: string; data: string; concluido: boolean; concluido_em: string | null }
export interface ReminderFields { titulo: string; descricao: string; data: string }
export function parseReminderFields(body: unknown): ReminderFields {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Revise o lembrete.')
  const value = body as Record<string,unknown>
  if (Object.keys(value).some(key => !['titulo','descricao','data'].includes(key)) || typeof value.titulo !== 'string' || typeof value.descricao !== 'string' || typeof value.data !== 'string') throw new Error('Formato de lembrete inválido.')
  const titulo = value.titulo.trim(), descricao = value.descricao.trim()
  if ([...titulo].length < 3 || titulo.length > 120 || descricao.length > 1000 || calendarDaysUntil(value.data) == null) throw new Error('Informe título de 3 a 120 caracteres, descrição de até 1.000 e uma data válida.')
  return { titulo, descricao, data: value.data }
}
export function reminderEvents(reminders: PersonalReminder[], today: string) {
  return reminders.map(reminder => ({ id: `lembrete:${reminder.id}`, studentId: '', studentName: 'Lembrete pessoal', date: reminder.data, kind: 'lembrete' as const, title: reminder.titulo, complete: reminder.concluido,
    state: reminder.concluido ? 'Concluído' : reminder.data < today ? 'Atrasado' : reminder.data === today ? 'Hoje' : 'Planejado', reminder }))
}
export function mergeReminderEvents(events: PersonalAgendaEvent[], reminders: PersonalReminder[], today: string) {
  return [...events, ...reminderEvents(reminders, today)].sort((a,b)=>a.date.localeCompare(b.date)||a.studentName.localeCompare(b.studentName,'pt-BR')||a.id.localeCompare(b.id))
}
