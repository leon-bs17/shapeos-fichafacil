'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Ban,
  Mail,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarData } from '@/lib/utils'

type StatusConta = 'ATIVO' | 'PENDENTE' | 'BLOQUEADO'
type TipoUsuario = 'ADMIN' | 'PERSONAL' | 'ALUNO'

type Usuario = {
  id: string
  nome: string
  email: string
  tipo: TipoUsuario
  status_conta: StatusConta
  criado_em: string
}

export default function AdminUsuariosPage() {
  return <UsuariosConteudo />
}

function UsuariosConteudo() {
  const queryClient = useQueryClient()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')

  const { data: usuarios, isLoading, error: erroConsulta } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, status_conta, criado_em')
        .order('criado_em', { ascending: false })

      if (error) throw error
      return (data ?? []) as Usuario[]
    },
  })

  const acaoMutation = useMutation({
    mutationFn: async ({ usuario, status }: { usuario: Usuario; status: StatusConta }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão administrativa expirada.')
      if (user.id === usuario.id) throw new Error('Você não pode alterar o status da própria conta.')
      if (usuario.tipo === 'ADMIN') throw new Error('Contas ADMIN não podem ser bloqueadas por esta tela.')

      const { error: configuracaoPendente } = await supabase.from('admin_configuracao').select('id').limit(1)
      if (!configuracaoPendente) {
        const response = await fetch('/api/admin/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'EDITAR_USUARIO', id: usuario.id, dados: { status_conta: status } }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        return
      }
      // Preserve the existing workflow only while the new table is absent.
      if (configuracaoPendente.code !== 'PGRST205' && configuracaoPendente.code !== '42P01') throw configuracaoPendente
      const { error: erroUpdate } = await supabase
        .from('usuarios')
        .update({ status_conta: status })
        .eq('id', usuario.id)

      if (erroUpdate) throw erroUpdate

      const acao = status === 'BLOQUEADO'
        ? 'BLOQUEAR_USUARIO'
        : usuario.status_conta === 'PENDENTE'
          ? 'APROVAR_USUARIO'
          : 'REATIVAR_USUARIO'

      const { error: erroAuditoria } = await supabase.from('admin_auditoria').insert({
        admin_id: user.id,
        usuario_id: usuario.id,
        acao,
        detalhes: {
          nome: usuario.nome,
          email: usuario.email,
          status_anterior: usuario.status_conta,
          status_novo: status,
        },
      })

      if (erroAuditoria) throw erroAuditoria
    },
    onSuccess: async () => {
      setConfirmBlock(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-auditoria'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-command-center'] }),
      ])
    },
  })

  const filtrados = usuarios?.filter((u) => {
    const termo = busca.trim().toLowerCase()
    const matchesBusca = termo === '' ||
      u.nome?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo)
    const matchesTipo = filtroTipo === 'TODOS' || u.tipo === filtroTipo
    const matchesStatus = filtroStatus === 'TODOS' || u.status_conta === filtroStatus
    return matchesBusca && matchesTipo && matchesStatus
  })

  const total = filtrados?.length ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / 5))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * 5
  const linhas = filtrados?.slice(inicio, inicio + 5)
  const selected = usuarios?.find((u) => u.id === selectedId)

  useEffect(() => { setPagina(1) }, [busca, filtroTipo, filtroStatus])
  useEffect(() => {
    if (!selectedId) return
    const dialog = dialogRef.current
    const focused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      focused?.focus()
    }
  }, [selectedId])

  function closeDetails() {
    if (acaoMutation.isPending) return
    setSelectedId(null)
    setConfirmBlock(false)
    acaoMutation.reset()
  }

  const contadores = {
    total: usuarios?.length ?? 0,
    personals: usuarios?.filter((u) => u.tipo === 'PERSONAL').length ?? 0,
    pendentes: usuarios?.filter((u) => u.status_conta === 'PENDENTE').length ?? 0,
    bloqueados: usuarios?.filter((u) => u.status_conta === 'BLOQUEADO').length ?? 0,
  }

  return (
    <div className="users-workspace space-y-5">
      <header className="users-hero">
        <div className="users-hero-copy"><p className="eyebrow">Gestão</p>
        <h1>Gestão de <span>usuários</span></h1>
        <p className="users-subtitle">
          Aprove cadastros de Personal, bloqueie acessos e acompanhe o estado das contas.
        </p></div>
        <UsersWireframe />
      </header>

      <div className="users-stats grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ContadorCard titulo="Total" valor={contadores.total} icone={<Users className="h-5 w-5" />} cor="primary" />
        <ContadorCard titulo="Personais" valor={contadores.personals} icone={<UserCheck className="h-5 w-5" />} cor="success" />
        <ContadorCard titulo="Aguardando aprovação" valor={contadores.pendentes} icone={<Clock3 className="h-5 w-5" />} cor="warning" />
        <ContadorCard titulo="Bloqueados" valor={contadores.bloqueados} icone={<Ban className="h-5 w-5" />} cor="danger" />
      </div>

      <div className="users-filters space-y-3">
        <div data-admin-search className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar usuários por nome ou e-mail"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="users-search pl-9 h-11"
          />
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="users-filter-group flex flex-wrap gap-2">
            {['TODOS', 'ADMIN', 'PERSONAL', 'ALUNO'].map((tipo) => (
              <FiltroBotao
                key={tipo}
                ativo={filtroTipo === tipo}
                onClick={() => setFiltroTipo(tipo)}
                label={tipo === 'TODOS' ? 'Todos os tipos' : tipo}
              />
            ))}
          </div>
          <div className="users-filter-group flex flex-wrap gap-2">
            {['TODOS', 'ATIVO', 'PENDENTE', 'BLOQUEADO'].map((status) => (
              <FiltroBotao
                key={status}
                ativo={filtroStatus === status}
                onClick={() => setFiltroStatus(status)}
                label={status === 'TODOS' ? 'Todos os status' : status}
              />
            ))}
          </div>
        </div>
      </div>

      {acaoMutation.error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {acaoMutation.error instanceof Error ? acaoMutation.error.message : 'Não foi possível concluir a ação.'}
        </div>
      ) : null}

      {erroConsulta ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar os usuários. Atualize a página para tentar novamente.</div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum usuário encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">Tente ajustar a busca ou os filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="users-table-card">
          <CardContent className="p-0">
            <div className="users-table-wrap">
              <table className="users-table w-full text-sm">
                <caption className="sr-only">Usuários da plataforma e ações de acesso</caption>
                <thead><tr>
                  {['Nome', 'E-mail', 'Tipo', 'Data do cadastro', 'Status', 'Ações'].map((label) => <th key={label} scope="col">{label}</th>)}
                </tr></thead>
                <tbody>
                  {linhas?.map((u) => (
                    <tr key={u.id}>
                      <td data-label="Nome"><div className="flex items-center gap-3">
                        <div className="users-avatar">{iniciaisUsuario(u.nome)}</div>
                        <p className="font-semibold">{u.nome}</p>
                      </div></td>
                      <td data-label="E-mail"><span className="users-email">{u.email}</span></td>
                      <td data-label="Tipo"><TipoBadge tipo={u.tipo} /></td>
                      <td data-label="Data do cadastro"><span className="users-date">{formatarData(u.criado_em)}</span></td>
                      <td data-label="Status"><StatusBadge status={u.status_conta} /></td>
                      <td data-label="Ações"><button type="button" className="users-view" aria-label={`Ver detalhes de ${u.nome}`} onClick={() => {
                        acaoMutation.reset()
                        setConfirmBlock(false)
                        setSelectedId(u.id)
                      }}><Eye size={15} />Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="users-pagination">
              <span>{inicio + 1}–{Math.min(inicio + 5, total)} de {total} usuários</span>
              <nav aria-label="Paginação de usuários">
                <button type="button" aria-label="Página anterior" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}><ChevronLeft size={16} /></button>
                <button type="button" aria-current="page" aria-label={`Página ${paginaAtual} de ${totalPaginas}`}>{paginaAtual}</button>
                <button type="button" aria-label="Próxima página" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}><ChevronRight size={16} /></button>
              </nav>
            </div>
          </CardContent>
        </Card>
      )}

      <dialog ref={dialogRef} className="users-details" aria-labelledby="users-details-title"
        onCancel={(event) => { event.preventDefault(); closeDetails() }}
        onClick={(event) => { if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDetails()
        } }}>
        {selected && <div>
          <header className="users-details-heading">
            <div><p className="users-detail-label">Gestão de usuários</p><h2 id="users-details-title">Detalhes do usuário</h2></div>
            <button type="button" className="users-view" aria-label="Fechar detalhes" disabled={acaoMutation.isPending} onClick={closeDetails}><X size={18} /></button>
          </header>
          <section className="users-profile-card" aria-label="Perfil do usuário">
            <div className="users-avatar">{iniciaisUsuario(selected.nome)}</div>
            <div className="users-profile-identity"><h3>{selected.nome}</h3><div className="users-profile-badges"><TipoBadge tipo={selected.tipo} /><StatusBadge status={selected.status_conta} /></div></div>
          </section>
          <dl className="users-profile-data">
            <div><Mail size={22} strokeWidth={1.7} /><div><dt>E-mail</dt><dd>{selected.email}</dd></div></div>
            <div><CalendarDays size={22} strokeWidth={1.7} /><div><dt>Data do cadastro</dt><dd>{formatarData(selected.criado_em)}</dd></div></div>
          </dl>
          {acaoMutation.error && <p role="alert" className="users-detail-error">{acaoMutation.error instanceof Error ? acaoMutation.error.message : 'Não foi possível concluir a ação.'}</p>}
          {acaoMutation.isSuccess && <p role="status" className="users-detail-success">Status atualizado com sucesso.</p>}
          <section className="users-access-panel" aria-labelledby="users-access-title">
            <div className="users-access-copy"><h3 id="users-access-title">Controle de acesso</h3><p>Gerencie o acesso deste usuário à plataforma.</p></div>
          {selected.tipo === 'ADMIN' ? <p className="users-detail-label">Conta administrativa protegida. O status não pode ser alterado nesta tela.</p> :
            confirmBlock ? <div className="users-confirm" role="group" aria-labelledby="users-block-question">
              <h3 id="users-block-question">Bloquear {selected.nome}?</h3>
              <p>O acesso à plataforma será bloqueado. Você poderá desbloquear a conta nesta tela.</p>
              <div className="users-detail-actions">
                <button type="button" className="users-view" disabled={acaoMutation.isPending} onClick={() => setConfirmBlock(false)}>Cancelar</button>
                <button type="button" className="users-view users-danger" disabled={acaoMutation.isPending} onClick={() => acaoMutation.mutate({ usuario: selected, status: 'BLOQUEADO' })}>{acaoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}Confirmar bloqueio</button>
              </div>
            </div> : <div className="users-detail-actions">
              {selected.status_conta === 'PENDENTE' && <button type="button" className="users-view" disabled={acaoMutation.isPending} onClick={() => acaoMutation.mutate({ usuario: selected, status: 'ATIVO' })}><CheckCircle2 size={16} />Aprovar usuário</button>}
              {selected.status_conta === 'BLOQUEADO' ? <button type="button" className="users-view" disabled={acaoMutation.isPending} onClick={() => acaoMutation.mutate({ usuario: selected, status: 'ATIVO' })}>{acaoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Desbloquear usuário</button> :
                <button type="button" className="users-view users-danger" disabled={acaoMutation.isPending} onClick={() => { acaoMutation.reset(); setConfirmBlock(true) }}><Ban size={16} />Bloquear usuário</button>}
            </div>}
          </section>
          <footer className="users-detail-actions"><button type="button" className="users-view" disabled={acaoMutation.isPending} onClick={closeDetails}>Fechar</button></footer>
        </div>}
      </dialog>

      <style jsx global>{`
        .users-workspace { --users-surface:#fcfdf9; --users-border:#d7ded3; --users-muted:#5f6f68; --users-title:#162623; --users-accent:#129b89; min-width:0; font-family:'Sora',sans-serif; }
        html.dark .users-workspace { --users-surface:#091d18; --users-border:#24453b; --users-muted:#A3BECD; --users-title:#F5FAF9; --users-accent:#00E9DF; }
        .users-workspace .users-hero { position:relative; isolation:isolate; overflow:hidden; border:1px solid var(--users-border); border-radius:18px; min-height:224px; padding:32px 40px; background:radial-gradient(ellipse at 90% 50%,#e4f3eb,transparent 65%),#fcfdf9; }
        html.dark .users-workspace .users-hero { background:radial-gradient(ellipse at 84% 60%,#073d32, #071d18 48%, #041512); }
        .users-workspace .users-hero-copy { position:relative; z-index:1; max-width:68%; }
        .users-workspace .users-hero .eyebrow { display:inline-flex; padding:6px 16px; border:1px solid var(--users-accent); border-radius:999px; color:var(--users-accent); font-size:10px; font-weight:650; letter-spacing:.1em; text-transform:uppercase; margin-bottom:17px; }
        .users-workspace .users-hero h1 { font-size:46px; font-weight:800; line-height:1.12; letter-spacing:-.045em; color:var(--users-title); }
        .users-workspace .users-hero h1 span { color:var(--users-accent); }
        .users-workspace .users-subtitle { margin-top:13px; font-size:16px; font-weight:400; line-height:1.6; color:var(--users-muted)!important; -webkit-text-fill-color:currentColor; }
        .users-workspace .users-wireframe { position:absolute; right:0; top:50%; transform:translateY(-50%); width:40%; max-width:480px; height:auto; color:var(--users-accent); pointer-events:none; }
        .users-workspace .users-stat { border:1px solid var(--users-border); border-radius:14px; background:var(--users-surface); box-shadow:none; }
        .users-workspace .users-stat p:first-child { color:var(--users-title); font-size:26px; font-weight:750; }
        .users-workspace .users-stat p:last-child { color:var(--users-muted); line-height:1.5; }
        .users-workspace .users-filters { padding:0; }
        .users-workspace .users-search { border:1px solid var(--users-border); border-radius:10px; background:var(--users-surface); box-shadow:none; color:var(--users-title); }
        .users-workspace .users-search::placeholder { color:var(--users-muted); }
        .users-workspace .users-filter-group button { border:1px solid var(--users-border); border-radius:999px; background:var(--users-surface); color:var(--users-muted); box-shadow:none; height:34px; }
        .users-workspace .users-filter-group button[aria-pressed="true"] { background:var(--users-accent); color:#fff; border-color:var(--users-accent); }
        html.dark .users-workspace .users-filter-group button[aria-pressed="true"] { color:#04231e; }
        .users-workspace .users-table-card { border:1px solid var(--users-border); border-radius:14px; overflow:hidden; background:var(--users-surface); box-shadow:none; }
        .users-workspace .users-table { table-layout:fixed; }
        .users-workspace .users-table th { font-size:11px; color:var(--users-muted); padding:15px 14px; background:transparent; }
        .users-workspace .users-table thead { background:rgba(0,141,133,.035); }
        .users-workspace .users-table td { padding:15px 14px; font-size:12px; overflow-wrap:anywhere; }
        .users-workspace .users-table th:nth-child(1) { width:24%; }
        .users-workspace .users-table th:nth-child(2) { width:12%; }
        .users-workspace .users-table th:nth-child(3) { width:12%; }
        .users-workspace .users-table th:nth-child(4) { width:25%; }
        .users-workspace .users-table th:nth-child(5) { width:12%; }
        .users-workspace .users-table th:nth-child(6) { width:15%; }
        .users-workspace .users-table tr { border-color:var(--users-border); }
        .users-workspace .users-table td:first-child p { color:var(--users-title); font-weight:600; }
        .users-workspace .users-table td:first-child > div > div { flex-shrink:0; }
        .users-workspace .users-email { color:var(--users-muted); font-size:11px; }
        .users-workspace .users-email svg { flex-shrink:0; }
        .users-workspace .users-table td[data-label="Criado em"] span { color:var(--users-muted); font-size:11px; }
        .users-workspace .users-table td[data-label="Ações"] > div { flex-wrap:wrap; }
        .users-workspace .users-table td[data-label="Ações"] button { height:32px; padding:0 9px; font-size:11px; border-radius:8px; box-shadow:none; }
        .users-workspace .users-block { color:#b42336; border-color:#e7bcc2; background:transparent; }
        html.dark .users-workspace .users-block { color:#ff8f9b; border-color:#75434b; }
        .users-workspace button:focus-visible, .users-workspace input:focus-visible { outline:2px solid var(--users-accent); outline-offset:3px; }
        @media(min-width:768px) and (max-width:1199px) {
          .users-workspace .users-hero-copy { max-width:72%; }
          .users-workspace .users-wireframe { opacity:.65; width:36%; }
          .users-workspace .users-table th,.users-workspace .users-table td { padding:12px 8px; }
          .users-workspace .users-table td[data-label="E-mail"] { font-size:10px; }
        }
        @media(max-width:767px) {
          .users-workspace .users-hero { min-height:220px; padding:27px 22px; }
          .users-workspace .users-hero-copy { max-width:100%; }
          .users-workspace .users-hero h1 { font-size:32px; }
          .users-workspace .users-subtitle { font-size:14px; }
          .users-workspace .users-wireframe { width:280px; right:-100px; top:68%; opacity:.17; z-index:-1; }
          .users-workspace .users-stat > div { padding:14px 12px; }
          .users-workspace .users-stat > div > div { gap:9px; align-items:flex-start; }
          .users-workspace .users-stat p:first-child { font-size:24px; }
          .users-workspace .users-stat p:last-child { font-size:10px; }
          .users-workspace .users-stat > div > div > div:first-child { width:32px; height:32px; border-radius:9px; flex-shrink:0; }
          .users-workspace .users-filter-group { gap:6px; }
          .users-workspace .users-filter-group button { padding:0 10px; font-size:10px; min-height:36px; }
          .users-workspace .users-table-card { border:0; background:transparent; overflow:visible; }
          .users-workspace .users-table,.users-workspace .users-table tbody { display:block; width:100%; }
          .users-workspace .users-table thead { display:none; }
          .users-workspace .users-table tbody tr { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:18px; margin-bottom:12px; border:1px solid var(--users-border); border-radius:14px; background:var(--users-surface); }
          .users-workspace .users-table td { display:block; padding:0; min-width:0; }
          .users-workspace .users-table td:first-child,.users-workspace .users-table td[data-label="E-mail"],.users-workspace .users-table td[data-label="Ações"] { grid-column:1/-1; }
          .users-workspace .users-table td[data-label="Criado em"]::before { content:"Criado em"; display:block; color:var(--users-muted); font-size:10px; margin-bottom:4px; }
          .users-workspace .users-table td[data-label="Ações"] > div { justify-content:flex-start; }
          .users-workspace .users-table td[data-label="Ações"] button { min-height:40px; padding:0 12px; font-size:12px; }
          .users-workspace .users-email { font-size:12px; }
        }

        html:not(.dark) .users-workspace .users-hero h1 { color:#112b2a; }
        html:not(.dark) .users-workspace .users-hero h1 span,
        html:not(.dark) .users-workspace .users-wireframe { color:#008d85; }
        html:not(.dark) .users-workspace .users-subtitle { color:#53717e!important; }
        html:not(.dark) .users-workspace .users-search::placeholder { color:#7b8983; }
        html:not(.dark) .users-workspace .users-table thead { background:#eef1e9; }
        html:not(.dark) .users-workspace .users-filter-group button[aria-pressed="true"] { background:#e4f3eb; color:#0d7e70; border-color:#129b89; }

        /* Exact requested light palette for desktop rows and mobile cards. */
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table-card,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table thead,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table tbody tr,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table :is(th,td) {
          background:#fcfdf9; border-color:#d7ded3;
        }
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table th,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table .users-email,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table td[data-label="Criado em"] span,
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table td[data-label="Criado em"]::before {
          color:#5f6f68;
        }
        html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table td[data-label="Ações"] button {
          border-color:#d7ded3;
        }
        @media(max-width:767px) {
          html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table-card,
          html.light [data-admin-route="/admin/usuarios"] .users-workspace .users-table { background:transparent; }
        }

        /* Compact users table and accessible details dialog. */
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace { --users-surface:#fcfdf9; --users-border:#d7ded3; --users-muted:#5f6f68; --users-title:#162623; --users-accent:#129b89; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace { --users-surface:#091c18; --users-border:#1c4037; --users-muted:#a3becd; --users-title:#f5faf9; --users-accent:#00e9df; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table-card { border-radius:17px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table thead { background:transparent; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table thead th { border-bottom:1px solid var(--users-border); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th { padding:14px 20px; font-size:10px; font-weight:650; letter-spacing:.1em; text-transform:uppercase; text-align:left; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th:nth-child(1) { width:24%; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th:nth-child(2) { width:27%; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th:nth-child(3) { width:12%; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th:nth-child(4) { width:15%; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th:nth-child(5) { width:10%; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th:nth-child(6) { width:124px; text-align:center; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td { padding:6px 20px; height:50px; font-size:12px; border-bottom:1px solid var(--users-border); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td:first-child p { font-weight:650; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-avatar { display:grid; place-items:center; width:36px; height:36px; flex:0 0 36px; border-radius:50%; background:linear-gradient(145deg,#6f86b6,#4f678f); color:#fff; font-size:11px; font-weight:700; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-email, html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-date { color:var(--users-muted); font-size:12px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="Ações"] { text-align:right; overflow-wrap:normal; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="Ações"] .users-view { min-width:84px; padding:0 14px; white-space:nowrap; word-break:normal; overflow-wrap:normal; flex-shrink:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-status { border:1px solid currentColor; min-height:30px; white-space:nowrap; padding:4px 12px; font-size:11px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace [data-user-status="ATIVO"] { background:rgba(18,155,137,.07); color:#0d7e70; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace [data-user-status="ATIVO"] { background:rgba(0,233,223,.07); color:#00e9df; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-view { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:36px; padding:0 18px; border:1px solid var(--users-border); border-radius:13px; background:transparent; color:var(--users-title); font-size:12px; font-weight:600; transition:background-color 150ms ease,border-color 150ms ease; box-shadow:none; transform:none; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-view svg { color:var(--users-accent); flex-shrink:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-view:disabled { opacity:.45; cursor:not-allowed; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 20px; color:var(--users-muted); font-size:12px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination nav { display:flex; gap:6px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination button { display:grid; place-items:center; min-width:34px; height:36px; border:1px solid var(--users-border); border-radius:10px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination button[aria-current] { background:var(--users-accent); border-color:var(--users-accent); color:#fff; font-weight:700; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination button[aria-current] { color:#002a26; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination button:disabled { opacity:.35; cursor:not-allowed; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details { width:min(560px,calc(100vw - 32px)); max-height:calc(100dvh - 32px); margin:auto; padding:24px; border:1px solid var(--users-border); border-radius:18px; background:var(--users-surface); color:var(--users-title); overflow-y:auto; overscroll-behavior:contain; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details::backdrop { background:rgba(0,12,9,.65); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:20px; border-bottom:1px solid var(--users-border); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading h2 { font-size:20px; font-weight:700; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading button { padding:0; width:40px; height:40px; flex-shrink:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-label { font-size:12px; color:var(--users-muted); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-person { display:flex; align-items:center; gap:12px; margin:20px 0; overflow-wrap:anywhere; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-fields { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:24px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-fields > div:first-child { grid-column:1/-1; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-fields dt { font-size:12px; color:var(--users-muted); margin-bottom:6px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-fields dd { font-size:14px; overflow-wrap:anywhere; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:10px; margin-top:18px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-actions button { min-height:44px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details footer { padding-top:18px; border-top:1px solid var(--users-border); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-danger { color:#b42336; border-color:#e7bcc2; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-danger svg { color:inherit; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-danger { color:#ff8f9b; border-color:#75434b; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-confirm { padding:16px; border:1px solid var(--users-border); border-radius:13px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-confirm h3 { font-size:14px; font-weight:700; overflow-wrap:anywhere; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-confirm p { color:var(--users-muted); font-size:13px; line-height:1.6; margin-top:8px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-error { color:#b42336; font-size:13px; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-error { color:#ff8f9b; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-success { color:var(--users-accent); font-size:13px; }
        @media(hover:hover) and (pointer:fine) {
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-view:hover:enabled { background:color-mix(in srgb,var(--users-accent) 7%,transparent); border-color:color-mix(in srgb,var(--users-accent) 40%,transparent); }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-danger:hover:enabled { background:rgba(180,35,54,.07); border-color:currentColor; }
        }
        @media(min-width:768px) and (max-width:1199px) {
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table th, html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td { padding-left:10px; padding-right:10px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-view { padding:0 10px; }
        }
        @media(max-width:767px) {
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td { height:auto; padding:0; border:0; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="Nome"], html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="E-mail"], html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="Ações"] { grid-column:1/-1; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="Data do cadastro"]::before { content:"Data do cadastro"; display:block; color:var(--users-muted); font-size:10px; margin-bottom:4px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-table td[data-label="Ações"] { text-align:left; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-view { min-height:44px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination { padding:10px 0; flex-wrap:wrap; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-pagination button { width:44px; height:44px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details { width:calc(100vw - 24px); max-height:calc(100dvh - 24px); padding:20px; }
        }
        @media(max-width:380px) {
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-fields { grid-template-columns:1fr; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-detail-actions button { width:100%; }
        }


        /* Organized user profile with grouped access controls. */
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details { width:min(600px,calc(100vw - 32px)); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading { border:0; padding-bottom:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading .users-detail-label { text-transform:uppercase; font-size:10px; letter-spacing:.06em; margin-bottom:4px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading h2 { font-size:22px; line-height:1.3; letter-spacing:-.025em; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-card { display:flex; align-items:center; gap:18px; padding:18px; margin-top:20px; border:1px solid var(--users-border); border-radius:13px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-card .users-avatar { width:64px; height:64px; flex-basis:64px; font-size:20px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-identity { min-width:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-identity h3 { font-size:18px; font-weight:700; line-height:1.4; overflow-wrap:anywhere; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-badges { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:7px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data { margin:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data > div { display:flex; align-items:flex-start; gap:16px; padding:16px 8px; min-width:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data > div + div { border-top:1px solid var(--users-border); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data > div > svg { color:var(--users-muted); flex-shrink:0; margin-top:3px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data > div > div { min-width:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data dt { color:var(--users-muted); font-size:12px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-data dd { color:var(--users-title); font-size:14px; line-height:1.6; overflow-wrap:anywhere; margin-top:2px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-panel { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; padding:16px; border:1px solid var(--users-border); border-radius:13px; background:#fcfdf9; border-color:#d7ded3; margin-top:2px; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-panel { background:rgba(0,233,223,.035); border-color:var(--users-border); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-copy { flex:1 1 200px; min-width:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-copy h3 { font-size:15px; font-weight:700; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-copy p { color:var(--users-muted); font-size:11px; line-height:1.6; margin-top:4px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-panel > .users-detail-actions { margin-top:0; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-panel .users-confirm { flex:1 1 100%; background:var(--users-surface); }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details footer { margin-top:16px; padding-top:12px; }
        html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-panel .users-view { padding-left:12px; padding-right:12px; white-space:nowrap; }
        @media(max-width:600px) {
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details { width:calc(100vw - 24px); }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-details-heading h2 { font-size:20px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-card { padding:16px; gap:14px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-card .users-avatar { width:52px; height:52px; flex-basis:52px; font-size:16px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-profile-identity h3 { font-size:16px; }
          html [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace .users-access-panel > .users-detail-actions { width:100%; justify-content:flex-start; }
        }


        /* Align the Actions heading and controls without changing mobile cards. */
        @media(min-width:768px) {
          html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table th:last-child, html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table td[data-label="Ações"] { text-align:center!important; }
        }
        /* Informational status labels share the soft table badge treatment. */
        html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table .users-status {
          border:0!important; min-height:0; gap:7px; padding:7px 12px;
          border-radius:999px; font-size:11px; font-weight:500; line-height:1.5;
        }
        html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table .users-status svg { width:15px; height:15px; flex-shrink:0; }
        html.light [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table [data-user-status="ATIVO"] {
          background:#e4f3eb!important; color:#0d7e70!important;
        }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table [data-user-status="ATIVO"] {
          background:#123b31!important; color:#00e9df!important;
        }
        html:is(.light,.dark) [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table :is(.users-email,.users-date) { color:var(--users-muted)!important; }
        html.light [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table :is(.users-email,.users-date) { color:#5f6f68!important; }
        html.dark [data-admin-route="/admin/usuarios"] [data-admin-content] .users-workspace.users-workspace .users-table :is(.users-email,.users-date) { color:#a3becd!important; }

      `}</style>
    </div>
  )
}

function iniciaisUsuario(nome: string) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean)
  return partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : (partes[0]?.slice(0, 2).toUpperCase() || '?')
}

function FiltroBotao({ ativo, onClick, label }: { ativo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 flex-shrink-0 rounded-xl px-3 text-xs font-medium transition-all ${
        ativo
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
      aria-pressed={ativo}
    >
      {label}
    </button>
  )
}

function TipoBadge({ tipo }: { tipo: TipoUsuario }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      tipo === 'ADMIN' ? 'bg-warning/10 text-warning' :
      tipo === 'PERSONAL' ? 'bg-success/10 text-success' :
      'bg-info/10 text-info'
    }`}>
      {tipo === 'ADMIN' && <Shield className="h-3 w-3" />}
      {tipo === 'PERSONAL' && <UserCheck className="h-3 w-3" />}
      {tipo === 'ALUNO' && <GraduationCap className="h-3 w-3" />}
      {tipo}
    </span>
  )
}

function StatusBadge({ status }: { status: StatusConta }) {
  const config = {
    ATIVO: { classe: 'bg-success/10 text-success', icone: CheckCircle2, label: 'Ativo' },
    PENDENTE: { classe: 'bg-warning/10 text-warning', icone: Clock3, label: 'Pendente' },
    BLOQUEADO: { classe: 'bg-destructive/10 text-destructive', icone: Ban, label: 'Bloqueado' },
  }[status]
  const Icone = config.icone

  return (
    <span data-user-status={status} className={`users-status inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.classe}`}>
      <Icone className="h-3 w-3" /> {config.label}
    </span>
  )
}

function ContadorCard({ titulo, valor, icone, cor }: { titulo: string; valor: number; icone: React.ReactNode; cor: string }) {
  const cores: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  }
  return (
    <Card className="users-stat">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cores[cor]}`}>
            {icone}
          </div>
          <div>
            <p className="text-2xl font-bold">{valor}</p>
            <p className="text-xs text-muted-foreground">{titulo}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UsersWireframe() {
  const nodes = [{ x: 94, y: 140, r: 27 }, { x: 194, y: 66, r: 30 }, { x: 291, y: 160, r: 26 }, { x: 405, y: 98, r: 32 }]
  return (
    <svg className="users-wireframe" viewBox="0 0 480 240" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth=".75" opacity=".35">
        <ellipse cx="244" cy="121" rx="216" ry="66" transform="rotate(-8 244 121)" />
        <ellipse cx="244" cy="121" rx="185" ry="51" transform="rotate(13 244 121)" />
        <ellipse cx="244" cy="121" rx="154" ry="73" transform="rotate(-18 244 121)" />
        <path d="M35 138Q170 1 405 98Q335 218 94 140Q181 190 194 66Q300 27 291 160Q390 180 455 73" />
      </g>
      {[{ x: 30, y: 134 }, { x: 117, y: 48 }, { x: 292, y: 41 }, { x: 451, y: 76 }, { x: 357, y: 192 }, { x: 141, y: 193 }].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="currentColor" opacity=".75" />)}
      {nodes.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r={p.r} fill="var(--users-surface)" stroke="currentColor" strokeOpacity=".65" strokeWidth=".9" />
          <circle cy="-6" r="6" fill="currentColor" opacity=".8" />
          <path d="M-11 13v-3c0-6 5-9 11-9s11 3 11 9v3Z" fill="currentColor" opacity=".8" />
          <circle r={p.r+5} stroke="currentColor" strokeOpacity=".1" strokeWidth=".6" />
        </g>
      ))}
    </svg>
  )
}
