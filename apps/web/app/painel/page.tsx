'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Dumbbell, History, Play, Send } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  fichasAtivasDoAluno,
  meusRegistros,
  registrarExecucaoWeb,
} from '@/services/aluno'
import { formatarData } from '@/lib/utils'
import { ModoExecucao } from '@/components/aluno/modo-execucao'

interface FichaAluno {
  id: string
  titulo: string
  criado_em: string
  itens: {
    id: string
    exercicio: { id: string; nome: string; grupo_muscular: string }
    series: number
    repeticoes: string
    descanso_segundos: number
    ordem: number
  }[]
}

export default function PainelAlunoPage() {
  const queryClient = useQueryClient()
  const [campos, setCampos] = useState<Record<string, { carga: string; reps: string }>>({})
  const [fichaEmExecucao, setFichaEmExecucao] = useState<FichaAluno | null>(null)

  const fichas = useQuery({
    queryKey: ['ficha-aluno'],
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')
      return fichasAtivasDoAluno(supabase, user.id)
    },
  })

  const registros = useQuery({
    queryKey: ['registros-aluno'],
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')
      return meusRegistros(supabase, user.id)
    },
  })

  const registrar = useMutation({
    mutationFn: async ({
      itemTreinoId,
      carga,
      reps,
    }: {
      itemTreinoId: string
      carga: number | null
      reps: number | null
    }) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')
      await registrarExecucaoWeb(supabase, user.id, {
        item_treino_id: itemTreinoId,
        carga_utilizada: carga,
        repeticoes_feitas: reps,
      })
    },
    onSuccess: (_d, vars) => {
      setCampos((atual) => ({ ...atual, [vars.itemTreinoId]: { carga: '', reps: '' } }))
      void queryClient.invalidateQueries({ queryKey: ['registros-aluno'] })
    },
  })

  async function finalizarExecucao(registrosMap: Map<string, { carga: string; reps: string }[]>) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    for (const [itemId, lista] of registrosMap.entries()) {
      for (const reg of lista) {
        await registrarExecucaoWeb(supabase, user.id, {
          item_treino_id: itemId,
          carga_utilizada: reg.carga ? Number(reg.carga.replace(',', '.')) : null,
          repeticoes_feitas: reg.reps ? Number(reg.reps) : null,
        })
      }
    }

    setFichaEmExecucao(null)
    void queryClient.invalidateQueries({ queryKey: ['registros-aluno'] })
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Painel do Aluno</h1>
        <p className="text-muted-foreground text-sm">
          Sua ficha ativa e seu progresso — atualizado pelo seu personal.
        </p>
      </header>

      {fichaEmExecucao ? (
        <ModoExecucao
          exercicios={fichaEmExecucao.itens.map((item) => ({
            id: item.id,
            nome: item.exercicio.nome,
            grupo_muscular: item.exercicio.grupo_muscular,
            series: item.series,
            repeticoes: item.repeticoes,
            descanso_segundos: item.descanso_segundos,
            ordem: item.ordem,
          }))}
          onFinalizar={finalizarExecucao}
          onCancelar={() => setFichaEmExecucao(null)}
        />
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" /> Ficha ativa
            </h2>

        {fichas.isLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        ) : fichas.data?.length === 0 || !fichas.data ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Dumbbell className="text-muted-foreground h-10 w-10" />
              <p className="font-medium">Nenhuma ficha ativa no momento</p>
              <p className="text-muted-foreground max-w-md text-sm">
                Seu personal ainda não montou sua ficha. Aguarde ou entre em
                contato com ele.
              </p>
            </CardContent>
          </Card>
        ) : (
          fichas.data.map((ficha) => (
            <Card key={ficha.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{ficha.titulo}</CardTitle>
                    <CardDescription>Ativa desde {formatarData(ficha.criado_em)}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setFichaEmExecucao(ficha)}
                  >
                    <Play className="mr-1 h-3.5 w-3.5" /> Iniciar Treino
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ficha.itens.map((item) => {
                  const campo = campos[item.id] ?? { carga: '', reps: '' }
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-medium">{item.exercicio.nome}</p>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {item.series} × {item.repeticoes} · descanso{' '}
                          {item.descanso_segundos}s
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          placeholder="Carga (kg)"
                          value={campo.carga}
                          onChange={(e) =>
                            setCampos((atual) => ({
                              ...atual,
                              [item.id]: { ...campo, carga: e.target.value },
                            }))
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          placeholder="Reps"
                          value={campo.reps}
                          onChange={(e) =>
                            setCampos((atual) => ({
                              ...atual,
                              [item.id]: { ...campo, reps: e.target.value },
                            }))
                          }
                        />
                        <Button
                          size="icon"
                          aria-label={`Registrar execução de ${item.exercicio.nome}`}
                          disabled={
                            registrar.isPending &&
                            registrar.variables?.itemTreinoId === item.id
                          }
                          onClick={() =>
                            registrar.mutate({
                              itemTreinoId: item.id,
                              carga: campo.carga
                                ? Number(campo.carga.replace(',', '.'))
                                : null,
                              reps: campo.reps ? Number(campo.reps) : null,
                            })
                          }
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {registrar.error ? (
                  <p className="text-destructive text-sm">{registrar.error.message}</p>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-primary" /> Meu histórico
        </h2>
        {registros.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : registros.data?.length === 0 || !registros.data ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum registro ainda. Registre sua primeira série na ficha acima!
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {registros.data.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{r.exercicio_nome}</span>
                  <span className="text-muted-foreground">
                    {[r.carga_utilizada != null ? `${r.carga_utilizada} kg` : null, r.repeticoes_feitas != null ? `${r.repeticoes_feitas} reps` : null]
                      .filter(Boolean)
                      .join(' · ') || '—'}{' '}
                    · {formatarData(r.data_registro)}
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
