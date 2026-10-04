import { createClient } from '@/lib/supabase/client'

export type ReceivedNotification = {
  id: string
  titulo: string
  mensagem: string
  criado_em: string
  lida_em: string | null
}
export type NotificationCursor = { createdAt: string; id: string }
export type NotificationPage = {
  items: ReceivedNotification[]
  nextCursor: NotificationCursor | undefined
}
const PAGE_SIZE = 20

export async function unreadNotificationCount(signal?: AbortSignal): Promise<number> {
  let query = createClient().from('notificacoes_recebidas')
    .select('id', { count: 'exact', head: true }).is('lida_em', null)
  if (signal) query = query.abortSignal(signal)
  const { count, error } = await query
  if (error) throw new Error('Não foi possível consultar suas notificações.')
  return count ?? 0
}

export async function receivedNotifications(cursor: NotificationCursor | undefined, signal?: AbortSignal): Promise<NotificationPage> {
  let query = createClient().from('notificacoes_recebidas')
    .select('id, titulo, mensagem, criado_em, lida_em')
    .order('criado_em', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE + 1)
  if (cursor) {
    query = query.or(`criado_em.lt.${cursor.createdAt},and(criado_em.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw new Error('Não foi possível carregar suas notificações.')
  const rows = (data ?? []) as ReceivedNotification[]
  const items = rows.slice(0, PAGE_SIZE)
  const last = items.at(-1)
  return {
    items,
    nextCursor: rows.length > PAGE_SIZE && last ? { createdAt: last.criado_em, id: last.id } : undefined,
  }
}

export async function markNotificationsRead(ids: string[] | null): Promise<void> {
  const { error } = await createClient().rpc('marcar_notificacoes_lidas', { p_ids: ids })
  if (error) throw new Error('Não foi possível registrar a leitura. Tente novamente.')
}
