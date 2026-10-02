'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Ban,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Mail,
  Search,
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
      <div
        aria-hidden="true"
        className="hidden items-center justify-between gap-4 lg:flex"
      >
        <div className="flex h-14 w-full max-w-[540px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-5 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.045)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b141d]/90 dark:text-slate-400 dark:shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
          <Search className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Buscar algo no ShapeOS...</span>
          <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-400">
            <span className="text-[13px]">⌘</span>
            <span>K</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="relative grid h-14 w-14 place-items-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.045)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b141d]/90 dark:text-slate-200 dark:shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            <span className="absolute right-[12px] top-[11px] h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-[#0b141d]" />
          </div>

          <div className="flex h-14 min-w-[230px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-5 text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.045)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b141d]/90 dark:text-slate-100 dark:shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
            <LockKeyhole className="h-5 w-5 shrink-0 text-slate-700 dark:text-slate-300" strokeWidth={1.8} />
            <span className="flex-1 text-sm font-semibold">Acesso controlado</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      <section className="relative isolate min-h-[232px] overflow-hidden rounded-[28px] border border-slate-200 bg-white px-7 py-9 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:px-10 sm:py-10 dark:border-white/10 dark:bg-[#08131c] dark:shadow-2xl dark:shadow-black/20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#ffffff_0%,#fbfdfe_50%,#f0fbfc_100%)] dark:hidden" />
        <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_76%_24%,rgba(0,255,204,0.18),transparent_25%),radial-gradient(circle_at_58%_105%,rgba(116,55,255,0.16),transparent_38%),linear-gradient(120deg,#07101a,#0a1520_55%,#092b30)] dark:block" />

        <div className="pointer-events-none absolute inset-y-0 right-[22%] hidden w-[31%] lg:block dark:opacity-50">
          <div className="absolute left-[18%] top-[-32%] h-[285px] w-[150px] rotate-[10deg] rounded-[50%] border-[30px] border-cyan-100/55 dark:border-teal-400/10" />
          <div className="absolute left-[35%] top-[22%] h-[250px] w-[132px] rotate-[8deg] rounded-[50%] border-[26px] border-teal-100/55 dark:border-teal-400/10" />
          <div className="absolute left-[52%] top-[48%] h-[175px] w-[92px] rotate-[7deg] rounded-[50%] bg-cyan-100/35 blur-[1px] dark:bg-teal-400/10" />
        </div>

        <div className="relative z-10 max-w-[650px]">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-[var(--shapeos-brand)]">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />
            Aprovações
          </div>
          <h1 className="text-[34px] font-black leading-[1.05] tracking-[-0.055em] text-slate-950 sm:text-[42px] dark:text-white">
            Novos <span className="text-teal-600 dark:text-[var(--shapeos-brand)]">Personais</span>
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] font-medium leading-6 text-slate-600 sm:text-base dark:text-slate-300">
            Gerencie e aprove novos acessos à plataforma com controle, segurança e rastreabilidade.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-[34%] lg:block">
          <div
            className="absolute right-6 top-1/2 w-[330px] -translate-y-1/2 rotate-[-5deg] text-right leading-[0.91] text-slate-800/90 dark:text-white/80"
            style={{
              fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
              fontSize: 'clamp(1.7rem, 2.7vw, 2.85rem)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              textShadow: '0 2px 14px rgba(15,23,42,0.08)',
            }}
          >
            <span className="block">Mais profissionais</span>
            <span className="block">Mais resultados</span>
            <span className="ml-auto mt-3 block h-1 w-28 -rotate-[7deg] rounded-full bg-teal-500 shadow-[0_0_16px_rgba(20,184,166,0.22)] dark:bg-[var(--shapeos-brand)] dark:shadow-[0_0_18px_rgba(0,255,204,0.40)]" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border-amber-200/80 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-gradient-to-br dark:from-amber-950/50 dark:via-slate-950/90 dark:to-slate-900/90 dark:shadow-xl dark:shadow-black/10">
          <CardContent className="flex items-center gap-5 p-5 sm:p-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-warning/10 dark:text-warning dark:ring-0">
              <Clock3 className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pendentes</p>
              <p className="mt-0.5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{totalPendentes}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Aguardando aprovação</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.7} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-teal-200/80 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-gradient-to-br dark:from-teal-950/55 dark:via-slate-950/90 dark:to-slate-900/90 dark:shadow-xl dark:shadow-black/10">
          <CardContent className="flex items-center gap-5 p-5 sm:p-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 dark:bg-primary/10 dark:text-primary dark:ring-0">
              <Users className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Acesso controlado</p>
              <p className="mt-0.5 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">Só aprovados</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Personais liberados pela administração</p>
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
        <section className="relative flex min-h-[355px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_14px_40px_rgba(15,23,42,0.05)] sm:px-10 dark:border-white/10 dark:bg-[#07131c] dark:shadow-2xl dark:shadow-black/15">
          <div className="pointer-events-none absolute left-1/2 top-[12%] h-48 w-48 -translate-x-1/2 rounded-full bg-teal-100/45 blur-3xl dark:bg-primary/10" />
          <div className="relative mx-auto grid h-[72px] w-[72px] place-items-center rounded-[22px] border border-teal-100 bg-teal-50 text-teal-600 shadow-[0_12px_35px_rgba(13,148,136,0.10)] dark:border-primary/20 dark:bg-primary/10 dark:text-primary dark:shadow-[0_0_45px_rgba(0,255,204,0.12)]">
            <FileCheck2 className="h-9 w-9" strokeWidth={1.7} />
          </div>
          <h2 className="relative mt-6 text-3xl font-black tracking-[-0.035em] text-slate-950 dark:text-white">Tudo em dia!</h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 sm:text-base dark:text-slate-300">
            Nenhuma aprovação pendente no momento.
          </p>
          <Button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-aprovacoes'] })}
            className="relative mt-7 min-w-[260px] gap-3 rounded-full bg-teal-600 px-8 py-5 font-bold text-white shadow-[0_10px_28px_rgba(13,148,136,0.20)] hover:bg-teal-700 dark:bg-primary dark:text-primary-foreground dark:shadow-[0_10px_35px_rgba(0,255,204,0.18)] dark:hover:bg-primary/90"
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
                className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:border-teal-300 dark:border-white/10 dark:bg-card/80 dark:shadow-lg dark:shadow-black/10 dark:hover:border-primary/25"
              >
                <CardContent className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-50 font-black text-teal-700 ring-1 ring-teal-100 dark:bg-primary/10 dark:text-primary dark:ring-primary/15">
                      {personal.nome?.charAt(0)?.toUpperCase() ?? 'P'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-950 dark:text-white">{personal.nome}</p>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-300">
                          Pendente
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                        {personal.email}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground">
                        Cadastrado em {new Date(personal.criado_em).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full gap-2 md:w-auto md:justify-end">
                    <Button
                      onClick={() => acao.mutate({ personal, novoStatus: 'ATIVO' })}
                      disabled={processando}
                      className="flex-1 gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 sm:flex-none dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                    >
                      {processando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />}
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => acao.mutate({ personal, novoStatus: 'BLOQUEADO' })}
                      disabled={processando}
                      className="flex-1 gap-2 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50 sm:flex-none dark:border-destructive/20 dark:bg-transparent dark:text-destructive dark:hover:bg-destructive/10"
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
        <Card className="rounded-2xl border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-card/60 dark:shadow-none">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-violet-500/10 dark:text-violet-300">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-foreground">Controle total</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-muted-foreground">Aprove ou bloqueie com segurança.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-card/60 dark:shadow-none">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-pink-500/10 dark:text-pink-300">
              <FileCheck2 className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-foreground">Rastreabilidade</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-muted-foreground">Ações administrativas continuam auditadas.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-card/60 dark:shadow-none">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-blue-500/10 dark:text-blue-300">
              <UserCheck className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-foreground">Acesso seguro</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-muted-foreground">Somente contas aprovadas entram.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
