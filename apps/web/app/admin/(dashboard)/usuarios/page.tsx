'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Calendar, GraduationCap, Mail, Search, Shield, UserCheck, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatarData } from '@/lib/utils'

type Plano = 'STARTER' | 'PRO' | 'DREAM'

export default function AdminUsuariosPage() {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, plano, avatar_url, criado_em')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const filtrados = usuarios?.filter((u) => {
    const termo = busca.toLowerCase()
    const matchesBusca =
      busca === '' ||
      u.nome?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo)
    const matchesTipo = filtroTipo === 'TODOS' || u.tipo === filtroTipo
    return matchesBusca && matchesTipo
  })

  const contadores = {
    total: usuarios?.length ?? 0,
    personals: usuarios?.filter((u) => u.tipo === 'PERSONAL').length ?? 0,
    alunos: usuarios?.filter((u) => u.tipo === 'ALUNO').length ?? 0,
    admins: usuarios?.filter((u) => u.tipo === 'ADMIN').length ?? 0,
  }

  async function alterarPlano(id: string, plano: Plano) {
    const supabase = createClient()
    const { error } = await supabase.from('usuarios').update({ plano }).eq('id', id)

    if (error) {
      toast({ tone: 'danger', title: 'Plano não alterado', description: error.message })
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] }),
      queryClient.invalidateQueries({ queryKey: ['product-topbar'] }),
    ])
    toast({ tone: 'success', title: 'Plano atualizado', description: `Usuário movido para ${plano.toLowerCase()}.` })
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Administração</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso, papel e plano comercial da base.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <ContadorCard titulo="Total" valor={contadores.total} icone={<Users className="h-4 w-4" />} />
        <ContadorCard titulo="Personais" valor={contadores.personals} icone={<UserCheck className="h-4 w-4" />} />
        <ContadorCard titulo="Alunos" valor={contadores.alunos} icone={<GraduationCap className="h-4 w-4" />} />
        <ContadorCard titulo="Admins" valor={contadores.admins} icone={<Shield className="h-4 w-4" />} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectField value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Filtrar usuários por tipo">
            <option value="TODOS">Todos os tipos</option>
            <option value="ADMIN">Admins</option>
            <option value="PERSONAL">Personais</option>
            <option value="ALUNO">Alunos</option>
          </SelectField>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste a busca ou o filtro para encontrar outro perfil." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-foreground/[0.025] text-left">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Usuário</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Papel</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Plano</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">E-mail</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {filtrados?.map((u) => (
                  <tr key={u.id} className="border-t border-border/60 transition hover:bg-foreground/[0.018]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                            {u.nome?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <p className="font-semibold">{u.nome}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={u.tipo === 'ADMIN' ? 'warning' : u.tipo === 'PERSONAL' ? 'success' : 'neutral'}>
                        {u.tipo}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.tipo === 'PERSONAL' ? (
                        <SelectField
                          value={u.plano ?? 'STARTER'}
                          onChange={(e) => void alterarPlano(u.id, e.target.value as Plano)}
                          className="h-9 min-w-32"
                          aria-label={`Plano de ${u.nome}`}
                        >
                          <option value="STARTER">Starter</option>
                          <option value="PRO">Pro</option>
                          <option value="DREAM">Dream</option>
                        </SelectField>
                      ) : (
                        <span className="text-xs text-muted-foreground">{u.tipo === 'ADMIN' ? 'Interno' : 'Vinculado ao personal'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {u.email}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatarData(u.criado_em)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ContadorCard({ titulo, valor, icone }: { titulo: string; valor: number; icone: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/8 text-primary">{icone}</div>
        <div>
          <p className="text-xl font-semibold tracking-tight">{valor}</p>
          <p className="text-[11px] text-muted-foreground">{titulo}</p>
        </div>
      </CardContent>
    </Card>
  )
}
