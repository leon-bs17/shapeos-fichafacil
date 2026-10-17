'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileCheck2,
  Loader2,
  Mail,
  Search,
  Sparkles,
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
  const detailsRef = useRef<HTMLDialogElement>(null)
 // Cancel color interpolation before the browser paints a newly applied theme.
 useEffect(() => {
  const html = document.documentElement
  const theme = () => html.classList.contains('dark') ? 'dark' : 'light'
  let previousTheme = theme()
  let frame = 0
  let suppression: HTMLStyleElement | null = null
  const restore = () => { suppression?.remove(); suppression = null }
  const observer = new MutationObserver(() => {
   const nextTheme = theme()
   if (nextTheme === previousTheme) return
   previousTheme = nextTheme
   cancelAnimationFrame(frame)
   restore()
   suppression = document.createElement('style')
   suppression.textContent = '.approvals-workspace.approvals-workspace.approvals-workspace.approvals-workspace.approvals-workspace.approvals-workspace.approvals-workspace.approvals-workspace * { transition: none !important; }'
   document.head.appendChild(suppression)
   // Flush the final palette while transitions are suppressed.
   const control = document.querySelector('.approvals-workspace')
   if (control) window.getComputedStyle(control).backgroundColor
   frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(restore)
   })
  })
  observer.observe(html, { attributes: true, attributeFilter: ['class'] })
  return () => { observer.disconnect(); cancelAnimationFrame(frame); restore() }
 }, [])


  const [buscaLocal, setBuscaLocal] = useState('')
  const [atalhoBusca, setAtalhoBusca] = useState('Ctrl + K')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS')
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('TODOS')
  const [pagina, setPagina] = useState(1)
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
      setPersonalSelecionado(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-aprovacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-auditoria'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-command-center'] }),
      ])
    },
  })

  useEffect(() => {
    if (!personalSelecionado) return
    const dialog = detailsRef.current
    const focused = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
      focused?.focus()
    }
  }, [personalSelecionado])

  function fecharDetalhes() {
    if (!acao.isPending) setPersonalSelecionado(null)
  }

  const totalAprovados = (cadastros ?? []).filter((personal) => personal.status_conta === 'ATIVO').length
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
    <div data-approvals-refined className="approvals-workspace space-y-5">
      <section data-approvals-hero className="relative isolate overflow-hidden">
        <header data-approvals-heading>
          <p data-approval-hero-label className="eyebrow">Administração</p>
          <h2 className="approval-banner-title">Aprovação de <span>cadastros</span></h2>
          <p data-approval-hero-subtitle>Acompanhe os novos profissionais da plataforma.</p>
        </header>
        <svg data-approvals-wireframe viewBox="0 0 500 320" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="0.65">
            {Array.from({ length: 34 }, (_, i) => (
              <ellipse key={i} cx={250 + Math.sin(i * Math.PI / 17) * 35} cy="150"
                rx={98 + i * 3.2} ry={118 + i * 2.5}
                transform={`rotate(${i * 5.3} 250 150)`} />
            ))}
          </g>
        </svg>
      </section>    <div data-approvals-summary className="grid gap-4 lg:grid-cols-2">
        <Card data-approval-summary-card="pending" className="overflow-hidden rounded-2xl border-border bg-card shadow-none">
          <CardContent data-mobile-summary className="flex items-center gap-5 p-5 sm:p-6">
            <div data-admin-metric-icon data-metric-tone="warning" aria-hidden="true" data-pending-summary-icon className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
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
          <CardContent data-mobile-summary className="flex items-center gap-5 p-5 sm:p-6">
            <div data-admin-metric-icon aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 dark:bg-primary/10 dark:text-primary dark:ring-0">
              <Users className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Acesso controlado</p>
              <p className="mt-0.5 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{totalAprovados}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Profissionais aprovados pela administração</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.7} />
          </CardContent>
        </Card>
      </div>

      <section className="approval-management" aria-label="Cadastros de profissionais">
        <header className="approval-management-heading"><h2>Cadastros de profissionais</h2><button type="button" className="approval-export" disabled={!cadastros?.length} onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify({ exportado_em: new Date().toISOString(), cadastros }, null, 2)], { type: 'application/json' }))
          const link = document.createElement('a')
          link.href = url
          link.download = 'shapeos-aprovacoes.json'
          link.click()
          URL.revokeObjectURL(url)
        }}><FileCheck2 size={15} aria-hidden="true"/>Exportar dados carregados</button></header>
      <section data-approvals-filters className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)] sm:px-5 sm:py-5 dark:border-white/10 dark:bg-card/70 dark:shadow-xl dark:shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <label data-admin-search className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 text-slate-500 shadow-[0_4px_14px_rgba(15,23,42,0.025)] transition   dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-400 ">
            <Search className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.8} />
            <input
              ref={buscaRef}
              value={buscaLocal}
              onChange={(event) => setBuscaLocal(event.target.value)}
              placeholder="Buscar nome ou e-mail"
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
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition    "
              >
                <X className="h-4 w-4" strokeWidth={1.9} />
              </button>
            ) : null}

            <kbd title={`Focar a pesquisa (${atalhoBusca})`} aria-label={`Atalho para focar a pesquisa: ${atalhoBusca}`} className="hidden shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 sm:flex dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400">
              {atalhoBusca}
            </kbd>
          </label>

          <div className="flex flex-wrap items-center gap-2.5" aria-label="Filtros de cadastro">
            <div data-approval-status-group>
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
                    : 'border border-transparent bg-transparent text-slate-400   dark:text-slate-400  '
                }`}
              >
                {label}
              </button>
            ))}

            </div>
            <ApprovalPeriod value={filtroPeriodo} onChange={setFiltroPeriodo} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 px-0.5 text-[11px] font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-500">
          <span>{cadastrosFiltrados.length} {cadastrosFiltrados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</span>
          {filtrosAtivos ? (
            <button
              type="button"
              onClick={limparFiltros}
              className="w-fit text-cyan-700 transition  dark:text-primary "
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
            className="relative mt-7 min-w-[260px] gap-3 rounded-full bg-teal-600 px-8 py-5 font-bold text-white shadow-[0_10px_28px_rgba(13,148,136,0.20)]  dark:bg-primary dark:text-primary-foreground dark:shadow-[0_10px_35px_rgba(0,255,204,0.18)] "
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
            className="mt-4 text-sm font-bold text-cyan-700  dark:text-primary "
          >
            Limpar filtros
          </button>
        </section>
      ) : (
        <section data-approvals-table className="rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.045)] dark:border-white/10 dark:bg-card/70 dark:shadow-xl dark:shadow-black/10">
          <div data-approvals-columns className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1.6fr)_180px_140px_235px] gap-4 rounded-t-[24px] border-b border-slate-100 bg-white px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#536a9c] md:grid dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-500">
            <span>Profissional</span>
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
                <div data-approvals-row key={personal.id} className="grid min-h-[78px] gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1.6fr)_180px_140px_235px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div data-approvals-avatar className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#6f86b6,#4f678f)] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(64,82,122,0.16)] ring-1 ring-[#5f74a3]/15 dark:bg-[linear-gradient(145deg,#5974a7,#344966)] dark:ring-white/10">
                      {iniciais(personal.nome, personal.email)}
                    </div>
                    <div className="approval-person-copy min-w-0">
                      <div className="approval-person-title">
                        <p className="approval-person-name text-[13px] font-semibold">
                          {personal.nome?.trim() || 'Personal sem nome'}
                        </p>
                        <span className="approval-person-role">Personal</span>
                      </div>
                      <p className="approval-person-email">{personal.email}</p>
                    </div>
                  </div>

                  <p className="text-[12px] font-medium text-[#6076a3] dark:text-slate-400">
                    {new Date(personal.criado_em).toLocaleDateString('pt-BR')}
                  </p>

                  <div>
                    <span data-approval-status={personal.status_conta} className={`inline-flex h-[31px] min-w-[87px] items-center justify-center rounded-full border px-3 text-[12px] font-semibold ${status.className}`}>
                      {personal.status_conta === 'ATIVO' ? <CheckCircle2 size={14} strokeWidth={1.8} aria-hidden="true"/> : personal.status_conta === 'PENDENTE' ? <Clock3 size={14} strokeWidth={1.8} aria-hidden="true"/> : <Ban size={14} strokeWidth={1.8} aria-hidden="true"/>}
                      {status.label}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-start gap-2 md:justify-end">
                    <button
                      type="button"
                      data-admin-view
                      data-approval-review={pendente ? 'pending' : 'approved'}
                      onClick={() => setPersonalSelecionado(personal)}
                      className="inline-flex h-10 min-w-[116px] items-center justify-center gap-2 rounded-[14px] border border-cyan-100 bg-[linear-gradient(180deg,#f7fdfe,#eefbfc)] px-4 text-[12px] font-semibold text-[#0d2148] shadow-[0_3px_10px_rgba(14,165,188,0.035)] transition   dark:border-primary/15 dark:bg-primary/[0.05] dark:text-white "
                    >
                      <Eye className="h-4 w-4" strokeWidth={1.9} />
                      Ver
                    </button>


                  </div>
                </div>
              )
            })}
          </div>

          <div data-approval-footer className="flex flex-col gap-3 rounded-b-[24px] border-t border-slate-100 px-5 py-4 text-[12px] font-medium text-[#6076a3] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-slate-500">
            <span>
              {cadastrosFiltrados.length ? inicioPagina + 1 : 0} – {Math.min(inicioPagina + ITENS_POR_PAGINA, cadastrosFiltrados.length)} de {cadastrosFiltrados.length} profissionais
            </span>

            <div data-approvals-pagination role="navigation" className="flex items-center gap-1.5" aria-label="Paginação">
              <button
                type="button"
                onClick={() => setPagina(1)}
                disabled={paginaAtual === 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition  disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Primeira página"
              >
                <ChevronLeft className="h-3.5 w-3.5 -mr-1" strokeWidth={1.8} />
                <ChevronLeft className="h-3.5 w-3.5 -ml-1" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                disabled={paginaAtual === 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition  disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
              {Array.from({length:totalPaginas},(_,i)=>i+1).filter(n=>n===1||n===totalPaginas||Math.abs(n-paginaAtual)<=1).map((n,i,list)=><span key={n} className="approval-page-item">{i>0&&n-list[i-1]>1&&<span className="approval-page-gap" aria-hidden="true">…</span>}<button type="button" className="approval-page-number" aria-label={`Página ${n}`} aria-current={n===paginaAtual?'page':undefined} onClick={()=>setPagina(n)}>{n}</button></span>)}
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition  disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setPagina(totalPaginas)}
                disabled={paginaAtual === totalPaginas}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition  disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.025]"
                aria-label="Última página"
              >
                <ChevronRight className="h-3.5 w-3.5 -mr-1" strokeWidth={1.8} />
                <ChevronRight className="h-3.5 w-3.5 -ml-1" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </section>
      )}

      </section>

      <dialog ref={detailsRef} role="dialog" className="approval-profile-dialog"
        aria-labelledby="approval-profile-title"
        onCancel={(event) => { event.preventDefault(); fecharDetalhes() }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) fecharDetalhes()
        }}>
        {personalSelecionado && <>
          <header className="approval-profile-heading">
            <div><p>APROVAÇÕES</p><h2 id="approval-profile-title">Detalhes do cadastro</h2></div>
            <button type="button" className="approval-profile-close" autoFocus disabled={acao.isPending} aria-label="Fechar detalhes" onClick={fecharDetalhes}><X size={20} /></button>
          </header>
          <section className="approval-profile-person" aria-label="Cadastro do personal">
            <div className="approval-profile-avatar">{iniciais(personalSelecionado.nome, personalSelecionado.email)}</div>
            <div className="approval-profile-identity"><h3>{personalSelecionado.nome?.trim() || 'Personal sem nome'}</h3><p className="approval-profile-role">Personal</p></div>
            <span className={`approval-profile-status ${statusVisual(personalSelecionado.status_conta).className}`} data-profile-status={personalSelecionado.status_conta}>
              {personalSelecionado.status_conta === 'ATIVO' ? <CheckCircle2 size={14} aria-hidden="true"/> : personalSelecionado.status_conta === 'PENDENTE' ? <Clock3 size={14} aria-hidden="true"/> : <Ban size={14} aria-hidden="true"/>}
              {statusVisual(personalSelecionado.status_conta).label}
            </span>
          </section>
          <dl className="approval-profile-data">
            <div><Mail size={22} strokeWidth={1.7} /><div><dt>E-mail</dt><dd>{personalSelecionado.email}</dd></div></div>
            <div><CalendarDays size={22} strokeWidth={1.7} /><div><dt>Data do cadastro</dt><dd>{new Date(personalSelecionado.criado_em).toLocaleDateString('pt-BR')}</dd></div></div>
          </dl>
          {acao.error && <p role="alert" className="approval-profile-error">{acao.error instanceof Error ? acao.error.message : 'Não foi possível concluir a ação.'}</p>}
          {personalSelecionado.status_conta === 'PENDENTE' && <div className="approval-profile-actions">
            <button type="button" className="approval-profile-block" disabled={acao.isPending} onClick={() => acao.mutate({ personal: personalSelecionado, novoStatus: 'BLOQUEADO' })}><Ban size={16} />Bloquear</button>
            <button type="button" disabled={acao.isPending} onClick={() => acao.mutate({ personal: personalSelecionado, novoStatus: 'ATIVO' })}>{acao.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Aprovar</button>
          </div>}
          <footer className="approval-profile-footer"><button type="button" disabled={acao.isPending} onClick={fecharDetalhes}>Fechar</button></footer>
        </>}
      </dialog>
      <style jsx>{`
        :global(.approvals-workspace) { --approval-surface:#fff; --approval-border:#dbe6e4; --approval-muted:#607b86; --approval-accent:#008d85; }
        :global(.dark .approvals-workspace) { --approval-surface:#0b1b18; --approval-border:#203b34; --approval-muted:#a8c7d5; --approval-accent:#00efdf; }
        :global(.dark [data-admin-route="/admin/aprovacoes"]) { background:#061411!important; --shapeos-brand:#00efdf; --primary:176 100% 47%; }
        :global(.approvals-workspace [data-approvals-hero]) { min-height:210px!important; border-radius:18px!important; border-color:var(--approval-accent)!important; padding:28px 40px!important; background:var(--approval-surface)!important; box-shadow:none!important; }
        :global(.dark .approvals-workspace [data-approvals-hero]) { background:radial-gradient(ellipse at 80% 65%,#07312a 0%,#081a16 45%,#061411 100%)!important; }
        :global(.approvals-workspace [data-approvals-hero] h1) { font-size:clamp(34px,3.7vw,56px)!important; letter-spacing:-.045em!important; }
        :global(.approvals-workspace [data-approvals-hero] h1 span) { color:var(--approval-accent)!important; }
        :global(.approvals-workspace [data-approvals-hero] p) { max-width:550px; font-size:16px!important; line-height:1.5!important; }
        :global(.approvals-workspace [data-approvals-wireframe]) { position:absolute; width:40%; max-width:480px; height:auto; right:0; top:50%; transform:translateY(-50%); color:var(--approval-accent); opacity:.23; pointer-events:none; }
        :global(.approvals-workspace [data-approvals-summary]>div) { border-radius:17px!important; box-shadow:none!important; }
        :global(.approvals-workspace [data-approvals-summary]>div:first-child) { border-color:#9e7d1b!important; }
        :global(.approvals-workspace [data-approvals-summary]>div:last-child) { border-color:var(--approval-accent)!important; }
        :global(.dark .approvals-workspace [data-approvals-summary]>div:first-child) { background:linear-gradient(110deg,#211f0f,#101c16)!important; }
        :global(.dark .approvals-workspace [data-approvals-summary]>div:last-child) { background:linear-gradient(110deg,#08231d,#072b23)!important; }
        :global(.approvals-workspace [data-approvals-summary]>div>div) { padding:23px!important; min-height:116px; }
        :global(.approvals-workspace [data-approvals-summary]>div>div>div:first-child) { width:64px!important; height:64px!important; }
        :global(.approvals-workspace [data-approvals-summary]>div:last-child p:nth-child(2)) { font-size:30px!important; }
        :global(.approvals-workspace [data-approvals-filters]) { padding:16px!important; border-radius:17px!important; border-color:var(--approval-border)!important; background:var(--approval-surface)!important; box-shadow:none!important; }
        :global(.approvals-workspace [data-approvals-filters]>div:first-child) { gap:16px!important; }
        :global(.approvals-workspace [data-approvals-filters]>div:first-child>label) { height:48px!important; border-radius:12px!important; }
        :global(.approvals-workspace [data-approvals-filters] button),
        :global(.approvals-workspace [data-approvals-filters] label:has(select)) { height:48px!important; border-radius:12px!important; }
        :global(.approvals-workspace [data-approvals-filters]>div:last-child) { display:none; }
        :global(.approvals-workspace [data-approvals-table]) { border-radius:18px!important; background:var(--approval-surface)!important; border-color:var(--approval-border)!important; box-shadow:none!important; }
        :global(.approvals-workspace [data-approvals-columns]) { padding:14px 20px!important; border-radius:17px 17px 0 0!important; background:transparent!important; }
        :global(.approvals-workspace [data-approvals-row]) { min-height:54px!important; padding:7px 20px!important; gap:16px!important; }
        :global(.approvals-workspace [data-approvals-row]>p) { color:var(--approval-muted)!important; }
        :global(.approvals-workspace [data-approvals-avatar]) { width:40px!important; height:40px!important; background:linear-gradient(145deg,#8a9de5,#546cac)!important; }
        :global(.approvals-workspace [data-approval-status]) { height:34px!important; gap:8px; }
        :global(.dark .approvals-workspace [data-approval-status="PENDENTE"]),
        :global(.dark .approvals-workspace [data-approval-review="pending"]) { border-color:#8a6a08!important; background:#302709!important; color:#ffd52d!important; }
        :global(.dark .approvals-workspace [data-approval-status="ATIVO"]) { border-color:#006958!important; background:#032b24!important; color:#00efdf!important; }
        :global(.approvals-workspace [data-approval-review]) { height:38px!important; border-radius:11px!important; }
        :global(.approvals-workspace [data-approvals-pagination] button:first-child),
        :global(.approvals-workspace [data-approvals-pagination] > button[aria-label="Última página"]) { display:none; }
        :global(.approvals-workspace [data-approvals-pagination] [aria-current]) { color:var(--approval-accent)!important; background:transparent!important; border:1px solid var(--approval-accent); }
        :global(.approvals-workspace button:focus-visible),
        :global(.approvals-workspace select:focus-visible) { outline:2px solid var(--approval-accent); outline-offset:3px; }
        @media(min-width:1100px) {
          :global(.approvals-workspace [data-approvals-columns]),
          :global(.approvals-workspace [data-approvals-row]) { display:grid!important; grid-template-columns:minmax(140px,1.2fr) minmax(160px,1.4fr) minmax(115px,.9fr) 125px 166px!important; }
          :global(.approvals-workspace [data-approvals-filters]>div:first-child) { flex-direction:row!important; align-items:center; }
        }
        @media(max-width:1099px) {
          :global(.approvals-workspace [data-approvals-columns]) { display:none!important; }
          :global(.approvals-workspace [data-approvals-row]) { grid-template-columns:1fr 1fr!important; padding:18px!important; }
          :global(.approvals-workspace [data-approvals-row]>div:last-child) { justify-content:flex-start!important; }
        }
        @media(max-width:600px) {
          :global(.approvals-workspace [data-approvals-hero]) { padding:26px 22px!important; }
          :global(.approvals-workspace [data-approvals-row]) { grid-template-columns:1fr!important; gap:10px!important; }
          :global(.approvals-workspace [data-approvals-filters] button) { padding:0 12px!important; }
        }

        :global(.approvals-workspace [data-approvals-hero]) { min-height:224px!important; padding:32px 40px!important; }
        :global(.dark .approvals-workspace [data-approvals-hero]) { background:radial-gradient(ellipse at 80% 65%,#073a30,#071b17 48%,#041512)!important; }
        :global(.approvals-workspace [data-approvals-hero] h1) { font-size:clamp(32px,3.4vw,48px)!important; line-height:1.12!important; font-weight:750!important; letter-spacing:-.04em!important; }
        :global(.approvals-workspace [data-approvals-hero] h1+p) { font-size:15px!important; font-weight:400!important; line-height:1.6!important; margin-top:13px!important; max-width:550px!important; }
        @media(max-width:639px) {
          :global(.approvals-workspace [data-approvals-hero]) { min-height:210px!important; padding:27px 22px!important; }
          :global(.approvals-workspace [data-approvals-hero] h1) { font-size:32px!important; }
          :global(.approvals-workspace [data-approvals-hero] h1+p) { font-size:14px!important; line-height:1.6!important; }
        }

        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero]) {
          min-height:224px!important; padding:32px 40px!important;
          border:1px solid #1c4138!important; border-radius:18px!important;
        }
        :global(.dark [data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero]) {
          --shapeos-brand:#00e9df;
          background:radial-gradient(ellipse at 84% 60%,#073d32 0%,#071d18 43%,#041512 100%)!important;
        }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] > div:has(> h1)) { max-width:740px!important; }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] h1) {
          font-size:clamp(28px,3.1vw,46px)!important; line-height:1.12!important;
          font-weight:800!important; letter-spacing:-.045em!important;
        }
        :global(.dark [data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] h1 span) { color:#00e9df!important; }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] h1+p) {
          max-width:740px!important; font-size:16px!important; font-weight:400!important;
          line-height:1.6!important; margin-top:13px!important;
        }
        :global(.dark [data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] h1+p) { color:#a3becd!important; }
        @media(max-width:1100px) {
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] > div:has(> h1)) { max-width:80%!important; }
        }
        @media(max-width:639px) {
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero]) { padding:27px 23px!important; min-height:230px!important; }
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] > div:has(> h1)) { max-width:100%!important; }
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] h1) { font-size:32px!important; }
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] h1+p) { font-size:14px!important; }
        }

        @media(max-width:767px) {
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] > div:has(> h1)) { max-width:100%!important; }
          :global(.approvals-workspace [data-approvals-wireframe]) { width:280px; right:-100px; top:68%; opacity:.12; }
        }

        :global(html:not(.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-hero] [data-approval-hero-subtitle]) {
          color:#53717E!important; -webkit-text-fill-color:currentColor;
        }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-hero] [data-approval-hero-subtitle]) {
          color:#A3BECD!important; -webkit-text-fill-color:currentColor;
        }

        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approvals-heading]) {
          display:block!important; position:relative; z-index:1; width:auto!important; max-width:740px!important; background:transparent!important;
        }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approval-hero-label]) {
          display:inline-flex!important; width:fit-content!important; max-width:100%!important; padding:6px 16px!important;
          border:1px solid var(--shapeos-brand)!important; border-radius:999px!important; background:transparent!important;
          color:var(--shapeos-brand)!important; font-size:10px!important; font-weight:650!important; line-height:1.4!important;
          letter-spacing:.1em!important; text-transform:uppercase; margin:0 0 17px!important; box-shadow:none!important;
        }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approvals-heading] h1) {
          display:block!important; margin:0!important; background:transparent!important; font-family:'Sora',sans-serif!important; font-size:46px!important; font-weight:800!important; letter-spacing:-.045em!important; line-height:1.12!important;
        }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approvals-heading] h1 span) {
          display:inline!important; background:transparent!important; padding:0!important; box-shadow:none!important;
        }
        :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approval-hero-subtitle]) {
          display:block!important; max-width:550px!important; margin:13px 0 0!important; font-size:16px!important; font-weight:400!important; line-height:1.6!important; background:transparent!important;
        }
        @media(max-width:767px) {
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approvals-heading]) { max-width:100%!important; }
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approvals-heading] h1) { font-size:32px!important; }
          :global([data-admin-route="/admin/aprovacoes"] .approvals-workspace [data-approvals-hero] [data-approval-hero-subtitle]) { font-size:14px!important; }
        }

        :global(html [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-hero]) {
          display:flex!important; align-items:center!important; min-height:224px!important; padding:35px 40px!important;
        }
        :global(html [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-heading]) {
          margin:0!important; align-self:center; z-index:2;
        }
        @media(max-width:640px) {
          :global(html [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-hero]) {
            min-height:230px!important; padding:27px 23px!important;
          }
        }

        :global(html [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace section[data-approvals-hero]) {
          border-width:1px!important; border-style:solid!important;
        }
        :global(html:not(.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace section[data-approvals-hero]) {
          border-color:hsl(101 15% 85%)!important;
        }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace section[data-approvals-hero]) {
          border-color:hsl(168 30% 17%)!important;
        }

        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters]) {
          border:0!important; border-radius:0!important; padding:0!important;
          background:transparent!important; box-shadow:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child) { gap:15px!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child > label) {
          height:48px!important; border-radius:11px!important; padding:0 16px!important;
          box-shadow:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] input) { font-size:13px!important; font-weight:400!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] input::placeholder) { font-weight:400!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] kbd) { display:none!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child > div) { gap:15px!important; flex-wrap:nowrap!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group]) {
          display:flex; flex-shrink:0; overflow:hidden; border:1px solid var(--approval-border);
          border-radius:11px; height:48px;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button) {
          height:46px!important; margin:0!important; border:0!important; border-radius:0!important;
          padding:0 20px!important; background:transparent!important; box-shadow:none!important;
          color:var(--approval-muted)!important; font-size:13px!important; font-weight:400!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button+button) { border-left:1px solid var(--approval-border)!important; }
        :global(html.light [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button[aria-pressed="true"]) {
          background:#e4f3eb!important; color:#0d7e70!important;
        }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button[aria-pressed="true"]) {
          background:rgba(0,233,223,.1)!important; color:#00e9df!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child > div > label) {
          height:48px!important; border-radius:11px!important; padding:0 16px!important;
          box-shadow:none!important; font-size:13px!important; font-weight:400!important;
        }
        @media(min-width:1100px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child) { flex-direction:row!important; align-items:center!important; }
        }
        @media(max-width:1099px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child) { flex-direction:column!important; align-items:stretch!important; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child > div) { flex-wrap:wrap!important; }
        }
        @media(max-width:480px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group]) { flex:1; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button) { flex:1; padding:0 12px!important; font-size:12px!important; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] > div:first-child > div > label) { width:100%; }
        }

        :global(html.light [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [role="dialog"] [data-approvals-details] [data-approvals-detail-status="ATIVO"]) {
          border:1px solid #bddfd0!important;
        }

        /* Pending summary uses a neutral surface; amber belongs to its status icon. */
        :global(html.light [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-summary] [data-approval-summary-card="pending"]) {
          background:#fcfdf9!important; background-image:none!important; border-color:#d7ded3!important; box-shadow:none!important;
        }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-summary] [data-approval-summary-card="pending"]) {
          background:#091c18!important; background-image:none!important; border-color:#1c4037!important; box-shadow:none!important;
        }


        :global(html.light [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace div[data-approvals-summary].grid:nth-of-type(1) > div[data-approval-summary-card="pending"] [data-pending-summary-icon]) {
          background:#fff5df!important; color:#d97706!important;
          box-shadow:none!important; border:0!important;
        }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace div[data-approvals-summary].grid:nth-of-type(1) > div[data-approval-summary-card="pending"] [data-pending-summary-icon]) {
          background:rgba(251,191,36,.1)!important; color:#facc15!important;
          box-shadow:none!important; border:0!important;
        }



        /* Quiet interactive controls in both themes. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace) { --approval-hover-primary:#129b89; }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace) { --approval-hover-primary:#00e9df; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace button),
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace [data-admin-search]),
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace label:has(select)) {
          border-width:1px!important; border-style:solid!important;
          border-radius:13px!important;
          box-shadow:none!important; filter:none!important;
          transform:none!important; translate:none!important; scale:none!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace [data-admin-search]),
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace [data-admin-search]:focus-within),
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace label:has(select)),
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace label:has(select):focus-within) {
          border-color:var(--shapeos-border)!important;
          box-shadow:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace [data-admin-search] input) { box-shadow:none!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group]) {
          border:0!important; border-radius:13px!important; overflow:visible!important; gap:6px;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button),
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace section[data-approvals-filters] [data-approval-status-group] button+button) {
          border:1px solid var(--shapeos-border)!important; border-radius:13px!important;
        }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace button:hover:enabled),
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace [data-admin-search]:not(:has(input:disabled)):hover),
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace label:has(select:not(:disabled)):hover) {
            background:color-mix(in srgb,var(--approval-hover-primary) 7%,transparent)!important;
            background-image:none!important;
            border-color:color-mix(in srgb,var(--approval-hover-primary) 40%,transparent)!important;
            box-shadow:none!important; filter:none!important;
            transform:none!important;
          }
        }

        /* Custom period selector shares the approved control geometry. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period) { position:relative; width:190px; flex-shrink:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-trigger) {
          display:flex; align-items:center; gap:10px; width:100%; height:48px!important;
          padding:0 14px!important; background:var(--shapeos-surface)!important;
          border:1px solid var(--shapeos-border)!important; border-radius:13px!important;
          color:var(--shapeos-muted)!important; font-size:13px!important; font-weight:400!important;
          white-space:nowrap;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-trigger > svg) { flex-shrink:0; color:inherit; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-trigger > svg:last-child) { margin-left:auto; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-menu) {
          position:absolute; z-index:40; top:calc(100% + 8px); right:0;
          width:240px; max-width:calc(100vw - 32px); padding:6px;
          border:1px solid var(--shapeos-border); border-radius:13px;
          background:var(--shapeos-surface); color:var(--shapeos-text);
          box-shadow:0 8px 24px rgba(0,0,0,.12); outline:none;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-menu[data-above="true"]) { top:auto; bottom:calc(100% + 8px); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option) {
          display:flex; align-items:center; gap:10px; min-height:44px; padding:0 10px;
          border:1px solid transparent; border-radius:13px; cursor:pointer;
          font-size:13px; font-weight:400; color:var(--shapeos-text);
          transition:background-color 150ms ease,border-color 150ms ease;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option + .approval-period-option) { margin-top:4px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option > svg) { flex-shrink:0; color:inherit; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option > svg:last-child:not(:first-child)) { margin-left:auto; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option[aria-selected="true"]) {
          background:color-mix(in srgb,var(--approval-hover-primary) 7%,transparent);
          color:var(--approval-hover-primary);
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-menu:focus .approval-period-option[data-active="true"]) {
          border-color:color-mix(in srgb,var(--approval-hover-primary) 40%,transparent);
        }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-trigger:hover:enabled),
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option:hover) {
            background:color-mix(in srgb,var(--approval-hover-primary) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--approval-hover-primary) 40%,transparent)!important;
          }
        }
        @media(max-width:480px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period) { width:100%; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-menu) { width:100%; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-trigger),
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-period-option) { font-size:16px!important; }
        }

        /* Profile approval dialog follows the organized user profile. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog) {
          width:min(600px,calc(100vw - 32px)); max-height:calc(100dvh - 32px);
          margin:auto; padding:24px; border:1px solid var(--shapeos-border)!important;
          border-radius:18px!important; background:var(--shapeos-surface)!important;
          color:var(--shapeos-text)!important; overflow-y:auto; overscroll-behavior:contain; box-shadow:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog::backdrop) { background:rgba(0,12,9,.68); backdrop-filter:blur(3px); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-heading) { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-heading p) { color:var(--shapeos-muted)!important; font-size:10px!important; letter-spacing:.09em; margin-bottom:6px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-heading h2) { color:var(--shapeos-text)!important; font-size:22px; font-weight:750; line-height:1.3; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog button) {
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          min-height:40px; padding:0 18px; border:1px solid var(--shapeos-border)!important;
          background:transparent; color:var(--shapeos-text)!important; font-size:12px; font-weight:600; white-space:nowrap;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog .approval-profile-close) { width:40px; padding:0; flex-shrink:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog button:disabled) { opacity:.45; cursor:not-allowed; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-person) { display:flex; align-items:center; gap:18px; padding:18px; margin-top:20px; border:1px solid var(--shapeos-border); border-radius:13px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-avatar) { display:grid; place-items:center; width:56px; height:56px; flex:0 0 56px; border-radius:50%; background:linear-gradient(145deg,#6f86b6,#4f678f); color:#fff; font-size:18px; font-weight:700; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-person > div:last-child) { min-width:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-person h3) { font-size:18px; font-weight:700; line-height:1.4; overflow-wrap:anywhere; color:var(--shapeos-text)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-status) { display:inline-flex; margin-top:6px; padding:7px 12px; border:0!important; border-radius:999px; font-size:11px; font-weight:500; line-height:1.5; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-status[data-profile-status="ATIVO"]) { background:#e4f3eb!important; color:#0d7e70!important; }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-status[data-profile-status="ATIVO"]) { background:#123b31!important; color:#00e9df!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data) { margin:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data > div) { display:flex; align-items:flex-start; gap:16px; padding:18px 8px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data > div + div) { border-top:1px solid var(--shapeos-border); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data > div > svg) { flex-shrink:0; color:var(--shapeos-muted); margin-top:3px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data > div > div) { min-width:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data dt) { font-size:12px; color:var(--shapeos-muted)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-data dd) { font-size:14px; line-height:1.6; margin-top:3px; overflow-wrap:anywhere; color:var(--shapeos-text)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-footer) { display:flex; justify-content:flex-end; padding-top:16px; border-top:1px solid var(--shapeos-border); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-actions) { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:10px; padding:0 0 18px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog .approval-profile-block) { color:#b42336!important; border-color:#e7bcc2!important; }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog .approval-profile-block) { color:#ff8f9b!important; border-color:#75434b!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-error) { color:#b42336; font-size:13px; margin-bottom:16px; }
        :global(html.dark [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-error) { color:#ff8f9b; }
        @media(max-width:600px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog) { width:calc(100vw - 24px); max-height:calc(100dvh - 24px); padding:20px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-heading h2) { font-size:20px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-person) { gap:14px; padding:16px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-person h3) { font-size:16px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content="/admin/aprovacoes"] .approvals-workspace .approval-profile-dialog button) { min-height:44px; }
        }

        /* Grid column headings share the same anchor as their row contents. */
        @media(min-width:1100px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-columns] > span) { text-align:left!important; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-columns] > span:last-child) { text-align:center!important; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/aprovacoes"] [data-admin-content] .approvals-workspace [data-approvals-row] > div:last-child) { justify-content:center!important; }
        }


:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]) { display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:8px!important; width:auto!important; min-width:84px!important; height:36px!important; min-height:36px!important; padding:0 14px!important; border:1px solid var(--approval-border)!important; border-radius:13px!important; background:transparent!important; background-image:none!important; color:var(--shapeos-text,#162623)!important; font-size:12px!important; font-weight:600!important; line-height:1.5!important; white-space:nowrap!important; box-shadow:none!important; transform:none!important; filter:none!important; transition:background-color 150ms ease,border-color 150ms ease!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view] svg) { width:15px!important; height:15px!important; color:var(--approval-hover-primary)!important; flex-shrink:0!important; }
@media(hover:hover) and (pointer:fine) { :global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]:hover:enabled) { background:color-mix(in srgb,var(--approval-hover-primary) 7%,transparent)!important; border-color:color-mix(in srgb,var(--approval-hover-primary) 40%,transparent)!important; } }
@media(max-width:640px) { :global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]) { height:44px!important; min-height:44px!important; } }
@media(prefers-reduced-motion:reduce) { :global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] [data-admin-view][data-admin-view]) { transition:none!important; } }

@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace ) { --mobile-bg:#fcfdf9; --mobile-border:#d7ded3; --mobile-ink:#162623; --mobile-muted:#5f6f68; --mobile-brand:#129b89; }
:global(html.dark body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace) { --mobile-bg:#091c18; --mobile-border:#1c4037; --mobile-ink:#f5faf9; --mobile-muted:#a3becd; --mobile-brand:#00e9df; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-hero]) { padding:24px 20px!important; min-height:190px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-heading]) { max-width:100%!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace h1) { font-size:28px!important; line-height:1.2!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-hero-subtitle]) { font-size:13px!important; line-height:1.65!important; max-width:300px; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-summary]) { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important; gap:10px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-summary]>div) { border:1px solid var(--mobile-border)!important; border-radius:13px!important; background:var(--mobile-bg)!important; box-shadow:none!important; min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]) { display:flex!important; padding:14px 10px!important; gap:10px!important; min-height:96px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:first-child) { width:40px!important; height:40px!important; border-radius:13px!important; background:color-mix(in srgb,var(--mobile-brand) 10%,transparent)!important; color:var(--mobile-brand)!important; box-shadow:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:first-child svg) { width:24px!important; height:24px!important; color:var(--mobile-brand)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>svg), :global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:nth-child(2)>p:last-child) { display:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:nth-child(2)>p:first-child) { font-size:11px!important; font-weight:500!important; line-height:1.4!important; color:var(--mobile-muted)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:nth-child(2)>p:nth-child(2)) { font-size:26px!important; line-height:1.2!important; color:var(--mobile-ink)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-filters]) { padding:0!important; border:0!important; background:transparent!important; box-shadow:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-admin-search]) { height:48px!important; min-height:48px!important; padding:0 14px!important; border-radius:13px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-admin-search] input) { font-size:16px!important; font-weight:400!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-status-group]) { width:100%!important; display:grid!important; grid-template-columns:repeat(3,minmax(0,1fr))!important; gap:6px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-status-group] button) { width:100%!important; padding:0 8px!important; height:44px!important; font-size:12px!important; min-width:0!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-table]) { border:0!important; background:transparent!important; box-shadow:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]) { display:grid!important; grid-template-columns:minmax(0,1fr) auto!important; padding:16px!important; gap:10px!important; margin-bottom:12px!important; border:1px solid var(--mobile-border)!important; border-radius:13px!important; background:var(--mobile-bg)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>div:first-child) { grid-column:1; grid-row:1; gap:10px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>div:first-child p) { white-space:normal!important; overflow-wrap:anywhere; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>div:first-child p:last-child:not(:first-child)) { display:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-avatar]) { width:40px!important; height:40px!important; box-shadow:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>p:nth-child(2)) { grid-column:1/-1; grid-row:2; white-space:normal!important; overflow-wrap:anywhere!important; font-size:12px!important; color:var(--mobile-muted)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>p:nth-child(2) svg) { display:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>p:nth-child(3)) { grid-column:1/-1; grid-row:3; font-size:11px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>p:nth-child(3)::before) { content:"Cadastro em "; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>div:nth-child(4)) { grid-column:2; grid-row:1; align-self:center; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-status]) { border:0!important; min-width:0!important; height:auto!important; padding:6px 9px!important; gap:5px!important; font-size:10px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>div:last-child) { grid-column:1/-1; grid-row:4; width:100%!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-review]), :global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-admin-view][data-admin-view]) { width:100%!important; min-width:0!important; min-height:44px!important; height:44px!important; border:1px solid var(--mobile-border)!important; border-radius:13px!important; background:transparent!important; color:var(--mobile-ink)!important; box-shadow:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-review] svg) { color:var(--mobile-brand)!important; }
}

@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-pending-summary-icon]) { color:#b88400!important; background:rgba(184,132,0,.10)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-pending-summary-icon] svg) { color:#b88400!important; }
:global(html.dark body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-pending-summary-icon]) { color:#ffd52d!important; background:rgba(255,213,45,.10)!important; }
:global(html.dark body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-pending-summary-icon] svg) { color:#ffd52d!important; }
}

:global(.approval-page-item) { display:flex; align-items:center; gap:8px; }
:global(.approval-page-gap) { padding:0 2px; }
@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-row]>div:first-child p:last-child:not(:first-child)) { display:block!important; font-size:10px!important; line-height:1.4!important; margin-top:3px!important; color:var(--mobile-muted)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-footer]) { display:flex!important; flex-direction:column!important; align-items:flex-start!important; gap:12px!important; padding:16px!important; border:1px solid var(--mobile-border)!important; border-radius:13px!important; background:var(--mobile-bg)!important; color:var(--mobile-muted)!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-pagination]) { display:flex!important; flex-wrap:wrap!important; gap:8px!important; width:100%; background:transparent!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-pagination] button) { display:grid!important; place-items:center!important; width:44px!important; min-width:44px!important; height:44px!important; padding:0!important; border:1px solid var(--mobile-border)!important; border-radius:13px!important; background:transparent!important; color:var(--mobile-muted)!important; box-shadow:none!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-pagination] button[aria-current="page"]) { background:var(--mobile-brand)!important; border-color:var(--mobile-brand)!important; color:#002a26!important; font-weight:700!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-pagination] button[aria-label="Primeira página"]), :global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-pagination] button[aria-label="Última página"]) { display:none!important; }
}

@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-footer]) { align-items:center!important; justify-content:center!important; text-align:center!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-footer] [data-approvals-pagination]) { width:100%!important; display:flex!important; flex-wrap:wrap!important; justify-content:center!important; align-items:center!important; }
}

@media(max-width:767px) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-summary]) { align-items:start!important; gap:8px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approvals-summary]>div) { height:clamp(88px,27vw,104px)!important; min-height:0!important; padding:0!important; border-radius:16px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]) { box-sizing:border-box!important; height:100%!important; min-height:0!important; padding:14px!important; gap:12px!important; align-items:center!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:first-child) { box-sizing:border-box!important; width:clamp(40px,14vw,56px)!important; height:clamp(40px,14vw,56px)!important; min-width:clamp(40px,14vw,56px)!important; max-width:clamp(40px,14vw,56px)!important; min-height:clamp(40px,14vw,56px)!important; max-height:clamp(40px,14vw,56px)!important; flex:0 0 auto!important; aspect-ratio:1!important; border-radius:13px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:first-child svg) { width:28px!important; height:28px!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:nth-child(2)>p:first-child) { font-size:12px!important; line-height:1.4!important; }
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-mobile-summary]>div:nth-child(2)>p:nth-child(2)) { font-size:28px!important; line-height:1.15!important; margin-top:3px!important; }
}

:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-status-group] button){ box-shadow:none!important;transform:none!important;filter:none!important;animation:none!important;transition:background-color 150ms ease,border-color 150ms ease!important; }
@media(hover:hover) and (pointer:fine) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-status-group] button:hover:enabled){ background:color-mix(in srgb,var(--shapeos-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--shapeos-brand) 40%,transparent)!important; }
}

/* Also support a mouse on devices whose primary pointer is touch. */
@media(any-hover:hover) {
:global(html:is(.light,.dark) body [data-admin-route="/admin/aprovacoes"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .approvals-workspace.approvals-workspace [data-approval-status-group] button:hover:not(:disabled)){ background:color-mix(in srgb,var(--shapeos-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--shapeos-brand) 40%,transparent)!important;color:var(--shapeos-brand)!important;cursor:pointer!important; }
}

/* Compact Approvals, preserving all review actions and responsive cards. */
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined])){display:grid!important;gap:18px!important;--approval-refined-bg:#fcfdf9;--approval-refined-line:#d7ded3;--approval-refined-ink:#162623;--approval-refined-muted:#5f6f68;--approval-refined-brand:#129b89;}
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined])){--approval-refined-bg:#091c18;--approval-refined-line:#1c4037;--approval-refined-ink:#f5faf9;--approval-refined-muted:#a3becd;--approval-refined-brand:#00e9df;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined])>*){margin-top:0!important;margin-bottom:0!important;min-width:0;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-hero]){min-height:130px!important;padding:24px 28px!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-heading]){max-width:65%!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-banner-title){font-size:28px!important;line-height:1.2!important;font-weight:700!important;letter-spacing:-.035em!important;color:var(--approval-refined-ink)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-banner-title span){color:var(--approval-refined-brand);}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-hero-label]){font-size:9px!important;border:0!important;background:transparent!important;padding:0!important;margin-bottom:8px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-hero-subtitle]){font-size:13px!important;line-height:1.6!important;margin-top:8px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-wireframe]){width:300px!important;opacity:.35!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-summary]){display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-summary]>div){border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;min-height:0!important;height:auto!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-summary]>div:first-child){border-right:1px solid var(--approval-refined-line)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]){min-height:80px!important;height:auto!important;padding:10px 22px!important;gap:16px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>svg){display:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>div:last-of-type){min-width:0;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>div:last-of-type>p:first-child){font-size:13px!important;font-weight:600!important;line-height:1.4!important;color:var(--approval-refined-ink)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>div:last-of-type>p:nth-child(2)){font-size:24px!important;line-height:1.2!important;margin:3px 0!important;color:var(--approval-refined-ink)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>div:last-of-type>p:last-child){font-size:12px!important;line-height:1.5!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management){display:grid;gap:14px;padding:18px;border:1px solid var(--approval-refined-line);border-radius:13px;background:var(--approval-refined-bg);}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management-heading){display:flex;align-items:center;justify-content:space-between;gap:12px;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management-heading h2){font-size:15px;font-weight:650;color:var(--approval-refined-ink);}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-export){display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:8px 12px;border:1px solid var(--approval-refined-line);border-radius:13px;background:transparent;color:var(--approval-refined-ink);font-size:11px;cursor:pointer;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-export:disabled){opacity:.45;cursor:not-allowed;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-filters]){padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-filters]>div:first-child){display:flex!important;flex-direction:row!important;align-items:center!important;gap:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-search]){min-width:180px!important;flex:1!important;height:44px!important;min-height:44px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-search] input){font-size:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-search] kbd){display:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [aria-label="Filtros de cadastro"]){display:flex!important;flex-wrap:nowrap!important;gap:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status-group]){display:flex!important;gap:4px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status-group] button){min-height:40px!important;height:40px!important;padding:8px 14px!important;border:1px solid transparent!important;border-radius:13px!important;font-size:12px!important;box-shadow:none!important;white-space:nowrap;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status-group] button[aria-pressed="true"]){border-color:color-mix(in srgb,var(--approval-refined-brand) 40%,transparent)!important;background:color-mix(in srgb,var(--approval-refined-brand) 7%,transparent)!important;color:var(--approval-refined-brand)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-period-trigger){height:44px!important;min-height:44px!important;font-size:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-filters]>div:last-child){margin-top:10px!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-table]){border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){padding:10px 8px!important;gap:12px!important;border-radius:8px!important;font-size:10px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){padding:12px 8px!important;gap:12px!important;min-height:64px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row] p){white-space:normal!important;text-overflow:clip!important;overflow:visible!important;overflow-wrap:anywhere!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-avatar]){width:32px!important;height:32px!important;font-size:10px!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status]){min-width:0!important;height:auto!important;min-height:26px!important;padding:5px 9px!important;font-size:11px!important;gap:6px!important;white-space:nowrap;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-status-dot){display:inline-block;width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:currentColor;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-view]){min-width:72px!important;height:36px!important;min-height:36px!important;padding:0 10px!important;font-size:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]){padding:14px 8px!important;border-radius:0!important;background:transparent!important;}
@media(min-width:768px){
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){display:grid!important;grid-template-columns:minmax(0,1.2fr) minmax(0,1.4fr) 120px 110px 80px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){display:grid!important;grid-template-columns:minmax(0,1.2fr) minmax(0,1.4fr) 120px 110px 80px!important;}
}
@media(any-hover:hover){
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management button:hover:enabled){background:color-mix(in srgb,var(--approval-refined-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--approval-refined-brand) 40%,transparent)!important;box-shadow:none!important;transform:none!important;}
}
@media(min-width:768px) and (max-width:1199px){
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-filters]>div:first-child){flex-wrap:wrap!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-search]){flex-basis:100%!important;}
}
@media(max-width:767px){
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-hero]){min-height:150px!important;padding:22px 18px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-heading]){max-width:100%!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-banner-title){font-size:26px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-wireframe]){right:-150px!important;opacity:.16!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]){padding:12px!important;gap:10px!important;min-height:100px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>div:last-of-type>p:first-child){font-size:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-mobile-summary]>div:last-of-type>p:last-child){font-size:11px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management){padding:14px;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management-heading){flex-wrap:wrap;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-export){min-height:44px;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-filters]>div:first-child){flex-direction:column!important;align-items:stretch!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-search]){min-width:0!important;width:100%!important;flex:auto!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [aria-label="Filtros de cadastro"]){flex-direction:column!important;align-items:stretch!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status-group]){display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status-group] button){padding:8px!important;min-height:44px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-period-trigger){width:100%!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){display:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){padding:14px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-view]){width:100%!important;height:44px!important;min-height:44px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]){padding:16px!important;border-radius:13px!important;}
}

/* Dark-mode names use the reference's light foreground, independently of legacy blue text rules. */
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row] .approval-person-name) {
  color:#f5faf9!important;
  -webkit-text-fill-color:#f5faf9!important;
}

/* Dark table text follows the supplied reference across every column. */
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]),
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]>span) {
 color:#a3becd!important;
 -webkit-text-fill-color:#a3becd!important;
}
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]>p),
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]>div:first-child>div:last-child>p:not(.approval-person-name)),
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]>span) {
 color:#a3becd!important;
 -webkit-text-fill-color:#a3becd!important;
}
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row] .approval-person-name),
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row] [data-admin-view]) {
 color:#f5faf9!important;
 -webkit-text-fill-color:#f5faf9!important;
}
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row] [data-admin-view] svg) {
 color:#00e9df!important;
}

/* Compact registration dialog, centered in the viewport in both themes. */
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-dialog){position:fixed!important;inset:0!important;margin:auto!important;box-sizing:border-box!important;width:min(520px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;height:fit-content!important;max-height:calc(100dvh - 32px)!important;min-height:0!important;padding:24px!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;transform:none!important;translate:none!important;border:1px solid var(--approval-refined-line)!important;border-radius:18px!important;background:var(--approval-refined-bg)!important;color:var(--approval-refined-ink)!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-dialog:not([open])){display:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-dialog[open]){display:block!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-dialog::backdrop){background:rgba(0,0,0,.48)!important;backdrop-filter:blur(3px);}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-heading){display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:14px!important;padding-bottom:18px!important;border-bottom:1px solid var(--approval-refined-line)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-heading p){font-size:10px!important;letter-spacing:.08em!important;color:var(--approval-refined-muted)!important;margin:0 0 6px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-heading h2){font-size:22px!important;line-height:1.3!important;color:var(--approval-refined-ink)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-close){width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important;display:grid!important;place-items:center!important;padding:0!important;flex-shrink:0!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-person){display:grid!important;grid-template-columns:48px minmax(0,1fr) auto!important;align-items:center!important;gap:14px!important;margin:0!important;padding:18px 0!important;border:0!important;border-bottom:1px solid var(--approval-refined-line)!important;border-radius:0!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-avatar){width:48px!important;height:48px!important;min-width:48px!important;font-size:16px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-identity){min-width:0!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-person h3){font-size:16px!important;line-height:1.4!important;color:var(--approval-refined-ink)!important;overflow-wrap:anywhere!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-role){font-size:12px!important;line-height:1.5!important;margin-top:3px!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-status){display:inline-flex!important;align-items:center!important;gap:6px!important;margin:0!important;padding:6px 9px!important;font-size:11px!important;white-space:nowrap!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-data){margin:0!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-data>div){display:flex!important;align-items:flex-start!important;gap:14px!important;padding:16px 0!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-data>div+div){border-top:1px solid var(--approval-refined-line)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-data svg){width:20px!important;height:20px!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-data dt){font-size:11px!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-data dd){font-size:14px!important;line-height:1.6!important;overflow-wrap:anywhere!important;color:var(--approval-refined-ink)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-footer){padding-top:16px!important;border-top:1px solid var(--approval-refined-line)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-dialog button){min-height:44px;border-radius:13px!important;box-shadow:none!important;}
@media(max-width:420px){
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-dialog){width:calc(100vw - 24px)!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;padding:18px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-heading h2){font-size:20px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-person){grid-template-columns:48px minmax(0,1fr)!important;gap:10px 12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-profile-status){grid-column:2;justify-self:start;}
}

/* Original bordered table structure within the compact page. */
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-table]){border:1px solid var(--approval-refined-line)!important;border-radius:20px!important;background:var(--approval-refined-bg)!important;overflow:hidden!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){padding:16px 22px!important;border-radius:0!important;border-bottom:1px solid var(--approval-refined-line)!important;background:transparent!important;font-size:11px!important;letter-spacing:.08em!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){padding:10px 22px!important;min-height:72px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-table]>div:nth-child(2)>[data-approvals-row]+[data-approvals-row]){border-top:1px solid var(--approval-refined-line)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-avatar]){width:44px!important;height:44px!important;font-size:14px!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-name){font-size:13px!important;font-weight:650!important;color:var(--approval-refined-ink)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status]){min-height:34px!important;padding:7px 13px!important;border:0!important;border-radius:999px!important;font-size:12px!important;gap:8px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-view]){height:44px!important;min-height:44px!important;min-width:96px!important;border:1px solid var(--approval-refined-line)!important;border-radius:13px!important;background:transparent!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]){display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;padding:20px 22px!important;border-top:1px solid var(--approval-refined-line)!important;border-radius:0!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination]){display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-page-item){display:inline-flex!important;align-items:center!important;gap:8px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button){display:inline-grid!important;place-items:center!important;visibility:visible!important;width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;padding:0!important;border:1px solid var(--approval-refined-line)!important;border-radius:13px!important;background:transparent!important;color:var(--approval-refined-ink)!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination]>button:is([aria-label="Primeira página"],[aria-label="Última página"])){display:none!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button:disabled){opacity:.35!important;cursor:not-allowed!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button[aria-current="page"]){background:var(--approval-refined-brand)!important;border-color:var(--approval-refined-brand)!important;color:#fff!important;}
:global(html.dark body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button[aria-current="page"]){color:#002a26!important;}
@media(any-hover:hover){:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-management [data-approvals-pagination] button[aria-current="page"]:hover){background:var(--approval-refined-brand)!important;border-color:var(--approval-refined-brand)!important;}
}
@media(max-width:767px){:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-table]){border-radius:13px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){padding:16px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]){flex-direction:column!important;justify-content:center!important;text-align:center!important;padding:18px 12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination]){justify-content:center!important;gap:6px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button){width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;}
}

/* Refined finish, retaining classic columns, status and numbered navigation. */
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-table]){border-radius:13px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){padding:13px 18px!important;background:color-mix(in srgb,var(--approval-refined-muted) 4%,var(--approval-refined-bg))!important;font-size:10px!important;letter-spacing:.07em!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){padding:12px 18px!important;min-height:72px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-avatar]){width:38px!important;height:38px!important;font-size:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]>div:first-child){gap:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-name){font-size:13px!important;font-weight:600!important;line-height:1.5!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]>p){font-size:12px!important;font-weight:400!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-status]){min-height:30px!important;padding:6px 10px!important;font-size:11px!important;font-weight:600!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-view]){min-width:76px!important;height:36px!important;min-height:36px!important;padding:0 12px!important;font-size:12px!important;font-weight:500!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]){padding:16px 18px!important;font-size:11px!important;color:var(--approval-refined-muted)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button){width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;font-size:12px!important;}
@media(max-width:767px){:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){padding:16px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-admin-view]){width:100%!important;height:44px!important;min-height:44px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approval-footer]){padding:16px 12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-pagination] button){width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;}
}

/* Approved compact identity: name, role and email grouped together. */
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-copy){min-width:0!important;display:grid!important;gap:4px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-title){display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:6px 10px!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-role){display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;white-space:nowrap!important;padding:2px 7px!important;border:1px solid var(--approval-refined-line)!important;border-radius:6px!important;font-size:10px!important;line-height:1.5!important;font-weight:400!important;color:var(--approval-refined-muted)!important;background:color-mix(in srgb,var(--approval-refined-muted) 8%,transparent)!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-email){font-size:12px!important;line-height:1.5!important;font-weight:400!important;color:var(--approval-refined-muted)!important;-webkit-text-fill-color:var(--approval-refined-muted)!important;overflow-wrap:anywhere!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-avatar]){width:40px!important;height:40px!important;font-size:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){background:transparent!important;}
@media(min-width:768px){:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){grid-template-columns:minmax(0,1fr) 170px 128px 90px!important;gap:16px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){grid-template-columns:minmax(0,1fr) 170px 128px 90px!important;gap:16px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){min-height:76px!important;}
}
@media(min-width:768px) and (max-width:1050px){:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-columns]){grid-template-columns:minmax(0,1fr) 130px 110px 76px!important;gap:12px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) [data-approvals-row]){grid-template-columns:minmax(0,1fr) 130px 110px 76px!important;gap:12px!important;}
}
@media(max-width:767px){:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-title){gap:5px 8px!important;}
:global(html body [data-admin-route="/admin/aprovacoes"] :is(#approvals-refined,[data-approvals-refined]) .approval-person-email){font-size:11px!important;}
}
`}</style>
    </div>
  )
}


function ApprovalPeriod({ value, onChange }: { value: FiltroPeriodo; onChange: (value: FiltroPeriodo) => void }) {
  const options = [
    { value: 'TODOS' as const, label: 'Todo período', Icon: CalendarDays },
    { value: '30_DIAS' as const, label: 'Últimos 30 dias', Icon: Clock3 },
  ]
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [above, setAbove] = useState(false)
  const selected = options.findIndex((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setAbove(window.innerHeight - rect.bottom < 120 && rect.top > 120)
    }
    place()
    listRef.current?.focus({ preventScroll: true })
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div ref={rootRef} className="approval-period" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="approval-period-trigger"
      aria-label={`Filtrar por período: ${options[selected].label}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setActive(selected); setOpen(!open) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive(selected); setOpen(true)
        }
      }}>
      <CalendarDays size={17} strokeWidth={1.8} />
      <span>{options[selected].label}</span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div ref={listRef} id={id} role="listbox" tabIndex={-1} className="approval-period-menu"
      data-above={above} aria-label="Período dos cadastros" aria-activedescendant={`${id}-${active}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus()
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length)
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); choose(active)
        } else if (event.key.length === 1) {
          const index = options.findIndex((option) => option.label.toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR')))
          if (index >= 0) { event.preventDefault(); setActive(index) }
        }
      }}>
      {options.map(({ value: optionValue, label, Icon }, index) => <div
        key={optionValue} id={`${id}-${index}`} role="option"
        aria-selected={value === optionValue} data-active={active === index}
        className="approval-period-option"
        onPointerMove={() => setActive(index)}
        onClick={() => choose(index)}>
        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
        {value === optionValue && <Check size={17} strokeWidth={2} />}
      </div>)}
    </div>}
  </div>
}
