'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Ban, CheckCircle2, ClipboardCheck, Clock3, Loader2, Mail, UserCheck } from 'lucide-react'

type PersonalPendente = {
  id: string
  nome: string
  email: string
  tipo: 'PERSONAL'
  status_conta: 'PENDENTE'
  criado_em: string
}

export default function AdminAprovacoesPage() {
  const queryClient = useQueryClient()

  const { data: pendentes, isLoading } = useQuery({
    queryKey: ['admin-aprovacoes'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, status_conta, criado_em')
        .eq('tipo', 'PERSONAL')
        .eq('status_conta', 'PENDENTE')
        .order('criado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as PersonalPendente[]
    },
  })

  const acao = useMutation({
    mutationFn: async ({ personal, novoStatus }: { personal: PersonalPendente; novoStatus: 'ATIVO' | 'BLOQUEADO' }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão administrativa expirada.')

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ status_conta: novoStatus })
        .eq('id', personal.id)
        .eq('status_conta', 'PENDENTE')
      if (updateError) throw updateError

      const { error: auditError } = await supabase.from('admin_auditoria').insert({
        admin_id: user.id,
        usuario_id: personal.id,
        acao: novoStatus === 'ATIVO' ? 'APROVAR_USUARIO' : 'BLOQUEAR_USUARIO',
        detalhes: {
          nome: personal.nome,
          email: personal.email,
          status_anterior: 'PENDENTE',
          status_novo: novoStatus,
          origem: 'fila_aprovacoes',
        },
      })
      if (auditError) throw auditError
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-aprovacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-auditoria'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-command-center'] }),
      ])
    },
  })

  return (
    <div className="space-y-7">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#22C7C7]">
          <ClipboardCheck className="h-4 w-4" /> Aprovações
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Fila de novos Personais</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aprove ou bloqueie cadastros antes que tenham acesso ao ShapeOS.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-warning/10 text-warning"><Clock3 className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold">{pendentes?.length ?? 0}</p><p className="text-xs text-muted-foreground">Aguardando decisão</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><UserCheck className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">Acesso controlado</p><p className="text-xs text-muted-foreground">Só Personais aprovados conseguem entrar.</p></div>
          </CardContent>
        </Card>
      </div>

      {acao.error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {acao.error instanceof Error ? acao.error.message : 'Não foi possível concluir a ação.'}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map((n) => <div key={n} className="h-24 rounded-2xl skeleton" />)}</div>
      ) : !pendentes?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-success" />
            <p className="font-semibold">Nenhuma aprovação pendente</p>
            <p className="mt-1 text-sm text-muted-foreground">Novos cadastros de Personal aparecerão aqui automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendentes.map((personal) => {
            const processando = acao.isPending && acao.variables?.personal.id === personal.id
            return (
              <Card key={personal.id}>
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[#22C7C7]/10 font-bold text-[#22C7C7]">
                      {personal.nome?.charAt(0)?.toUpperCase() ?? 'P'}
                    </div>
                    <div>
                      <p className="font-semibold">{personal.nome}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />{personal.email}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Cadastrado em {new Date(personal.criado_em).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 md:justify-end">
                    <Button onClick={() => acao.mutate({ personal, novoStatus: 'ATIVO' })} disabled={processando} className="gap-2">
                      {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aprovar
                    </Button>
                    <Button variant="outline" onClick={() => acao.mutate({ personal, novoStatus: 'BLOQUEADO' })} disabled={processando} className="gap-2 text-destructive">
                      <Ban className="h-4 w-4" /> Bloquear
                    </Button>
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
