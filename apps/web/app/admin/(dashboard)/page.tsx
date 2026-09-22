'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Gauge,
  GraduationCap,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'

type Usuario = {
  id: string
  nome: string
  tipo: 'ADMIN' | 'PERSONAL' | 'ALUNO'
  criado_em: string
}

type Treino = {
  id: string
  ativo: boolean
  criado_em: string
}

type Execucao = {
  id: string
  aluno_id: string
  data_registro: string
}

type Vinculo = {
  id: string
  status: 'ATIVO' | 'INATIVO'
  criado_em: string
}

const glass = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 18px 48px rgba(0,0,0,0.28)',
}

const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

function diasAtras(data: string) {
  return (Date.now() - new Date(data).getTime()) / 86_400_000
}

function estaNosUltimos(data: string, dias: number) {
  return diasAtras(data) <= dias
}

function contarPeriodo<T extends { data_registro?: string; criado_em?: string }>(
  lista: T[],
  inicioDiasAtras: number,
  fimDiasAtras = 0
) {
  const agora = Date.now()
  const inicio = agora - inicioDiasAtras * 86_400_000
  const fim = agora - fimDiasAtras * 86_400_000
  return lista.filter((item) => {
    const valor = item.data_registro ?? item.criado_em
    if (!valor) return false
    const t = new Date(valor).getTime()
    return t >= inicio && t <= fim
  }).length
}

export default function AdminDashboardPage() {
  const { data: metricas, isLoading } = useQuery({
    queryKey: ['admin-command-center'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const supabase = createClient()

      const [usuariosR, treinosR, execucoesR, vinculosR, exerciciosR] = await Promise.all([
        supabase.from('usuarios').select('id, nome, tipo, criado_em'),
        supabase.from('treinos').select('id, ativo, criado_em'),
        supabase.from('registro_execucao').select('id, aluno_id, data_registro').order('data_registro', { ascending: false }),
        supabase.from('personal_alunos').select('id, status, criado_em'),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }),
      ])

      const usuarios = (usuariosR.data ?? []) as Usuario[]
      const treinos = (treinosR.data ?? []) as Treino[]
      const execucoes = (execucoesR.data ?? []) as Execucao[]
      const vinculos = (vinculosR.data ?? []) as Vinculo[]

      const personals = usuarios.filter((u) => u.tipo === 'PERSONAL')
      const alunos = usuarios.filter((u) => u.tipo === 'ALUNO')
      const vinculosAtivos = vinculos.filter((v) => v.status === 'ATIVO').length
      const treinosAtivos = treinos.filter((t) => t.ativo).length
      const execucoes7 = contarPeriodo(execucoes, 7)
      const execucoes14a7 = contarPeriodo(execucoes, 14, 7)
      const novos7 = usuarios.filter((u) => estaNosUltimos(u.criado_em, 7)).length
      const novos30 = usuarios.filter((u) => estaNosUltimos(u.criado_em, 30)).length
      const inativos = vinculos.filter((v) => v.status === 'INATIVO').length

      const coberturaAlunos = alunos.length ? Math.min(100, (vinculosAtivos / alunos.length) * 100) : 100
      const coberturaTreinos = treinos.length ? (treinosAtivos / treinos.length) * 100 : 100
      const uso = Math.min(100, execucoes7 * 8)
      const crescimento = usuarios.length ? Math.min(100, (novos30 / usuarios.length) * 300) : 60
      const pulse = Math.max(
        35,
        Math.round(coberturaAlunos * 0.3 + coberturaTreinos * 0.25 + uso * 0.3 + crescimento * 0.15)
      )

      const variacaoExecucoes = execucoes14a7
        ? Math.round(((execucoes7 - execucoes14a7) / execucoes14a7) * 100)
        : execucoes7 > 0 ? 100 : 0

      const ultimos14Dias = Array.from({ length: 14 }, (_, index) => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - (13 - index))
        const proximo = new Date(d)
        proximo.setDate(proximo.getDate() + 1)
        const valor = execucoes.filter((e) => {
          const t = new Date(e.data_registro)
          return t >= d && t < proximo
        }).length
        return { label: fmt.format(d), valor }
      })

      const maxExec = Math.max(1, ...ultimos14Dias.map((d) => d.valor))

      const insights = [
        execucoes7 === 0
          ? { tone: 'danger', title: 'Uso sem atividade', text: 'Nenhuma execução foi registrada nos últimos 7 dias.', action: '/admin/usuarios' }
          : variacaoExecucoes < -20
            ? { tone: 'warning', title: 'Queda de atividade', text: `Execuções caíram ${Math.abs(variacaoExecucoes)}% contra a semana anterior.`, action: '/admin/usuarios' }
            : { tone: 'success', title: 'Ritmo de treino saudável', text: `${execucoes7} execuções nos últimos 7 dias.`, action: '/admin/usuarios' },
        inativos > 0
          ? { tone: 'warning', title: 'Vínculos pedem atenção', text: `${inativos} vínculo(s) personal-aluno estão inativos.`, action: '/admin/personais' }
          : { tone: 'success', title: 'Base conectada', text: 'Todos os vínculos cadastrados estão ativos.', action: '/admin/personais' },
        treinos.length > 0 && coberturaTreinos < 70
          ? { tone: 'warning', title: 'Treinos inativos', text: `Só ${Math.round(coberturaTreinos)}% dos treinos estão ativos.`, action: '/admin/personais' }
          : { tone: 'info', title: 'Biblioteca pronta', text: `${exerciciosR.count ?? 0} exercícios disponíveis na base global.`, action: '/admin/exercicios' },
      ]

      const nomes = new Map(usuarios.map((u) => [u.id, u.nome]))
      const atividades = [
        ...usuarios
          .slice()
          .sort((a, b) => +new Date(b.criado_em) - +new Date(a.criado_em))
          .slice(0, 4)
          .map((u) => ({
            id: `user-${u.id}`,
            tipo: 'usuario',
            titulo: `${u.nome} entrou no ShapeOS`,
            detalhe: u.tipo,
            data: u.criado_em,
          })),
        ...execucoes.slice(0, 5).map((e) => ({
          id: `exec-${e.id}`,
          tipo: 'execucao',
          titulo: `${nomes.get(e.aluno_id) ?? 'Aluno'} registrou uma execução`,
          detalhe: 'atividade de treino',
          data: e.data_registro,
        })),
      ]
        .sort((a, b) => +new Date(b.data) - +new Date(a.data))
        .slice(0, 6)

      return {
        pulse,
        usuarios: usuarios.length,
        personals: personals.length,
        alunos: alunos.length,
        novos7,
        novos30,
        treinosAtivos,
        totalTreinos: treinos.length,
        execucoes7,
        variacaoExecucoes,
        vinculosAtivos,
        totalExercicios: exerciciosR.count ?? 0,
        ultimos14Dias,
        maxExec,
        insights,
        atividades,
      }
    },
  })

  if (isLoading || !metricas) {
    return (
      <div className="space-y-5">
        <div className="h-36 rounded-3xl skeleton" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((n) => <div key={n} className="h-28 rounded-2xl skeleton" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 rounded-3xl skeleton" />
          <div className="h-80 rounded-3xl skeleton" />
        </div>
      </div>
    )
  }

  const statusPulse = metricas.pulse >= 80 ? 'Excelente' : metricas.pulse >= 65 ? 'Saudável' : 'Atenção'
  const frasePulse = metricas.pulse >= 80
    ? <>O ShapeOS está <span className="text-[#00D2D2]">excelente</span>.</>
    : metricas.pulse >= 65
      ? <>O ShapeOS está <span className="text-[#00D2D2]">saudável</span>.</>
      : <>O ShapeOS <span className="text-[#00D2D2]">precisa de atenção</span>.</>

  return (
    <div className="relative space-y-5 pb-10" data-testid="admin-command-center">
      <div
        aria-hidden
        className="pointer-events-none fixed right-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full blur-3xl opacity-10"
        style={{ background: '#00D2D2' }}
      />

      <section className="relative overflow-hidden rounded-3xl p-5 md:p-7" style={glass}>
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.45) 1px,transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D2D2] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00D2D2]" />
              </span>
              Command Center · dados atualizados automaticamente
            </div>
            <h1
              className="mt-4 text-3xl font-semibold leading-tight text-[#F5F5F5] md:text-5xl"
              style={{ fontFamily: "'Unbounded', sans-serif", letterSpacing: '-0.045em' }}
            >
{frasePulse}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base">
              Uma visão operacional da plataforma para saber o que está crescendo, o que está sendo usado e onde você precisa agir.
            </p>
          </div>

          <div className="flex items-center gap-5 rounded-2xl px-5 py-4" style={{ background: 'rgba(0,210,210,.04)', border: '1px solid rgba(0,210,210,.16)' }}>
            <div
              className="relative grid h-24 w-24 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#00D2D2 ${metricas.pulse * 3.6}deg, rgba(255,255,255,.07) 0deg)`,
                boxShadow: '0 0 35px rgba(0,210,210,.12)',
              }}
            >
              <div className="absolute inset-[7px] rounded-full bg-[#1A1A1A]" />
              <div className="relative text-center">
                <div className="text-2xl font-bold text-[#F5F5F5]">{metricas.pulse}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">Pulse</div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F5]">
                <Gauge className="h-4 w-4 text-[#00D2D2]" /> ShapeOS Pulse
              </div>
              <p className="mt-1 max-w-[190px] text-xs leading-relaxed text-zinc-500">
                Combina uso, vínculos, treinos ativos e crescimento recente.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Usuários" value={metricas.usuarios} detail={`+${metricas.novos7} esta semana`} accent="#00D2D2" />
        <KpiCard icon={UserCheck} label="Personais" value={metricas.personals} detail={`${metricas.vinculosAtivos} vínculos ativos`} accent="#8BE9A8" />
        <KpiCard icon={GraduationCap} label="Alunos" value={metricas.alunos} detail={`+${metricas.novos30} nos últimos 30d`} accent="#70A5FF" />
        <KpiCard
          icon={Activity}
          label="Execuções · 7d"
          value={metricas.execucoes7}
          detail={`${metricas.variacaoExecucoes >= 0 ? '+' : ''}${metricas.variacaoExecucoes}% vs. semana anterior`}
          accent={metricas.variacaoExecucoes >= 0 ? '#FF7043' : '#FF8B8B'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
        <section className="rounded-3xl p-5 md:p-6" style={glass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
                <Zap className="h-4 w-4 text-[#FF7043]" /> Pulso de atividade
              </div>
              <p className="mt-1 text-xs text-zinc-500">Execuções registradas nos últimos 14 dias.</p>
            </div>
            <div className="rounded-full px-3 py-1 text-[10px] font-medium text-[#00D2D2]" style={{ background: 'rgba(0,210,210,.08)', border: '1px solid rgba(0,210,210,.18)' }}>
              ao vivo
            </div>
          </div>

          <div className="mt-8 flex h-44 items-end gap-2">
            {metricas.ultimos14Dias.map((dia, index) => {
              const altura = dia.valor === 0 ? 5 : Math.max(12, (dia.valor / metricas.maxExec) * 100)
              const recente = index >= 7
              return (
                <div key={dia.label + index} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex h-36 w-full items-end">
                    <div
                      className="w-full rounded-t-lg transition-all duration-300 group-hover:opacity-100"
                      title={`${dia.valor} execuções em ${dia.label}`}
                      style={{
                        height: `${altura}%`,
                        minHeight: 5,
                        background: recente
                          ? 'linear-gradient(180deg,#00D2D2,rgba(0,210,210,.16))'
                          : 'linear-gradient(180deg,rgba(255,112,67,.7),rgba(255,112,67,.1))',
                        opacity: dia.valor ? 0.82 : 0.25,
                        boxShadow: recente && dia.valor ? '0 -8px 22px rgba(0,210,210,.08)' : 'none',
                      }}
                    />
                  </div>
                  <span className="hidden text-[9px] text-zinc-600 md:block">{index % 2 === 0 ? dia.label : ''}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniSignal icon={Dumbbell} value={metricas.treinosAtivos} label={`treinos ativos de ${metricas.totalTreinos}`} />
            <MiniSignal icon={UserCheck} value={metricas.vinculosAtivos} label="relações personal-aluno ativas" />
            <MiniSignal icon={Sparkles} value={metricas.totalExercicios} label="exercícios na biblioteca global" />
          </div>
        </section>

        <section className="rounded-3xl p-5 md:p-6" style={glass}>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[#00D2D2]" />
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Shape Intelligence</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Sinais calculados automaticamente com os dados atuais.</p>

          <div className="mt-5 space-y-3">
            {metricas.insights.map((item, index) => (
              <Link
                key={item.title}
                href={item.action}
                className="group block rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                style={{
                  background: index === 0 ? 'rgba(0,210,210,.045)' : 'rgba(255,255,255,.025)',
                  border: `1px solid ${item.tone === 'warning' || item.tone === 'danger' ? 'rgba(255,112,67,.2)' : 'rgba(255,255,255,.065)'}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl"
                    style={{ background: item.tone === 'warning' || item.tone === 'danger' ? 'rgba(255,112,67,.1)' : 'rgba(0,210,210,.08)' }}
                  >
                    {item.tone === 'warning' || item.tone === 'danger'
                      ? <AlertTriangle className="h-3.5 w-3.5 text-[#FF7043]" />
                      : <CheckCircle2 className="h-3.5 w-3.5 text-[#00D2D2]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#F5F5F5]">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{item.text}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl p-5 md:p-6" style={glass}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">Agora no ShapeOS</h2>
              <p className="mt-1 text-xs text-zinc-500">Atividade recente da plataforma.</p>
            </div>
            <Clock3 className="h-4 w-4 text-zinc-600" />
          </div>

          <div className="mt-5 space-y-1">
            {metricas.atividades.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">
                A atividade recente aparecerá aqui.
              </div>
            ) : metricas.atividades.map((item, index) => (
              <div key={item.id} className="relative flex gap-3 py-3">
                {index < metricas.atividades.length - 1 && <div className="absolute left-[15px] top-9 h-[calc(100%-15px)] w-px bg-white/[0.06]" />}
                <div
                  className="relative z-10 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
                  style={{ background: item.tipo === 'execucao' ? 'rgba(0,210,210,.09)' : 'rgba(255,112,67,.09)', border: '1px solid rgba(255,255,255,.07)' }}
                >
                  {item.tipo === 'execucao'
                    ? <Activity className="h-3.5 w-3.5 text-[#00D2D2]" />
                    : <Users className="h-3.5 w-3.5 text-[#FF7043]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-200">{item.titulo}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">{item.detalhe}</p>
                </div>
                <span className="text-[10px] text-zinc-600">{tempoRelativo(item.data)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl p-5 md:p-6" style={glass}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#FF7043]" />
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Ações rápidas</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Entre direto nos pontos mais importantes da operação.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <QuickAction href="/admin/usuarios" icon={Users} title="Usuários" text="Auditar base e perfis" accent="#00D2D2" />
            <QuickAction href="/admin/personais" icon={UserCheck} title="Personais" text="Ver alunos e vínculos" accent="#8BE9A8" />
            <QuickAction href="/admin/exercicios" icon={Dumbbell} title="Biblioteca" text="Gerenciar exercícios" accent="#FF7043" />
            <QuickAction href="/admin/conta" icon={Gauge} title="Conta" text="Segurança e acesso" accent="#70A5FF" />
          </div>
        </section>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: typeof Users
  label: string
  value: number
  detail: string
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl p-4 transition-transform hover:-translate-y-0.5" style={glass}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-10" style={{ background: accent }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-[#F5F5F5]" style={{ fontFamily: "'Unbounded', sans-serif" }}>{value}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{detail}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${accent}14`, border: `1px solid ${accent}2c` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
    </div>
  )
}

function MiniSignal({ icon: Icon, value, label }: { icon: typeof Dumbbell; value: number; label: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.022)', border: '1px solid rgba(255,255,255,.055)' }}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#00D2D2]" />
        <span className="text-lg font-semibold text-zinc-100">{value}</span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{label}</p>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  text,
  accent,
}: {
  href: string
  icon: typeof Users
  title: string
  text: string
  accent: string
}) {
  return (
    <Link href={href} className="group rounded-2xl p-4 transition-all hover:-translate-y-0.5" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.065)' }}>
      <div className="flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-colors group-hover:text-zinc-400" />
      </div>
      <p className="mt-4 text-sm font-semibold text-zinc-200">{title}</p>
      <p className="mt-1 text-[11px] text-zinc-600">{text}</p>
    </Link>
  )
}

function tempoRelativo(data: string) {
  const diff = Date.now() - new Date(data).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}
