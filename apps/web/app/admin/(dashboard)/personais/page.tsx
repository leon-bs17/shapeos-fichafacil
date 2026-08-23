'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Search, Users, ChevronDown, ChevronRight, Mail, Calendar, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarData } from '@/lib/utils'

interface PersonalComAlunos {
  id: string
  nome: string
  email: string
  criado_em: string
  total_alunos: number
  total_treinos: number
  alunos: { id: string; nome: string; email: string; status: string; vinculo_desde: string }[]
}

export default function AdminPersonaisPage() {
  return <PersonaisConteudo />
}

function PersonaisConteudo() {
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  const { data: personais, isLoading } = useQuery({
    queryKey: ['admin-personais'],
    queryFn: async () => {
      const supabase = createClient()

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nome, email, criado_em')
        .eq('tipo', 'PERSONAL')
        .order('criado_em', { ascending: false })

      if (!usuarios) return []

      const result: PersonalComAlunos[] = []

      for (const u of usuarios) {
        const { data: vinculos } = await supabase
          .from('personal_alunos')
          .select('aluno_id, status, criado_em')
          .eq('personal_id', u.id)

        const alunoIds = vinculos?.map((v) => v.aluno_id) ?? []

        let alunos: PersonalComAlunos['alunos'] = []
        if (alunoIds.length > 0) {
          const { data: alunosData } = await supabase
            .from('usuarios')
            .select('id, nome, email')
            .in('id', alunoIds)

          alunos = (alunosData ?? []).map((a) => {
            const vinculo = vinculos?.find((v) => v.aluno_id === a.id)
            return {
              id: a.id,
              nome: a.nome,
              email: a.email,
              status: vinculo?.status ?? 'ATIVO',
              vinculo_desde: vinculo?.criado_em ?? '',
            }
          })
        }

        const { count: totalTreinos } = await supabase
          .from('treinos')
          .select('id', { count: 'exact', head: true })
          .eq('personal_id', u.id)

        result.push({
          id: u.id,
          nome: u.nome,
          email: u.email,
          criado_em: u.criado_em,
          total_alunos: alunos.length,
          total_treinos: totalTreinos ?? 0,
          alunos,
        })
      }

      return result
    },
  })

  const filtrados = personais?.filter((p) =>
    busca === '' ||
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.email?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Personais</h1>
        <p className="text-muted-foreground texts">
          Personal trainers e seus respectivos alunos.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{personais?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Personais ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{personais?.reduce((acc, p) => acc + p.total_alunos, 0) ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de alunos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{personais?.reduce((acc, p) => acc + p.total_treinos, 0) ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de treinos</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar personal por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum personal encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados?.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <button
                onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                className="w-full text-left"
              >
                <CardContent className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                      {p.nome?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.nome}</p>
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {p.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-lg">{p.total_alunos}</p>
                        <p className="text-xs text-muted-foreground">alunos</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg">{p.total_treinos}</p>
                        <p className="text-xs text-muted-foreground">treinos</p>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {expandido === p.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </div>
                </CardContent>
              </button>

              {expandido === p.id && p.alunos.length > 0 && (
                <div className="border-t border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Alunos vinculados</p>
                  <div className="space-y-2">
                    {p.alunos.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10 text-xs font-bold text-info">
                            {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.nome}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            a.status === 'ATIVO'
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {a.status}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatarData(a.vinculo_desde)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandido === p.id && p.alunos.length === 0 && (
                <div className="border-t border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum aluno vinculado</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
