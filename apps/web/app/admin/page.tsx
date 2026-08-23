'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AdminShell } from './layout'
import { Users, UserCheck, ClipboardList, Activity, TrendingUp, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatarData } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <DashboardConteudo />
    </AdminShell>
  )
}

function DashboardConteudo() {
  const { data: metricas, isLoading } = useQuery({
    queryKey: ['admin-metricas'],
    queryFn: async () => {
      const supabase = createClient()

      const [usuarios, treinos, execucoes, vinculos] = await Promise.all([
        supabase.from('usuarios').select('id, tipo, criado_em'),
        supabase.from('treinos').select('id, ativo, criado_em'),
        supabase.from('registro_execucao').select('id, data_registro'),
        supabase.from('personal_alunos').select('id, status'),
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

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm">
          Visao geral da plataforma ShapeOS.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Usuarios totais" valor={metricas?.totalUsuarios ?? 0} icone={<Users className="h-5 w-5" />} cor="primary" atraso={1} />
        <MetricCard titulo="Personais" valor={metricas?.totalPersonals ?? 0} icone={<UserCheck className="h-5 w-5" />} cor="success" atraso={2} />
        <MetricCard titulo="Alunos" valor={metricas?.totalAlunos ?? 0} icone={<Users className="h-5 w-5" />} cor="info" atraso={3} />
        <MetricCard titulo="Execucoes" valor={metricas?.totalExecucoes ?? 0} icone={<Activity className="h-5 w-5" />} cor="warning" atraso={4} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniStat titulo="Treinos ativos" valor={metricas?.treinosAtivos ?? 0} subtitulo={`de ${metricas?.totalTreinos ?? 0} total`} />
        <MiniStat titulo="Vinculos ativos" valor={metricas?.vinculosAtivos ?? 0} subtitulo="personal-aluno" />
        <MiniStat titulo="Exercicios cadastrados" valor={0} subtitulo="biblioteca global" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-slide-up stagger-5">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Novos usuarios (6 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metricas?.usuariosPorMes ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                <Bar dataKey="usuarios" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-slide-up stagger-6">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Treinos criados (6 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metricas?.treinosPorMes ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                <Line type="monotone" dataKey="treinos" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="animate-slide-up stagger-7">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Execucoes (7 dias)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas?.execucoesPorDia ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                <Bar dataKey="execucoes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-slide-up stagger-8">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Distribuicao</h3>
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
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-slide-up stagger-9">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Ultimos usuarios</h3>
            <div className="space-y-3">
              {metricas?.ultimosUsuarios.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {u.tipo === 'ADMIN' ? '★' : u.tipo === 'PERSONAL' ? 'P' : 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.tipo}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatarData(u.criado_em)}</p>
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

function MetricCard({ titulo, valor, icone, cor, atraso }: {
  titulo: string; valor: number; icone: React.ReactNode; cor: string; atraso: number
}) {
  const cores: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
  }
  return (
    <Card className={`animate-slide-up stagger-${atraso} hover:shadow-md transition-shadow duration-200`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cores[cor] ?? cores.primary}`}>
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
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{titulo}</p>
        <p className="text-2xl font-bold mt-1">{valor}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
      </CardContent>
    </Card>
  )
}
