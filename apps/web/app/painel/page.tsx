'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Dumbbell, History, Play, Send, Loader2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { fichasAtivasDoAluno, meusRegistros, registrarExecucaoWeb } from '@/services/aluno'
import { formatarData } from '@/lib/utils'
import { ModoExecucao } from '@/components/aluno/modo-execucao'

interface FichaAluno {
  id: string; titulo: string; criado_em: string
  itens: { id: string; exercicio: { id: string; nome: string; grupo_muscular: string }; series: number; repeticoes: string; descanso_segundos: number; ordem: number }[]
}

export default function PainelAlunoPage() {
  const queryClient = useQueryClient()
  const [campos, setCampos] = useState<Record<string, { carga: string; reps: string }>>({})
  const [fichaEmExecucao, setFichaEmExecucao] = useState<FichaAluno | null>(null)

  const fichas = useQuery({
    queryKey: ['ficha-aluno'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessao expirada')
      return fichasAtivasDoAluno(supabase, user.id)
    },
  })

  const registros = useQuery({
    queryKey: ['registros-aluno'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessao expirada')
      return meusRegistros(supabase, user.id)
    },
  })

  const registrar = useMutation({
    mutationFn: async ({ itemTreinoId, carga, reps }: { itemTreinoId: string; carga: number | null; reps: number | null }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessao expirada')
      await registrarExecucaoWeb(supabase, user.id, { item_treino_id: itemTreinoId, carga_utilizada: carga, repeticoes_feitas: reps })
    },
    onSuccess: (_d, vars) => {
      setCampos((atual) => ({ ...atual, [vars.itemTreinoId]: { carga: '', reps: '' } }))
      void queryClient.invalidateQueries({ queryKey: ['registros-aluno'] })
    },
  })

  async function salvarSerie(itemTreinoId: string, carga: number | null, reps: number | null) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Sessao expirada')
    await registrarExecucaoWeb(supabase, user.id, {
      item_treino_id: itemTreinoId,
      carga_utilizada: carga,
      repeticoes_feitas: reps,
    })
    void queryClient.invalidateQueries({ queryKey: ['registros-aluno'] })
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-gradient">Painel do Aluno</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sua ficha ativa e seu progresso — atualizado pelo seu personal.
        </p>
      </header>

      {fichaEmExecucao ? (
        <ModoExecucao
          exercicios={fichaEmExecucao.itens.map((item) => ({
            id: item.id, nome: item.exercicio.nome, grupo_muscular: item.exercicio.grupo_muscular,
            series: item.series, repeticoes: item.repeticoes, descanso_segundos: item.descanso_segundos, ordem: item.ordem,
          }))}
          onRegistrarSerie={salvarSerie}
          onFinalizar={() => setFichaEmExecucao(null)}
          onCancelar={() => setFichaEmExecucao(null)}
        />
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold animate-fade-in stagger-1">
              <ClipboardList className="h-5 w-5 text-primary" /> Ficha ativa
            </h2>

            {fichas.isLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-32 skeleton" />)}
              </div>
            ) : fichas.data?.length === 0 || !fichas.data ? (
              <Card className="card-tech-glow border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 glow-primary-subtle">
                    <Dumbbell className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-semibold">Nenhuma ficha ativa no momento</p>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                    Seu personal ainda não montou sua ficha. Aguarde ou entre em contato.
                  </p>
                </CardContent>
              </Card>
            ) : (
              fichas.data.map((ficha, idx) => (
                <Card key={ficha.id} className="card-tech card-tech-glow animate-slide-up stagger-2 hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{ficha.titulo}</CardTitle>
                        <CardDescription>Ativa desde {formatarData(ficha.criado_em)}</CardDescription>
                      </div>
                      <Button onClick={() => setFichaEmExecucao(ficha)} className="shadow-sm shrink-0 btn-tech">
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Iniciar Treino
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ficha.itens.map((item) => {
                      const campo = campos[item.id] ?? { carga: '', reps: '' }
                      return (
                        <div key={item.id} className="card-tech rounded-xl p-4 hover:border-primary/20 transition-all duration-200">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <TrendingUp className="h-3.5 w-3.5" />
                              </div>
                              <p className="font-medium text-sm">{item.exercicio.nome}</p>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs font-mono">
                              {item.series} × {item.repeticoes} · {item.descanso_segundos}s
                            </span>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Input type="number" min={0} step="0.5" placeholder="Carga (kg)" value={campo.carga}
                                onChange={(e) => setCampos((atual) => ({ ...atual, [item.id]: { ...campo, carga: e.target.value } }))}
                                className="h-9 text-sm input-tech" />
                            </div>
                            <div className="flex-1">
                              <Input type="number" min={1} placeholder="Reps" value={campo.reps}
                                onChange={(e) => setCampos((atual) => ({ ...atual, [item.id]: { ...campo, reps: e.target.value } }))}
                                className="h-9 text-sm input-tech" />
                            </div>
                            <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl shadow-sm btn-tech"
                              aria-label={`Registrar execucao de ${item.exercicio.nome}`}
                              disabled={registrar.isPending && registrar.variables?.itemTreinoId === item.id}
                              onClick={() => registrar.mutate({
                                itemTreinoId: item.id,
                                carga: campo.carga ? Number(campo.carga.replace(',', '.')) : null,
                                reps: campo.reps ? Number(campo.reps) : null,
                              })}>
                              {registrar.isPending && registrar.variables?.itemTreinoId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {registrar.error ? (
                      <div className="card-tech rounded-xl bg-destructive/10 border-destructive/20 px-4 py-3">
                        <p className="text-destructive text-sm">{registrar.error.message}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold animate-fade-in stagger-3">
              <History className="h-5 w-5 text-primary" /> Meu histórico
            </h2>
            {registros.isLoading ? (
              <div className="h-24 skeleton" />
            ) : registros.data?.length === 0 || !registros.data ? (
              <Card className="card-tech-glow border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nenhum registro ainda. Registre sua primeira série na ficha acima!
                </CardContent>
              </Card>
            ) : (
              <Card className="card-tech overflow-hidden">
                <CardContent className="divide-y divide-border p-0">
                  {registros.data.slice(0, 20).map((r, i) => (
                    <div key={i} className="card-tech flex items-center justify-between px-5 py-3 text-sm hover:bg-accent/50 hover:border-primary/10 transition-all duration-200">
                      <span className="font-medium">{r.exercicio_nome}</span>
                      <span className="text-muted-foreground text-xs">
                        {[r.carga_utilizada != null ? `${r.carga_utilizada} kg` : null, r.repeticoes_feitas != null ? `${r.repeticoes_feitas} reps` : null]
                          .filter(Boolean).join(' · ') || '—'} · {formatarData(r.data_registro)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  )
}
