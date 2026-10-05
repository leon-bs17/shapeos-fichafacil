'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, ChevronDown, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { useNotificationUser } from '@/providers/notification-provider'
import { markNotificationsRead, receivedNotifications, unreadNotificationCount, type NotificationCursor } from '@/services/notifications'
import s from './notification-bell.module.css'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function NotificationBell() {
  const userId = useNotificationUser()
  const queryClient = useQueryClient()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const id = useId()
  const count = useQuery({
    queryKey: ['notifications', userId, 'count'],
    queryFn: ({ signal }) => unreadNotificationCount(signal),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
  const inbox = useInfiniteQuery({
    queryKey: ['notifications', userId, 'inbox'],
    queryFn: ({ pageParam, signal }) => receivedNotifications(pageParam, signal),
    initialPageParam: undefined as NotificationCursor | undefined,
    getNextPageParam: page => page.nextCursor,
    enabled: open && Boolean(userId),
    staleTime: 0,
    refetchInterval: open ? 60_000 : false,
    refetchIntervalInBackground: false,
  })
  const read = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })
  const unread = count.isSuccess ? count.data : 0
  const items = inbox.data?.pages.flatMap(page => page.items) ?? []
  const unreadText = `${unread} ${unread === 1 ? 'não lida' : 'não lidas'}`

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  useEffect(() => { setOpen(false); setExpandedId(null) }, [userId])

  function show() {
    read.reset()
    setExpandedId(null)
    setOpen(true)
    void count.refetch()
  }

  return <>
    <button type="button" className={s.trigger} onClick={show}
      aria-label={unread > 0 ? `Abrir notificações, ${unread} ${unread === 1 ? 'não lida' : 'não lidas'}` : 'Abrir notificações'}
      title="Notificações" aria-haspopup="dialog" aria-expanded={open} aria-controls={id}>
      <Bell size={20} strokeWidth={1.8} aria-hidden="true" />
      {unread > 0 ? <span className={s.badge} aria-hidden="true" /> : null}
    </button>
    <span className={s.srOnly} role="status">{count.isSuccess ? `${unread} notificações não lidas` : ''}</span>
    <dialog ref={dialog} id={id} className={s.panel} aria-labelledby={`${id}-title`} aria-modal="true"
      onClose={() => setOpen(false)} onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false)
      }}>
      <header className={s.header}>
        <div><h2 id={`${id}-title`}>Notificações</h2><p>{count.isSuccess ? unread > 0 ? unreadText : 'Tudo em dia' : 'Seus avisos recebidos'}</p></div>
        <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Fechar notificações" autoFocus><X size={19} strokeWidth={1.8} aria-hidden="true" /></button>
      </header>
      <div className={s.toolbar}>
        <span>Recebidas</span>
        <button type="button" onClick={() => read.mutate(null)} disabled={!userId || unread === 0 || read.isPending}>
          <CheckCheck size={16} strokeWidth={1.8} aria-hidden="true" />{read.isPending && read.variables === null ? 'Salvando…' : 'Marcar todas como lidas'}
        </button>
      </div>
      {read.isError ? <p className={s.error} role="alert">{read.error.message} <button type="button" onClick={() => read.mutate(read.variables ?? null)}>Tentar novamente</button></p> : null}
      <div className={s.list} aria-busy={inbox.isFetching}>
        {!userId || inbox.isPending ? <div className={s.state} role="status"><LoaderCircle className={s.spinner} size={24} aria-hidden="true" /><p>Carregando notificações…</p></div>
          : inbox.isError && !items.length ? <div className={s.state} role="alert"><Bell size={28} strokeWidth={1.5} aria-hidden="true" /><h3>Não foi possível carregar</h3><p>Tente consultar suas notificações novamente.</p><button type="button" className={s.retry} onClick={() => { void inbox.refetch(); void count.refetch() }}><RotateCcw size={15} aria-hidden="true" />Tentar novamente</button></div>
          : !items.length ? <div className={s.state}><span className={s.emptyIcon}><Bell size={28} strokeWidth={1.5} aria-hidden="true" /></span><h3>Nenhuma notificação por aqui</h3><p>Os avisos destinados a você aparecerão aqui.</p></div>
          : <ul>{items.map(item => {
            const expanded = expandedId === item.id
            const unreadItem = item.lida_em === null
            return <li key={item.id}>
              <button type="button" className={`${s.item} ${unreadItem ? s.unread : ''}`} aria-expanded={expanded} disabled={read.isPending}
                onClick={() => {
                  setExpandedId(expanded ? null : item.id)
                  if (unreadItem && !expanded) read.mutate([item.id])
                }}>
                <span className={s.itemHeading}><strong>{item.titulo}</strong>{unreadItem ? <span className={s.dot} aria-label="Não lida" /> : null}</span>
                <span className={`${s.message} ${expanded ? s.expanded : ''}`}>{item.mensagem}</span>
                <span className={s.itemMeta}><time dateTime={item.criado_em}>{dateFormat.format(new Date(item.criado_em))}</time><span>{expanded ? 'Recolher' : 'Ler notificação'}<ChevronDown size={13} className={expanded ? s.chevronOpen : ''} aria-hidden="true" /></span></span>
              </button>
            </li>
          })}</ul>}
        {items.length && inbox.isError ? <p className={s.error} role="alert">Não foi possível atualizar a lista. <button type="button" onClick={() => void inbox.refetch()}>Tentar novamente</button></p> : null}
        {inbox.hasNextPage ? <button type="button" className={s.more} onClick={() => void inbox.fetchNextPage()} disabled={inbox.isFetching}>{inbox.isFetchingNextPage ? 'Carregando…' : 'Carregar mais notificações'}</button> : null}
      </div>
      <footer className={s.footer}>Comunicados e avisos da ShapeOS</footer>
    </dialog>
  </>
}
