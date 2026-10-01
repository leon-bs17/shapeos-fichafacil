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

  const { data: usuarios, isLoading } = useQuery({
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
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Gestão de usuários</h1>
        <p className="text-muted-foreground text-sm">
          Aprove cadastros de Personal, bloqueie acessos e acompanhe o estado das contas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ContadorCard titulo="Total" valor={contadores.total} icone={<Users className="h-5 w-5" />} cor="primary" />
        <ContadorCard titulo="Personais" valor={contadores.personals} icone={<UserCheck className="h-5 w-5" />} cor="success" />
        <ContadorCard titulo="Aguardando aprovação" valor={contadores.pendentes} icone={<Clock3 className="h-5 w-5" />} cor="warning" />
        <ContadorCard titulo="Bloqueados" valor={contadores.bloqueados} icone={<Ban className="h-5 w-5" />} cor="danger" />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['TODOS', 'ADMIN', 'PERSONAL', 'ALUNO'].map((tipo) => (
              <FiltroBotao
                key={tipo}
                ativo={filtroTipo === tipo}
                onClick={() => setFiltroTipo(tipo)}
                label={tipo === 'TODOS' ? 'Todos os tipos' : tipo}
              />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
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

      {isLoading ? (
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
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
                        <td className="px-5 py-3.5">
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
                        <td className="px-5 py-3.5">
                          <TipoBadge tipo={u.tipo} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={u.status_conta} />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {u.email}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatarData(u.criado_em)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
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
                                className="text-destructive"
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
    <Card className="hover:shadow-md transition-shadow">
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
