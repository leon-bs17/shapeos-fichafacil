'use client'

import Link from 'next/link'
import { Activity, ArrowRight, ClipboardList, Users } from 'lucide-react'
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
        <div className="h-12 w-72 skeleton" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 skeleton" />)}
        </div>
        <div className="h-72 skeleton" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-6 text-center text-sm text-red-300">
        Erro ao carregar dados. Verifique a conexão e recarregue.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <p className="shapeos-eyebrow">Painel do personal</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="shapeos-title text-4xl md:text-5xl">
              Sua base, <span className="text-[#00D2D2]">sob controle.</span>
            </h1>
            <p className="mt-3 text-sm text-zinc-500">Acompanhe alunos e fichas ativas em tempo real.</p>
          </div>
          <Link href="/alunos" className="inline-flex items-center gap-2 text-sm font-medium text-[#00D2D2] hover:underline">
            Gerenciar alunos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Alunos vinculados" value={metricas.totalAlunos} icon={Users} accent="#00D2D2" delay={1} />
        <MetricCard label="Vínculos ativos" value={metricas.alunosAtivos} icon={Activity} accent="#FF7043" delay={2} />
        <MetricCard label="Fichas ativas" value={metricas.fichasAtivas} icon={ClipboardList} accent="#00D2D2" delay={3} />
      </div>

      <section className="animate-fade-in stagger-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="shapeos-eyebrow">Base ativa</p>
            <h2 className="mt-2 text-xl font-semibold text-[#F5F5F5]">Meus alunos</h2>
          </div>
        </div>

        {alunos?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D2D2]/20 bg-[#00D2D2]/10">
                <Users className="h-7 w-7 text-[#00D2D2]" />
              </div>
              <p className="font-semibold">Nenhum aluno vinculado ainda.</p>
              <p className="mt-1 text-sm text-zinc-500">Convide seu primeiro aluno para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alunos?.map((a, index) => (
              <div
                key={a.vinculo_id}
                className={`card-tech animate-slide-up stagger-${Math.min(index + 1, 8)} flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#00D2D2]/30 bg-[#00D2D2]/10 text-sm font-semibold text-[#00D2D2] shapeos-display">
                    {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-medium text-[#F5F5F5]">{a.nome}</h3>
                      <span className={a.status === 'ATIVO'
                        ? 'rounded-full border border-[#00D2D2]/25 bg-[#00D2D2]/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#00D2D2]'
                        : 'rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500'}>
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">{a.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-zinc-500">
                  <div>
                    <span className="shapeos-eyebrow block">Fichas</span>
                    <span className="mt-1 block text-base font-semibold text-[#F5F5F5]">{a.treinos_ativos}</span>
                  </div>
                  <div>
                    <span className="shapeos-eyebrow block">Desde</span>
                    <span className="mt-1 block text-sm text-zinc-300">{formatarData(a.criado_em)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  delay,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  accent: string
  delay: number
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 card-tech animate-slide-up stagger-${delay}`}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <span style={{ color: accent }}><Icon className="h-3.5 w-3.5" /></span>
          {label}
        </div>
        <div className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#F5F5F5] shapeos-display">{value}</div>
      </div>
    </div>
  )
}
