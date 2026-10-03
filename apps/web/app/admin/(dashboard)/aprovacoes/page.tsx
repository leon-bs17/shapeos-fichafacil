'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileCheck2,
  Loader2,
  Mail,
  MoreVertical,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react'

type StatusConta = 'PENDENTE' | 'ATIVO' | 'BLOQUEADO'
type FiltroStatus = 'TODOS' | 'PENDENTE' | 'ATIVO'
type FiltroPeriodo = 'TODOS' | '30_DIAS'

type PersonalCadastro = {
  id: string
  nome: string
  email: string
  tipo: 'PERSONAL'
  status_conta: StatusConta
  criado_em: string
}

const ITENS_POR_PAGINA = 5

function normalizarTexto(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function iniciais(nome: string, email: string) {
  const partes = nome?.trim().split(/\s+/).filter(Boolean) ?? []
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return email?.charAt(0)?.toUpperCase() || 'P'
}

export default function AdminAprovacoesPage() {
  const queryClient = useQueryClient()
  const buscaRef = useRef<HTMLInputElement>(null)
  const [buscaLocal, setBuscaLocal] = useState('')
  const [atalhoBusca, setAtalhoBusca] = useState('Ctrl + K')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS')
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('TODOS')
  const [pagina, setPagina] = useState(1)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [personalSelecionado, setPersonalSelecionado] = useState<PersonalCadastro | null>(null)

  const { data: cadastros, isLoading } = useQuery({
    queryKey: ['admin-aprovacoes'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, status_conta, criado_em')
        .eq('tipo', 'PERSONAL')
        .order('criado_em', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as PersonalCadastro[]
    },
  })

  useEffect(() => {
    setAtalhoBusca(/Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘ + K' : 'Ctrl + K')

    const atalhos = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        buscaRef.current?.focus()
        buscaRef.current?.select()
      }

      if (event.key === 'Escape') {
        setMenuAberto(null)
        setPersonalSelecionado(null)
      }
    }

    window.addEventListener('keydown', atalhos)
    return () => window.removeEventListener('keydown', atalhos)
  }, [])

  const pendentes = useMemo(
    () => (cadastros ?? []).filter((personal) => personal.status_conta === 'PENDENTE'),
    [cadastros],
  )

  const cadastrosFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaLocal.trim())
    const limite30Dias = Date.now() - 30 * 24 * 60 * 60 * 1000

    return (cadastros ?? []).filter((personal) => {
      if (filtroStatus !== 'TODOS' && personal.status_conta !== filtroStatus) return false
      if (filtroPeriodo === '30_DIAS' && new Date(personal.criado_em).getTime() < limite30Dias) return false
      if (!termo) return true

      const statusLegivel = personal.status_conta === 'PENDENTE'
        ? 'pendente'
        : personal.status_conta === 'ATIVO'
          ? 'aprovado ativo'
          : 'bloqueado'

      return [personal.nome, personal.email, personal.status_conta, statusLegivel]
        .some((valor) => normalizarTexto(valor ?? '').includes(termo))
    })
  }, [buscaLocal, cadastros, filtroPeriodo, filtroStatus])

  useEffect(() => {
    setPagina(1)
  }, [buscaLocal, filtroPeriodo, filtroStatus])

  const totalPaginas = Math.max(1, Math.ceil(cadastrosFiltrados.length / ITENS_POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA
  const cadastrosPaginados = cadastrosFiltrados.slice(inicioPagina, inicioPagina + ITENS_POR_PAGINA)

  const acao = useMutation({
    mutationFn: async ({
      personal,
      novoStatus,
    }: {
      personal: PersonalCadastro
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
      setMenuAberto(null)
      setPersonalSelecionado(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-aprovacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-auditoria'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-command-center'] }),
      ])
    },
  })

  const totalPendentes = pendentes.length
  const filtrosAtivos = Boolean(buscaLocal.trim()) || filtroStatus !== 'TODOS' || filtroPeriodo !== 'TODOS'

  function limparFiltros() {
    setBuscaLocal('')
    setFiltroStatus('TODOS')
    setFiltroPeriodo('TODOS')
    buscaRef.current?.focus()
  }

  function statusVisual(status: StatusConta) {
    if (status === 'PENDENTE') {
      return {
        label: 'Pendente',
        className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-300',
      }
    }
    if (status === 'ATIVO') {
      return {
        label: 'Aprovado',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-300',
      }
    }
    return {
      label: 'Bloqueado',
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-300',
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <section data-approvals-hero className="relative isolate min-h-[232px] overflow-hidden rounded-[28px] border border-slate-200 bg-white px-7 py-9 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:px-10 sm:py-10 dark:border-white/10 dark:bg-[#08131c] dark:shadow-2xl dark:shadow-black/20">
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
            <span className="block">Mais<br />profissionais</span>
            <span className="block">Mais<br />resultados</span>
            <span className="ml-auto mt-3 block h-1 w-28 -rotate-[7deg] rounded-full bg-teal-500 shadow-[0_0_16px_rgba(20,184,166,0.22)] dark:bg-[var(--shapeos-brand)] dark:shadow-[0_0_18px_rgba(0,255,204,0.40)]" />
          </div>
        </div>
      </section>

      <div data-approvals-summary className="grid gap-4 lg:grid-cols-2">
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

      <section data-approvals-filters className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)] sm:px-5 sm:py-5 dark:border-white/10 dark:bg-card/70 dark:shadow-xl dark:shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 text-slate-500 shadow-[0_4px_14px_rgba(15,23,42,0.025)] transition focus-within:border-cyan-300 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.07)] dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-400 dark:focus-within:border-primary/30">
            <Search className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.8} />
            <input
              ref={buscaRef}
              value={buscaLocal}
              onChange={(event) => setBuscaLocal(event.target.value)}
              placeholder="Buscar por nome, e-mail ou status..."
              aria-label="Buscar cadastros na página Aprovações"
              aria-keyshortcuts={atalhoBusca === '⌘ + K' ? 'Meta+K' : 'Control+K'}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-500"
            />

            {buscaLocal ? (
              <button
                type="button"
                onClick={() => {
                  setBuscaLocal('')
                  buscaRef.current?.focus()
                }}
                aria-label="Limpar busca"
                title="Limpar busca"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.9} />
              </button>
            ) : null}

            <kbd title={`Focar a pesquisa (${atalhoBusca})`} aria-label={`Atalho para focar a pesquisa: ${atalhoBusca}`} className="hidden shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 sm:flex dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400">
              {atalhoBusca}
            </kbd>
          </label>

          <div className="flex flex-wrap items-center gap-2.5" aria-label="Filtros de cadastro">
            {([
              ['TODOS', 'Todos'],
              ['PENDENTE', 'Pendentes'],
              ['ATIVO', 'Aprovados'],
            ] as const).map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltroStatus(valor)}
                aria-pressed={filtroStatus === valor}
                className={`h-12 rounded-[18px] px-5 text-xs font-bold transition ${
                  filtroStatus === valor
                    ? 'border border-cyan-300 bg-cyan-50/80 text-cyan-800 shadow-[0_7px_18px_rgba(6,182,212,0.08)] dark:border-primary/35 dark:bg-primary/10 dark:text-primary'
                    : 'border border-transparent bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.035] dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}

            <label className="flex h-12 items-center gap-2 rounded-[18px] border border-slate-100 bg-white px-4 text-xs font-bold text-slate-400 shadow-[0_4px_14px_rgba(15,23,42,0.02)] transition hover:border-cyan-200 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-300 dark:hover:border-primary/20">
              <CalendarDays className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.8} />
              <select
                value={filtroPeriodo}
                onChange={(event) => setFiltroPeriodo(event.target.value as FiltroPeriodo)}
                aria-label="Filtrar por período"
                className="cursor-pointer bg-transparent pr-1 outline-none"
              >
                <option value="TODOS">Todo período</option>
                <option value="30_DIAS">Últimos 30 dias</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 px-0.5 text-[11px] font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-500">
          <span>{cadastrosFiltrados.length} {cadastrosFiltrados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</span>
          {filtrosAtivos ? (
            <button
              type="button"
              onClick={limparFiltros}
              className="w-fit text-cyan-700 transition hover:text-cyan-800 dark:text-primary dark:hover:text-primary/80"
            >
              Limpar busca e filtros
            </button>
          ) : (
            <span>Busca instantânea por nome, e-mail ou status</span>
          )}
        </div>
      </section>

      {acao.error ? (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {acao.error instanceof Error ? acao.error.message : 'Não foi possível concluir a ação.'}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((n) => <div key={n} className="h-20 rounded-2xl skeleton" />)}
        </div>
      ) : !(cadastros?.length) ? (
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
      ) : !cadastrosFiltrados.length ? (
        <section className="rounded-[24px] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_10px_28px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-card/70">
          <Search className="mx-auto h-8 w-8 text-teal-500 dark:text-primary" strokeWidth={1.6} />
          <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">Nenhum cadastro encontrado</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {buscaLocal.trim()
              ? <>Nenhum resultado para <span className="font-bold text-slate-700 dark:text-slate-300">“{buscaLocal.trim()}”</span>. Ajuste a busca ou os filtros.</>
              : 'Ajuste os filtros para visualizar outros profissionais.'}
          </p>
          <button
            type="button"
            onClick={limparFiltros}
            className="mt-4 text-sm font-bold text-cyan-700 hover:text-cyan-800 dark:text-primary dark:hover:text-primary/80"
          >
            Limpar filtros
          </button>
        </section>
      ) : (
        <section data-approvals-table className="rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.045)] dark:border-white/10 dark:bg-card/70 dark:shadow-xl dark:shadow-black/10">
          <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1.6fr)_180px_140px_235px] gap-4 rounded-t-[24px] border-b border-slate-100 bg-white px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#536a9c] md:grid dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-500">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Data do cadastro</span>
            <span>Status</span>
            <span className="text-center">Ações</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {cadastrosPaginados.map((personal) => {
              const processando = acao.isPending && acao.variables?.personal.id === personal.id
              const status = statusVisual(personal.status_conta)
              const pendente = personal.status_conta === 'PENDENTE'

              return (
                <div key={personal.id} className="grid min-h-[78px] gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1.6fr)_180px_140px_235px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#6f86b6,#4f678f)] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(64,82,122,0.16)] ring-1 ring-[#5f74a3]/15 dark:bg-[linear-gradient(145deg,#5974a7,#344966)] dark:ring-white/10">
                      {iniciais(personal.nome, personal.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#0d2148] dark:text-white">
                        {personal.nome?.trim() || 'Personal sem nome'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400 md:hidden dark:text-slate-500">Personal</p>
                    </div>
                  </div>

                  <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium text-[#6076a3] dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5 shrink-0 md:hidden" strokeWidth={1.7} />
                    {personal.email}
                  </p>

                  <p className="text-[12px] font-medium text-[#6076a3] dark:text-slate-400">
                    {new Date(personal.criado_em).toLocaleDateString('pt-BR')}
                  </p>

                  <div>
                    <span className={`inline-flex h-[31px] min-w-[87px] items-center justify-center rounded-full border px-3 text-[12px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-start gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => setPersonalSelecionado(personal)}
                      className="inline-flex h-10 min-w-[116px] items-center justify-center gap-2 rounded-[14px] border border-cyan-100 bg-[linear-gradient(180deg,#f7fdfe,#eefbfc)] px-4 text-[12px] font-semibold text-[#0d2148] shadow-[0_3px_10px_rgba(14,165,188,0.035)] transition hover:border-cyan-200 hover:bg-cyan-50 dark:border-primary/15 dark:bg-primary/[0.05] dark:text-white dark:hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4 text-cyan-600 dark:text-primary" strokeWidth={1.9} />
                      {pendente ? 'Analisar' : 'Ver'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMenuAberto((id) => id === personal.id ? null : personal.id)}
                      aria-label={`Mais ações para ${personal.nome || personal.email}`}
                      aria-expanded={menuAberto === personal.id}
                      className="grid h-10 w-10 place-items-center rounded-[13px] border border-slate-200 bg-white text-[#526a9c] shadow-[0_2px_8px_rgba(15,23,42,0.025)] transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                    >
                      <MoreVertical className="h-4 w-4" strokeWidth={1.9} />
                    </button>

                    {menuAberto === personal.id ? (
                      <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0c1721] dark:shadow-black/30">
                        <button
                          type="button"
                          onClick={() => {
                            setPersonalSelecionado(personal)
                            setMenuAberto(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                        >
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Ver detalhes
                        </button>

                        {pendente ? (
                          <>
                            <button
                              type="button"
                              disabled={processando}
                              onClick={() => acao.mutate({ personal, novoStatus: 'ATIVO' })}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
                            >
                              {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
                              Aprovar
                            </button>
                            <button
                              type="button"
                              disabled={processando}
                              onClick={() => acao.mutate({ personal, novoStatus: 'BLOQUEADO' })}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-400/10"
                            >
                              <Ban className="h-3.5 w-3.5" strokeWidth={1.8} />
                              Bloquear
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-b-[24px] border-t border-slate-100 px-5 py-4 text-[12px] font-medium text-[#6076a3] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-slate-500">
            <span>
              Mostrando {cadastrosFiltrados.length ? inicioPagina + 1 : 0} a {Math.min(inicioPagina + ITENS_POR_PAGINA, cadastrosFiltrados.length)} de {cadastrosFiltrados.length} resultados
            </span>

            <div className="flex items-center gap-1.5" aria-label="Paginação">
              <button
                type="button"
                onClick={() => setPagina(1)}
                disabled={paginaAtual === 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Primeira página"
              >
                <ChevronLeft className="h-3.5 w-3.5 -mr-1" strokeWidth={1.8} />
                <ChevronLeft className="h-3.5 w-3.5 -ml-1" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                disabled={paginaAtual === 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
              <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-gradient-to-b from-cyan-400 to-teal-500 px-2 text-xs font-bold text-white shadow-[0_5px_14px_rgba(20,184,166,0.20)]">
                {paginaAtual}
              </span>
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setPagina(totalPaginas)}
                disabled={paginaAtual === totalPaginas}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Última página"
              >
                <ChevronRight className="h-3.5 w-3.5 -mr-1" strokeWidth={1.8} />
                <ChevronRight className="h-3.5 w-3.5 -ml-1" strokeWidth={1.8} />
              </button>
            </div>
          </div>
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

      {personalSelecionado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onMouseDown={() => setPersonalSelecionado(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do personal"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#0b1721]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#6f86b6,#4f678f)] text-sm font-semibold text-white">
                  {iniciais(personalSelecionado.nome, personalSelecionado.email)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{personalSelecionado.nome?.trim() || 'Personal sem nome'}</h3>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{personalSelecionado.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonalSelecionado(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                aria-label="Fechar detalhes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm dark:border-white/10 dark:bg-white/[0.025]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Data do cadastro</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(personalSelecionado.criado_em).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusVisual(personalSelecionado.status_conta).className}`}>
                  {statusVisual(personalSelecionado.status_conta).label}
                </span>
              </div>
            </div>

            {personalSelecionado.status_conta === 'PENDENTE' ? (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => acao.mutate({ personal: personalSelecionado, novoStatus: 'BLOQUEADO' })}
                  disabled={acao.isPending}
                  className="gap-2 rounded-xl border-red-200 text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-400/10"
                >
                  <Ban className="h-4 w-4" />
                  Bloquear
                </Button>
                <Button
                  onClick={() => acao.mutate({ personal: personalSelecionado, novoStatus: 'ATIVO' })}
                  disabled={acao.isPending}
                  className="gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 dark:bg-primary dark:text-primary-foreground"
                >
                  {acao.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aprovar
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
