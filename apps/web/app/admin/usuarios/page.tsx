'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Users, Search, Filter, Mail, Calendar, Shield, UserCheck, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarData } from '@/lib/utils'

export default function AdminUsuariosPage() {
  return <UsuariosConteudo />
}

function UsuariosConteudo() {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, criado_em')
        .order('criado_em', { ascending: false })
      return data ?? []
    },
  })

  const filtrados = usuarios?.filter((u) => {
    const matchesBusca = busca === '' ||
      u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      u.email?.toLowerCase().includes(busca.toLowerCase())
    const matchesTipo = filtroTipo === 'TODOS' || u.tipo === filtroTipo
    return matchesBusca && matchesTipo
  })

  const contadores = {
    total: usuarios?.length ?? 0,
    personals: usuarios?.filter((u) => u.tipo === 'PERSONAL').length ?? 0,
    alunos: usuarios?.filter((u) => u.tipo === 'ALUNO').length ?? 0,
    admins: usuarios?.filter((u) => u.tipo === 'ADMIN').length ?? 0,
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Todos os usuarios registrados na plataforma.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <ContadorCard titulo="Total" valor={contadores.total} icone={<Users className="h-5 w-5" />} cor="primary" />
        <ContadorCard titulo="Personais" valor={contadores.personals} icone={<UserCheck className="h-5 w-5" />} cor="success" />
        <ContadorCard titulo="Alunos" valor={contadores.alunos} icone={<GraduationCap className="h-5 w-5" />} cor="info" />
        <ContadorCard titulo="Admins" valor={contadores.admins} icone={<Shield className="h-5 w-5" />} cor="warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2">
          {['TODOS', 'ADMIN', 'PERSONAL', 'ALUNO'].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3 h-10 rounded-xl text-xs font-medium transition-all ${
                filtroTipo === tipo
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tipo === 'TODOS' ? 'Todos' : tipo}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum usuario encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">Tente ajustar os filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados?.map((u) => (
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
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.tipo === 'ADMIN' ? 'bg-warning/10 text-warning' :
                          u.tipo === 'PERSONAL' ? 'bg-success/10 text-success' :
                          'bg-info/10 text-info'
                        }`}>
                          {u.tipo === 'ADMIN' && <Shield className="h-3 w-3" />}
                          {u.tipo === 'PERSONAL' && <UserCheck className="h-3 w-3" />}
                          {u.tipo === 'ALUNO' && <GraduationCap className="h-3 w-3" />}
                          {u.tipo}
                        </span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ContadorCard({ titulo, valor, icone, cor }: { titulo: string; valor: number; icone: React.ReactNode; cor: string }) {
  const cores: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
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
