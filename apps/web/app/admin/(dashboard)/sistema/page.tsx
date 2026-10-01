'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle2, Database, RefreshCw, ServerCog, ShieldCheck, XCircle } from 'lucide-react'

type Check = {
  nome: string
  detalhe: string
  ok: boolean
}

export default function AdminSistemaPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system-health'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const supabase = createClient()
      const inicio = performance.now()
      const auth = await supabase.auth.getUser()
      const [usuarios, exercicios, auditoria, notificacoes] = await Promise.all([
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }),
        supabase.from('admin_auditoria').select('id', { count: 'exact', head: true }),
        supabase.from('admin_notificacoes').select('id', { count: 'exact', head: true }),
      ])
      const latencia = Math.round(performance.now() - inicio)

      const checks: Check[] = [
        {
          nome: 'Autenticação',
          detalhe: auth.data.user ? `Sessão válida · ${auth.data.user.email ?? 'Admin'}` : 'Sessão não encontrada',
          ok: !auth.error && !!auth.data.user,
        },
        {
          nome: 'Banco principal',
          detalhe: usuarios.error ? usuarios.error.message : `${usuarios.count ?? 0} usuários acessíveis`,
          ok: !usuarios.error,
        },
        {
          nome: 'Biblioteca de exercícios',
          detalhe: exercicios.error ? exercicios.error.message : `${exercicios.count ?? 0} exercícios disponíveis`,
          ok: !exercicios.error,
        },
        {
          nome: 'Auditoria Admin',
          detalhe: auditoria.error ? auditoria.error.message : `${auditoria.count ?? 0} evento(s) registrado(s)`,
          ok: !auditoria.error,
        },
        {
          nome: 'Central de notificações',
          detalhe: notificacoes.error ? notificacoes.error.message : `${notificacoes.count ?? 0} comunicado(s) registrado(s)`,
          ok: !notificacoes.error,
        },
      ]

      return {
        checks,
        latencia,
        saudavel: checks.every((item) => item.ok),
        verificadoEm: new Date().toISOString(),
      }
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--shapeos-brand)]">
            <ServerCog className="h-4 w-4" /> Operação
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sistema</h1>
          <p className="mt-1 text-sm text-muted-foreground">Diagnóstico em tempo real dos serviços usados pelo painel administrativo.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Verificar agora
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="h-64 rounded-3xl skeleton" />
      ) : (
        <>
          <Card className={`border ${data.saudavel ? 'border-emerald-400/20 bg-emerald-400/[.035]' : 'border-red-400/20 bg-red-400/[.035]'}`}>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${data.saudavel ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>
                  {data.saudavel ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-lg font-semibold">{data.saudavel ? 'Serviços operacionais' : 'Há serviços com falha'}</p>
                  <p className="text-sm text-muted-foreground">Última verificação: {new Date(data.verificadoEm).toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-black/10 px-4 py-2 text-sm text-muted-foreground">
                Latência do diagnóstico: <strong className="text-foreground">{data.latencia} ms</strong>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.checks.map((check) => (
              <Card key={check.nome} className="border-border bg-accent/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      {check.nome === 'Autenticação' ? <ShieldCheck className="h-4 w-4 text-[var(--shapeos-brand)]" /> : check.nome === 'Banco principal' ? <Database className="h-4 w-4 text-[var(--shapeos-brand)]" /> : <Activity className="h-4 w-4 text-[var(--shapeos-brand)]" />}
                      {check.nome}
                    </span>
                    {check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-red-300" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">{check.detalhe}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-accent/50">
            <CardHeader><CardTitle className="text-base">O que esta tela valida</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <p>• Sessão do Admin autenticada no Supabase Auth.</p>
              <p>• Leitura real das tabelas principais via Data API.</p>
              <p>• Disponibilidade da auditoria administrativa.</p>
              <p>• Disponibilidade da central de notificações.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
