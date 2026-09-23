'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BookOpen, Check, ChevronDown, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Banner } from '@/components/ui/banner'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

type UserRow = {
  id: string
  nome: string | null
  email: string
  tipo: 'PERSONAL' | 'ALUNO' | 'ADMIN'
  plano: 'STARTER' | 'PRO' | 'DREAM'
  avatar_url: string | null
}

type Broadcast = {
  id: string
  titulo: string
  mensagem: string
  nivel: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  criado_em: string
  ativo: boolean
  inicio: string
  fim: string | null
}

const toneMap = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'danger',
} as const

export function ProductTopbar({
  label,
  onLogout,
  maxWidth = 'max-w-7xl',
  className,
}: {
  label?: string
  onLogout?: () => void | Promise<void>
  maxWidth?: string
  className?: string
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['product-topbar'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return null

      const [{ data: user }, { data: broadcasts }, { data: reads }] = await Promise.all([
        supabase.from('usuarios').select('id,nome,email,tipo,plano,avatar_url').eq('id', auth.user.id).single(),
        supabase.from('broadcast_mensagens').select('id,titulo,mensagem,nivel,criado_em,ativo,inicio,fim').order('criado_em', { ascending: false }).limit(20),
        supabase.from('broadcast_leituras').select('broadcast_id').eq('usuario_id', auth.user.id),
      ])

      const now = Date.now()
      const activeBroadcasts = ((broadcasts ?? []) as Broadcast[]).filter((item) => {
        const started = new Date(item.inicio).getTime() <= now
        const notExpired = !item.fim || new Date(item.fim).getTime() > now
        return item.ativo && started && notExpired
      })

      return {
        user: user as UserRow | null,
        broadcasts: activeBroadcasts,
        readIds: new Set((reads ?? []).map((item) => item.broadcast_id as string)),
      }
    },
  })

  const unread = useMemo(() => data?.broadcasts.filter((item) => !data.readIds.has(item.id)) ?? [], [data])
  const latest = unread[0]
  const user = data?.user

  async function markRead(id: string) {
    if (!user || data?.readIds.has(id)) return
    const supabase = createClient()
    await supabase.from('broadcast_leituras').insert({ broadcast_id: id, usuario_id: user.id })
    await queryClient.invalidateQueries({ queryKey: ['product-topbar'] })
  }

  async function logout() {
    if (onLogout) {
      await onLogout()
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = (user?.nome || user?.email || 'U').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  const planLabel = user?.tipo === 'ALUNO' ? 'Aluno' : user?.tipo === 'ADMIN' ? 'Admin' : user?.plano?.toLowerCase()

  return (
    <>
      <header className={cn('sticky top-0 z-40 border-b border-border/55 bg-background/82 backdrop-blur-xl', className)}>
        <div className={cn('mx-auto flex h-16 items-center justify-between gap-4 px-5', maxWidth)}>
          <div className="min-w-0">
            {label ? <p className="truncate text-xs font-medium text-muted-foreground">{label}</p> : <p className="text-sm font-semibold tracking-tight">ShapeOS</p>}
          </div>

          <div className="flex items-center gap-1.5">
            <Link href="/docs" className="hidden h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground sm:flex">
              <BookOpen className="h-3.5 w-3.5" />
              Docs
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setNotificationsOpen((v) => !v); setProfileOpen(false) }}
                className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unread.length > 0 ? (
                  <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-[0_0_0_2px_hsl(var(--background))]">
                    {Math.min(unread.length, 9)}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="absolute right-0 top-12 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-popover shadow-[0_22px_70px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold">Notificações</p>
                      <p className="text-[11px] text-muted-foreground">{unread.length} não lida{unread.length === 1 ? '' : 's'}</p>
                    </div>
                    {unread.length ? <Badge tone="primary">{unread.length}</Badge> : null}
                  </div>
                  <div className="max-h-96 overflow-y-auto border-t border-border/60 p-2">
                    {data?.broadcasts.length ? data.broadcasts.map((item) => {
                      const read = data.readIds.has(item.id)
                      return (
                        <button key={item.id} type="button" onClick={() => markRead(item.id)} className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-foreground/[0.035]">
                          <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', read ? 'bg-muted-foreground/30' : 'bg-primary')} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className={cn('truncate text-xs font-semibold', read && 'text-muted-foreground')}>{item.titulo}</span>
                              {!read ? <span className="text-[9px] font-bold uppercase tracking-wider text-primary">novo</span> : null}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.mensagem}</span>
                          </span>
                          {read ? <Check className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/50" /> : null}
                        </button>
                      )
                    }) : <EmptyState icon={Bell} title="Tudo em dia" description="Nenhum aviso novo por aqui." compact />}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setProfileOpen((v) => !v); setNotificationsOpen(false) }}
                className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition hover:bg-foreground/[0.04]"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/12 text-[11px] font-bold text-primary">{initials}</span>
                )}
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block max-w-36 truncate text-xs font-semibold">{user?.nome ?? 'Carregando...'}</span>
                  <span className="block text-[10px] capitalize text-muted-foreground">{planLabel ?? 'ShapeOS'}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-12 w-60 rounded-2xl bg-popover p-2 shadow-[0_22px_70px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user?.nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                    <div className="mt-2"><Badge tone={user?.plano === 'DREAM' ? 'primary' : user?.plano === 'PRO' ? 'success' : 'neutral'}>{user?.tipo === 'ALUNO' ? 'ALUNO' : user?.tipo === 'ADMIN' ? 'ADMIN' : user?.plano ?? 'STARTER'}</Badge></div>
                  </div>
                  <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-destructive/8 hover:text-destructive">
                    <LogOut className="h-3.5 w-3.5" />
                    Sair da conta
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {latest ? (
        <div className={cn('mx-auto px-5 pt-3', maxWidth)}>
          <Banner tone={toneMap[latest.nivel]} title={latest.titulo} onDismiss={() => markRead(latest.id)}>
            {latest.mensagem}
          </Banner>
        </div>
      ) : null}
    </>
  )
}
