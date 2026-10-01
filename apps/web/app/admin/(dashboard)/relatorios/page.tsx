'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Activity,
  BarChart3,
  Download,
  Dumbbell,
  GraduationCap,
  Link2,
  UserCheck,
  Users,
} from 'lucide-react'

type Usuario = {
  id: string
  nome: string
  email: string
  tipo: 'ADMIN' | 'PERSONAL' | 'ALUNO'
  status_conta: 'ATIVO' | 'PENDENTE' | 'BLOQUEADO'
  criado_em: string
}

function csvValor(valor: unknown) {
  const texto = valor == null ? '' : String(valor)
  return `"${texto.replaceAll('"', '""')}"`
}

function baixarCsv(nome: string, linhas: unknown[][]) {
  const csv = linhas.map((linha) => linha.map(csvValor).join(',')).join('\n')
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function AdminRelatoriosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-relatorios'],
    queryFn: async () => {
      const supabase = createClient()
      const [usuariosR, treinosR, vinculosR, exerciciosR, execucoesR] = await Promise.all([
        supabase.from('usuarios').select('id, nome, email, tipo, status_conta, criado_em').order('criado_em', { ascending: false }),
        supabase.from('treinos').select('id, ativo, criado_em'),
        supabase.from('personal_alunos').select('id, status, criado_em'),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }),
        supabase.from('registro_execucao').select('id, data_registro'),
      ])

      const falha = usuariosR.error || treinosR.error || vinculosR.error || exerciciosR.error || execucoesR.error
      if (falha) throw falha

      const usuarios = (usuariosR.data ?? []) as Usuario[]
      const agora = Date.now()
      const ultimos30 = usuarios.filter((u) => agora - new Date(u.criado_em).getTime() <= 30 * 86_400_000).length
      const execucoes30 = (execucoesR.data ?? []).filter((e) => agora - new Date(e.data_registro).getTime() <= 30 * 86_400_000).length

      return {
        usuarios,
        totalUsuarios: usuarios.length,
        personals: usuarios.filter((u) => u.tipo === 'PERSONAL').length,
        alunos: usuarios.filter((u) => u.tipo === 'ALUNO').length,
        pendentes: usuarios.filter((u) => u.status_conta === 'PENDENTE').length,
        novos30: ultimos30,
        treinos: (treinosR.data ?? []).length,
        treinosAtivos: (treinosR.data ?? []).filter((t) => t.ativo).length,
        vinculosAtivos: (vinculosR.data ?? []).filter((v) => v.status === 'ATIVO').length,
        exercicios: exerciciosR.count ?? 0,
        execucoes30,
      }
    },
  })

  function exportarUsuarios() {
    if (!data) return
    baixarCsv(`shapeos-usuarios-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ID', 'Nome', 'E-mail', 'Tipo', 'Status', 'Criado em'],
      ...data.usuarios.map((u) => [u.id, u.nome, u.email, u.tipo, u.status_conta, u.criado_em]),
    ])
  }

  function exportarResumo() {
    if (!data) return
    baixarCsv(`shapeos-resumo-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Métrica', 'Valor'],
      ['Usuários', data.totalUsuarios],
      ['Personais', data.personals],
      ['Alunos', data.alunos],
      ['Cadastros pendentes', data.pendentes],
      ['Novos usuários (30 dias)', data.novos30],
      ['Treinos', data.treinos],
      ['Treinos ativos', data.treinosAtivos],
      ['Vínculos ativos', data.vinculosAtivos],
      ['Exercícios', data.exercicios],
      ['Execuções (30 dias)', data.execucoes30],
    ])
  }

  if (isLoading) return <div className="h-64 rounded-3xl skeleton" />

  if (error || !data) {
    return (
      <Card className="border-red-400/20 bg-red-400/[.04]">
        <CardContent className="py-10 text-center text-sm text-red-300">Não foi possível carregar os relatórios.</CardContent>
      </Card>
    )
  }

  const cards = [
    { label: 'Usuários', valor: data.totalUsuarios, detalhe: `+${data.novos30} em 30 dias`, Icon: Users },
    { label: 'Personais', valor: data.personals, detalhe: `${data.pendentes} pendente(s)`, Icon: UserCheck },
    { label: 'Alunos', valor: data.alunos, detalhe: `${data.vinculosAtivos} vínculos ativos`, Icon: GraduationCap },
    { label: 'Treinos ativos', valor: data.treinosAtivos, detalhe: `${data.treinos} no total`, Icon: Dumbbell },
    { label: 'Exercícios', valor: data.exercicios, detalhe: 'biblioteca global', Icon: BarChart3 },
    { label: 'Execuções · 30d', valor: data.execucoes30, detalhe: 'registros recentes', Icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--shapeos-brand)]">
            <BarChart3 className="h-4 w-4" /> Inteligência operacional
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão consolidada da plataforma com exportação real em CSV.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportarUsuarios} className="gap-2">
            <Download className="h-4 w-4" /> Exportar usuários
          </Button>
          <Button onClick={exportarResumo} className="gap-2">
            <Download className="h-4 w-4" /> Exportar resumo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, valor, detalhe, Icon }) => (
          <Card key={label} className="border-border bg-accent/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--shapeos-brand)]/10 text-[var(--shapeos-brand)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{valor}</div>
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{detalhe}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-[var(--shapeos-brand)]" /> Distribuição da base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Barra label="Personais" atual={data.personals} total={Math.max(data.totalUsuarios, 1)} />
          <Barra label="Alunos" atual={data.alunos} total={Math.max(data.totalUsuarios, 1)} />
          <Barra label="Treinos ativos" atual={data.treinosAtivos} total={Math.max(data.treinos, 1)} />
        </CardContent>
      </Card>
    </div>
  )
}

function Barra({ label, atual, total }: { label: string; atual: number; total: number }) {
  const percentual = Math.min(100, Math.round((atual / total) * 100))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{atual} · {percentual}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-accent/50">
        <div className="h-full rounded-full bg-[var(--shapeos-brand)]" style={{ width: `${percentual}%` }} />
      </div>
    </div>
  )
}
