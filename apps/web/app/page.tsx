'use client'

import Link from 'next/link'
import { Activity, ClipboardList, Users, ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { useAlunos, useMetricasGerais } from '@/hooks/use-alunos'
import { formatarData } from '@/lib/utils'

export default function VisaoGeralPage() {
  return (
    <DashboardShell>
      <VisaoGeralConteudo />
    </DashboardShell>
  )
}

function VisaoGeralConteudo() {
  const { data: alunos, isLoading, isError } = useAlunos()
  const metricas = useMetricasGerais(alunos)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 skeleton" />
          ))}
        </div>
        <div className="h-64 skeleton" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">
          Erro ao carregar dados. Verifique a conexao e recarregue.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Visao Geral</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe seus alunos e fichas ativas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          titulo="Alunos vinculados"
          valor={metricas.totalAlunos}
          icone={<Users className="h-5 w-5" />}
          cor="primary"
          atraso={1}
        />
        <MetricCard
          titulo="Vinculos ativos"
          valor={metricas.alunosAtivos}
          icone={<Activity className="h-5 w-5" />}
          cor="success"
          atraso={2}
        />
        <MetricCard
          titulo="Fichas ativas"
          valor={metricas.fichasAtivas}
          icone={<ClipboardList className="h-5 w-5" />}
          cor="info"
          atraso={3}
        />
      </div>

      <section className="animate-fade-in stagger-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meus alunos</h2>
          <Link
            href="/alunos"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Gerenciar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {alunos?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Nenhum aluno vinculado ainda.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Convide seu primeiro aluno para comecar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fichas</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Vinculo desde</th>
                </tr>
              </thead>
              <tbody>
                {alunos?.map((a) => (
                  <tr key={a.vinculo_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium">{a.nome}</p>
                          <p className="text-muted-foreground text-xs">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          a.status === 'ATIVO'
                            ? 'inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success'
                            : 'inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'
                        }
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${a.status === 'ATIVO' ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium">{a.treinos_ativos}</span>
                    </td>
                    <td className="text-muted-foreground px-5 py-3.5 text-xs">
                      {formatarData(a.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  titulo,
  valor,
  icone,
  cor,
  atraso,
}: {
  titulo: string
  valor: number
  icone: React.ReactNode
  cor: 'primary' | 'success' | 'info'
  atraso: number
}) {
  const cores = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
  }

  return (
    <Card className={`animate-slide-up stagger-${atraso} hover:shadow-md transition-shadow duration-200`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cores[cor]}`}>
            {icone}
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold tracking-tight">{valor}</p>
          <p className="text-muted-foreground text-sm mt-0.5">{titulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}
