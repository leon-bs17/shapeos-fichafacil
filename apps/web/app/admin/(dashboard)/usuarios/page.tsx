'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Ban,
  Calendar,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Criado em</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados?.map((u) => {
                    const processando = acaoMutation.isPending && acaoMutation.variables?.usuario.id === u.id
                    return (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td data-label="Usuário" className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                              u.tipo === 'ADMIN' ? 'bg-warning/10 text-warning' :
                              u.tipo === 'PERSONAL' ? 'bg-success/10 text-success' :
                              'bg-info/10 text-info'
                            }`}>
                              {u.nome?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <p className="font-medium">{u.nome}</p>
                          </div>
                        </td>
                        <td data-label="Tipo" className="px-5 py-3.5">
                          <TipoBadge tipo={u.tipo} />
                        </td>
                        <td data-label="Status" className="px-5 py-3.5">
                          <StatusBadge status={u.status_conta} />
                        </td>
                        <td data-label="E-mail" className="px-5 py-3.5">
                          <span className="users-email text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {u.email}
                          </span>
                        </td>
                        <td data-label="Criado em" className="px-5 py-3.5">
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatarData(u.criado_em)}
                          </span>
                        </td>
                        <td data-label="Ações" className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
                            {u.tipo === 'ADMIN' ? (
                              <span className="text-xs text-muted-foreground">Protegido</span>
                            ) : u.status_conta === 'PENDENTE' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => acaoMutation.mutate({ usuario: u, status: 'ATIVO' })}
                                  disabled={processando}
                                >
                                  {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => acaoMutation.mutate({ usuario: u, status: 'BLOQUEADO' })}
                                  disabled={processando}
                                >
                                  <Ban className="h-3.5 w-3.5" /> Bloquear
                                </Button>
                              </>
                            ) : u.status_conta === 'BLOQUEADO' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acaoMutation.mutate({ usuario: u, status: 'ATIVO' })}
                                disabled={processando}
                              >
                                {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Reativar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acaoMutation.mutate({ usuario: u, status: 'BLOQUEADO' })}
                                disabled={processando}
                                className="users-block text-destructive"
                              >
                                {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                                Bloquear
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
      `}</style>
    </div>
  )
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.classe}`}>
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
