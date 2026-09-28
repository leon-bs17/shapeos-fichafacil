'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Activity, Ban, CheckCircle2, Clock3, Search, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarData } from '@/lib/utils'

type Auditoria = {
  id: string
  admin_id: string
  usuario_id: string | null
  acao: 'APROVAR_USUARIO' | 'BLOQUEAR_USUARIO' | 'REATIVAR_USUARIO' | 'ALTERAR_TIPO'
  detalhes: Record<string, unknown>
  criado_em: string
}

type UsuarioMinimo = { id: string; nome: string; email: string }

const acaoConfig = {
  APROVAR_USUARIO: { label: 'Usuário aprovado', icon: CheckCircle2, classe: 'text-success bg-success/10' },
  BLOQUEAR_USUARIO: { label: 'Usuário bloqueado', icon: Ban, classe: 'text-destructive bg-destructive/10' },
  REATIVAR_USUARIO: { label: 'Usuário reativado', icon: UserRoundCheck, classe: 'text-info bg-info/10' },
  ALTERAR_TIPO: { label: 'Tipo alterado', icon: ShieldCheck, classe: 'text-warning bg-warning/10' },
} as const

export default function AdminAuditoriaPage() {
  const [busca, setBusca] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-auditoria'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: eventos, error } = await supabase
        .from('admin_auditoria')
        .select('id, admin_id, usuario_id, acao, detalhes, criado_em')
        .order('criado_em', { ascending: false })
        .limit(200)

      if (error) throw error

      const lista = (eventos ?? []) as Auditoria[]
      const ids = Array.from(new Set(lista.flatMap((e) => [e.admin_id, e.usuario_id].filter(Boolean)))) as string[]
      let usuarios: UsuarioMinimo[] = []

      if (ids.length > 0) {
        const { data: encontrados, error: erroUsuarios } = await supabase
          .from('usuarios')
          .select('id, nome, email')
          .in('id', ids)
        if (erroUsuarios) throw erroUsuarios
        usuarios = (encontrados ?? []) as UsuarioMinimo[]
      }

      return { eventos: lista, usuarios }
    },
  })

  const nomes = useMemo(
    () => new Map((data?.usuarios ?? []).map((u) => [u.id, u])),
    [data?.usuarios]
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return data?.eventos ?? []

    return (data?.eventos ?? []).filter((evento) => {
      const admin = nomes.get(evento.admin_id)
      const alvo = evento.usuario_id ? nomes.get(evento.usuario_id) : null
      const config = acaoConfig[evento.acao]
      return [admin?.nome, admin?.email, alvo?.nome, alvo?.email, config.label]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    })
  }, [busca, data?.eventos, nomes])

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#22C7C7]">
          <Activity className="h-4 w-4" /> Auditoria
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Histórico administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro das decisões de acesso realizadas no painel de administração.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por administrador, usuário ou ação..."
          className="h-10 pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((n) => <div key={n} className="h-20 rounded-2xl skeleton" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Clock3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Nenhuma ação registrada</p>
            <p className="mt-1 text-sm text-muted-foreground">As aprovações e bloqueios aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((evento) => {
            const config = acaoConfig[evento.acao]
            const Icon = config.icon
            const admin = nomes.get(evento.admin_id)
            const alvo = evento.usuario_id ? nomes.get(evento.usuario_id) : null
            const detalhes = evento.detalhes ?? {}

            return (
              <Card key={evento.id}>
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${config.classe}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{config.label}</p>
                        {typeof detalhes.status_novo === 'string' ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {detalhes.status_novo}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="text-foreground">{admin?.nome ?? 'Administrador'}</span>
                        {' alterou '}
                        <span className="text-foreground">{alvo?.nome ?? String(detalhes.nome ?? 'usuário')}</span>
                        {alvo?.email ? <span className="text-xs"> · {alvo.email}</span> : null}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground md:text-right">
                    <p>{formatarData(evento.criado_em)}</p>
                    <p className="mt-1">{new Date(evento.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
