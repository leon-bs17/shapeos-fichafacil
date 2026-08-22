'use client'

import Link from 'next/link'
import { Activity, ClipboardList, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Erro ao carregar dados. Verifique a conexão e recarregue.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe seus alunos e fichas ativas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          titulo="Alunos vinculados"
          valor={metricas.totalAlunos}
          icone={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          titulo="Vínculos ativos"
          valor={metricas.alunosAtivos}
          icone={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          titulo="Fichas ativas"
          valor={metricas.fichasAtivas}
          icone={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meus alunos</h2>
          <Link
            href="/alunos"
            className="text-primary text-sm font-medium hover:underline"
          >
            Gerenciar →
          </Link>
        </div>

        {alunos?.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum aluno vinculado ainda. Convide seu primeiro aluno para
              começar.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Fichas</th>
                  <th className="px-4 py-3 font-medium">Vínculo desde</th>
                </tr>
              </thead>
              <tbody>
                {alunos?.map((a) => (
                  <tr key={a.vinculo_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.nome}</p>
                      <p className="text-muted-foreground">{a.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          a.status === 'ATIVO'
                            ? 'rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
                            : 'rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{a.treinos_ativos}</td>
                    <td className="text-muted-foreground px-4 py-3">
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
}: {
  titulo: string
  valor: number
  icone: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{valor}</div>
      </CardContent>
    </Card>
  )
}
