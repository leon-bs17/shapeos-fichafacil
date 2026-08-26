'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Users, UserCheck, ClipboardList, Activity, TrendingUp, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatarData } from '@/lib/utils'
import { Logo } from '@/components/layout/logo'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

export default function AdminDashboardPage() {
  return <DashboardConteudo />
}

function DashboardConteudo() {
  const { data: metricas, isLoading } = useQuery({
    queryKey: ['admin-metricas'],
    queryFn: async () => {
      const supabase = createClient()

      const [usuarios, treinos, execucoes, vinculos, exercicios] = await Promise.all([
        supabase.from('usuarios').select('id, nome, tipo, criado_em'),
        supabase.from('treinos').select('id, ativo, criado_em'),
        supabase.from('registro_execucao').select('id, data_registro'),
        supabase.from('personal_alunos').select('id, status'),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }),
      ])

      const todos = usuarios.data ?? []
      const personals = todos.filter((u) => u.tipo === 'PERSONAL')
      const alunos = todos.filter((u) => u.tipo === 'ALUNO')
      const treinosData = treinos.data ?? []
      const execucoesData = execucoes.data ?? []
      const vinculosData = vinculos.data ?? []

      // Usuarios por mes (ultimos 6 meses)
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const agora = new Date()
      const usuariosPorMes = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
        const mes = d.getMonth()
        const ano = d.getFullYear()
        const count = todos.filter((u) => {
          const cd = new Date(u.criado_em)
          return cd.getMonth() === mes && cd.getFullYear() === ano
        }).length
        usuariosPorMes.push({ mes: meses[mes], usuarios: count })
      }

      // Treinos por mes (ultimos 6 meses)
      const treinosPorMes = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
        const mes = d.getMonth()
        const ano = d.getFullYear()
        const count = treinosData.filter((t) => {
          const cd = new Date(t.criado_em)
          return cd.getMonth() === mes && cd.getFullYear() === ano
        }).length
        treinosPorMes.push({ mes: meses[mes], treinos: count })
      }

      // Execucoes por dia (ultimos 7 dias)
      const execucoesPorDia = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(agora)
        d.setDate(d.getDate() - i)
        const dia = d.getDate()
        const mes = meses[d.getMonth()]
        const count = execucoesData.filter((e) => {
          const ed = new Date(e.data_registro)
          return ed.toDateString() === d.toDateString()
        }).length
        execucoesPorDia.push({ dia: `${dia}/${mes}`, execucoes: count })
      }

      // Distribuicao por tipo
      const distribuicao = [
        { name: 'Personais', value: personals.length, color: '#10b981' },
        { name: 'Alunos', value: alunos.length, color: '#3b82f6' },
      ]

      return {
        totalUsuarios: todos.length,
        totalPersonals: personals.length,
        totalAlunos: alunos.length,
        treinosAtivos: treinosData.filter((t) => t.ativo).length,
        totalTreinos: treinosData.length,
        totalExecucoes: execucoesData.length,
        vinculosAtivos: vinculosData.filter((v) => v.status === 'ATIVO').length,
        totalExercicios: exercicios.count ?? 0,
        usuariosPorMes,
        treinosPorMes,
        execucoesPorDia,
        distribuicao,
        ultimosUsuarios: todos
          .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
          .slice(0, 5),
      }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 skeleton" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-72 skeleton" />)}
        </div>
      </div>
    )
  }

  const GRADIENT_IDS = {
    primary: 'grad-primary',
    success: 'grad-success',
    info: 'grad-info',
    warning: 'grad-warning',
  }

  return (
    <div className="space-y-8 scrollbar-thin">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-gradient">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm">
          Visão geral da plataforma <Logo size="sm" variant="inverse" />.
        </p>
      </header>

      <svg className="h-0 w-0" aria-hidden="true">
        <defs>
          <linearGradient id={GRADIENT_IDS.primary} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id={GRADIENT_IDS.success} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id={GRADIENT_IDS.info} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id={GRADIENT_IDS.warning} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0.1} />
          </linearGradient>
        </defs>
      </svg>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Usuários totais" valor={metricas?.totalUsuarios ?? 0} icone={<Users className="h-5 w-5" />} gradId={GRADIENT_IDS.primary} atraso={1} />
        <MetricCard titulo="Personais" valor={metricas?.totalPersonals ?? 0} icone={<UserCheck className="h-5 w-5" />} gradId={GRADIENT_IDS.success} atraso={2} />
        <MetricCard titulo="Alunos" valor={metricas?.totalAlunos ?? 0} icone={<Users className="h-5 w-5" />} gradId={GRADIENT_IDS.info} atraso={3} />
        <MetricCard titulo="Execuções" valor={metricas?.totalExecucoes ?? 0} icone={<Activity className="h-5 w-5" />} gradId={GRADIENT_IDS.warning} atraso={4} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniStat titulo="Treinos ativos" valor={metricas?.treinosAtivos ?? 0} subtitulo={`de ${metricas?.totalTreinos ?? 0} total`} />
        <MiniStat titulo="Vínculos ativos" valor={metricas?.vinculosAtivos ?? 0} subtitulo="personal-aluno" />
        <MiniStat titulo="Exercícios cadastrados" valor={metricas?.totalExercicios ?? 0} subtitulo="biblioteca global" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-tech card-tech-glow animate-slide-up stagger-5">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Novos usuários (6 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metricas?.usuariosPorMes ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))', boxShadow: '0 8px 24px hsl(var(--border)/0.3)' }} />
                <Bar dataKey="usuarios" fill={`url(#${GRADIENT_IDS.primary})`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-tech card-tech-glow animate-slide-up stagger-6">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Treinos criados (6 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metricas?.treinosPorMes ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))', boxShadow: '0 8px 24px hsl(var(--border)/0.3)' }} />
                <Line type="monotone" dataKey="treinos" stroke="hsl(var(--info))" strokeWidth={3} dot={{ fill: 'hsl(var(--info))', strokeWidth: 2, r: 5 }} activeDot={{ r: 7, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-tech card-tech-glow animate-slide-up stagger-7">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Execuções (7 dias)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas?.execucoesPorDia ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))', boxShadow: '0 8px 24px hsl(var(--border)/0.3)' }} />
                <Bar dataKey="execucoes" fill={`url(#${GRADIENT_IDS.warning})`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-tech card-tech-glow animate-slide-up stagger-8">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Distribuição</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={metricas?.distribuicao ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(metricas?.distribuicao ?? []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--card-foreground))', boxShadow: '0 8px 24px hsl(var(--border)/0.3)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-tech card-tech-glow animate-slide-up stagger-9">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Últimos usuários</h3>
            <div className="space-y-3">
              {metricas?.ultimosUsuarios.map((u) => (
                <div key={u.id} className="card-tech flex items-center gap-3 p-3 hover:border-primary/20 transition-all duration-200">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {u.tipo === 'ADMIN' ? '★' : u.tipo === 'PERSONAL' ? 'P' : 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.nome ?? 'Usuário'}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.tipo} · {formatarData(u.criado_em)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ titulo, valor, icone, gradId, atraso }: {
  titulo: string; valor: number; icone: React.ReactNode; gradId: string; atraso: number
}) {
  return (
    <Card className={`card-tech metric-card animate-slide-up stagger-${atraso}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--info)))] opacity-20" />
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

function MiniStat({ titulo, valor, subtitulo }: { titulo: string; valor: number; subtitulo: string }) {
  return (
    <Card className="card-tech card-tech-glow">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{titulo}</p>
        <p className="text-2xl font-bold mt-1">{valor}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
      </CardContent>
    </Card>
  )
}
