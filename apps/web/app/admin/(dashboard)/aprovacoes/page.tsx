'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'

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
    mutationFn: async ({
      personal,
      novoStatus,
    }: {
      personal: PersonalPendente
      novoStatus: 'ATIVO' | 'BLOQUEADO'
    }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão administrativa expirada.')

      const { error: configuracaoError } = await supabase
        .from('admin_configuracao')
        .select('id')
        .limit(1)
      if (configuracaoError) {
        const response = await fetch('/api/admin/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'EDITAR_USUARIO',
            id: personal.id,
            dados: { status_conta: novoStatus },
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        return
      }
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

  const totalPendentes = pendentes?.length ?? 0

  return (
    <div className="space-y-6 pb-8">
      <section
        className="relative isolate overflow-hidden rounded-[28px] border border-white/10 px-6 py-7 shadow-2xl shadow-black/20 sm:px-8 sm:py-8"
        style={{
          background:
            'radial-gradient(circle at 76% 24%, rgba(0, 255, 204, 0.20), transparent 24%), radial-gradient(circle at 58% 105%, rgba(116, 55, 255, 0.20), transparent 38%), linear-gradient(120deg, rgba(5, 12, 20, 0.98), rgba(8, 18, 27, 0.94) 55%, rgba(7, 33, 39, 0.94))',
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'rgba(0, 255, 204, 0.12)' }}
        />
        <div
          className="pointer-events-none absolute right-[18%] top-10 h-56 w-28 rotate-[22deg] rounded-full blur-3xl"
          style={{ background: 'rgba(0, 190, 255, 0.10)' }}
        />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--shapeos-brand)]">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />
            Aprovações
          </div>
          <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
            Novos <span className="text-[var(--shapeos-brand)]">Personais</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Gerencie e aprove novos acessos à plataforma com controle, segurança e rastreabilidade.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] overflow-visible lg:block">
          <div
            className="absolute right-[18%] top-[18%] h-64 w-40 rounded-[48%] blur-[1px]"
            style={{
              background:
                'radial-gradient(ellipse at 50% 18%, rgba(235, 248, 255, 0.16) 0 9%, transparent 10%), radial-gradient(ellipse at 50% 52%, rgba(17, 215, 191, 0.13) 0 26%, transparent 27%), linear-gradient(180deg, rgba(0, 255, 204, 0.08), transparent 75%)',
              transform: 'rotate(-5deg)',
            }}
          />
          <div
            className="absolute right-[-5%] bottom-[-22%] h-72 w-72 rounded-full blur-3xl"
            style={{ background: 'rgba(0, 255, 204, 0.10)' }}
          />
          <div
            className="absolute right-4 top-1/2 w-[min(100%,360px)] -translate-y-1/2 rotate-[-5deg] text-right leading-[0.92] text-white/85 dark:text-white/80"
            style={{
              fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
              fontSize: 'clamp(1.75rem, 2.8vw, 3rem)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              whiteSpace: 'normal',
              textShadow: '0 2px 18px rgba(0,0,0,0.22)',
            }}
          >
            <span className="block">Mais profissionais</span>
            <span className="block">Mais resultados</span>
            <span
              className="ml-auto mt-3 block h-1 w-28 -rotate-[7deg] rounded-full bg-[var(--shapeos-brand)] shadow-[0_0_18px_rgba(0,255,204,0.45)]"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-slate-100 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:from-amber-950/50 dark:via-slate-950/90 dark:to-slate-900/90"
        >
          <CardContent className="flex items-center gap-4 p-5 sm:p-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-warning/10 text-warning shadow-inner shadow-warning/10">
              <Clock3 className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pendentes</p>
              <p className="mt-0.5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{totalPendentes}</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Aguardando aprovação</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.7} />
          </CardContent>
        </Card>

        <Card
          className="overflow-hidden border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-slate-100 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:from-teal-950/55 dark:via-slate-950/90 dark:to-slate-900/90"
        >
          <CardContent className="flex items-center gap-4 p-5 sm:p-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner shadow-primary/10">
              <Users className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Acesso controlado</p>
              <p className="mt-0.5 text-xl font-black tracking-tight text-slate-950 dark:text-white">Só aprovados</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Personais liberados pela administração</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.7} />
          </CardContent>
        </Card>
      </div>

      {acao.error ? (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {acao.error instanceof Error ? acao.error.message : 'Não foi possível concluir a ação.'}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((n) => <div key={n} className="h-28 rounded-2xl skeleton" />)}
        </div>
      ) : !pendentes?.length ? (
        <section
          className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50 px-6 py-14 text-center shadow-xl shadow-slate-900/10 sm:px-10 dark:border-white/10 dark:from-[#07131c] dark:via-[#07131c] dark:to-[#0b2025]"
          style={{
            background:
              'radial-gradient(circle at 50% 12%, rgba(0, 127, 120, 0.08), transparent 28%), radial-gradient(circle at 8% 100%, rgba(111, 45, 220, 0.08), transparent 32%)',
          }}
        >
          <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-[22px] border border-teal-200 bg-teal-50 text-teal-700 shadow-[0_12px_35px_rgba(0,127,120,0.10)] dark:border-primary/20 dark:bg-primary/10 dark:text-primary dark:shadow-[0_0_45px_rgba(0,255,204,0.12)]">
            <FileCheck2 className="h-9 w-9" strokeWidth={1.7} />
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Tudo em dia!</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Nenhuma aprovação pendente no momento.
          </p>
          <Button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-aprovacoes'] })}
            className="mt-6 gap-2 rounded-full bg-teal-700 px-7 font-bold text-white shadow-[0_10px_35px_rgba(0,127,120,0.18)] hover:bg-teal-800 dark:bg-primary dark:text-primary-foreground dark:shadow-[0_10px_35px_rgba(0,255,204,0.18)] dark:hover:bg-primary/90"
          >
            Verificar novamente
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Button>
        </section>
      ) : (
        <section className="space-y-3">
          {pendentes.map((personal) => {
            const processando = acao.isPending && acao.variables?.personal.id === personal.id
            return (
              <Card
                key={personal.id}
                className="overflow-hidden border-white/10 bg-card/80 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-200 hover:border-primary/25"
              >
                <CardContent className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 font-black text-primary ring-1 ring-primary/15">
                      {personal.nome?.charAt(0)?.toUpperCase() ?? 'P'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-white">{personal.nome}</p>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-300">
                          Pendente
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                        {personal.email}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Cadastrado em {new Date(personal.criado_em).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full gap-2 md:w-auto md:justify-end">
                    <Button
                      onClick={() => acao.mutate({ personal, novoStatus: 'ATIVO' })}
                      disabled={processando}
                      className="flex-1 gap-2 rounded-xl sm:flex-none"
                    >
                      {processando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />}
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => acao.mutate({ personal, novoStatus: 'BLOQUEADO' })}
                      disabled={processando}
                      className="flex-1 gap-2 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 sm:flex-none"
                    >
                      <Ban className="h-4 w-4" strokeWidth={1.8} />
                      Bloquear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-slate-200 bg-white/85 shadow-sm dark:border-white/10 dark:bg-card/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-bold">Controle total</p>
              <p className="text-xs text-muted-foreground">Aprove ou bloqueie com segurança.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">
              <FileCheck2 className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-bold">Rastreabilidade</p>
              <p className="text-xs text-muted-foreground">Ações administrativas continuam auditadas.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <UserCheck className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-bold">Acesso seguro</p>
              <p className="text-xs text-muted-foreground">Somente contas aprovadas entram.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
