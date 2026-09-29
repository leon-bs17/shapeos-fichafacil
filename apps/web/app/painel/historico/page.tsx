'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Dumbbell, History, Loader2, Repeat2, Weight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Registro = {
  id: string
  carga_utilizada: number | string | null
  repeticoes_feitas: number | null
  data_registro: string
  item_treino: {
    id: string
    treino_id: string
    exercicio_id: string
    treino: { id: string; titulo: string } | null
    exercicio: { id: string; nome: string; grupo_muscular: string } | null
  } | null
}

type Sessao = {
  chave: string
  titulo: string
  data: Date
  series: number
  exercicios: number
  volume: number
  registros: Registro[]
}

function chaveData(data: Date) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarData(data: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(data)
}

export default function HistoricoAlunoPage() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)

      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        if (ativo) {
          setErro('Sua sessão expirou. Entre novamente para consultar o histórico.')
          setCarregando(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('registro_execucao')
        .select(`
          id,
          carga_utilizada,
          repeticoes_feitas,
          data_registro,
          item_treino:itens_treino (
            id,
            treino_id,
            exercicio_id,
            treino:treinos ( id, titulo ),
            exercicio:exercicios ( id, nome, grupo_muscular )
          )
        `)
        .eq('aluno_id', authData.user.id)
        .order('data_registro', { ascending: false })
        .limit(300)

      if (!ativo) return

      if (error) {
        setErro('Não foi possível carregar seu histórico agora.')
      } else {
        setRegistros((data ?? []) as unknown as Registro[])
      }

      setCarregando(false)
    }

    void carregar()
    return () => {
      ativo = false
    }
  }, [])

  const sessoes = useMemo<Sessao[]>(() => {
    const mapa = new Map<string, Sessao>()

    for (const registro of registros) {
      const data = new Date(registro.data_registro)
      const treinoId = registro.item_treino?.treino?.id ?? registro.item_treino?.treino_id ?? 'treino'
      const chave = `${chaveData(data)}:${treinoId}`
      const carga = Number(registro.carga_utilizada ?? 0)
      const reps = Number(registro.repeticoes_feitas ?? 0)
      const atual = mapa.get(chave)

      if (!atual) {
        mapa.set(chave, {
          chave,
          titulo: registro.item_treino?.treino?.titulo ?? 'Treino realizado',
          data,
          series: 1,
          exercicios: 1,
          volume: carga * reps,
          registros: [registro],
        })
        continue
      }

      atual.series += 1
      atual.volume += carga * reps
      atual.registros.push(registro)
      atual.data = data > atual.data ? data : atual.data
      atual.exercicios = new Set(
        atual.registros.map((item) => item.item_treino?.exercicio_id ?? item.item_treino?.id ?? item.id)
      ).size
    }

    return [...mapa.values()].sort((a, b) => b.data.getTime() - a.data.getTime())
  }, [registros])

  const volumeTotal = useMemo(
    () => Math.round(sessoes.reduce((total, sessao) => total + sessao.volume, 0) * 10) / 10,
    [sessoes]
  )
  const seriesTotal = useMemo(
    () => sessoes.reduce((total, sessao) => total + sessao.series, 0),
    [sessoes]
  )

  return (
    <div className="space-y-8 pb-16">
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <History className="h-4 w-4" />
          Evolução
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Histórico de treinos</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Consulte as sessões já registradas, cargas utilizadas, repetições e o volume acumulado.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <ResumoCard icone={CalendarDays} valor={sessoes.length} rotulo="sessões registradas" />
        <ResumoCard icone={Repeat2} valor={seriesTotal} rotulo="séries registradas" />
        <ResumoCard icone={Weight} valor={`${volumeTotal.toLocaleString('pt-BR')} kg`} rotulo="volume total" />
      </section>

      {carregando ? (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-border/40 bg-card/50">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Carregando histórico...
          </div>
        </div>
      ) : erro ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {erro}
        </div>
      ) : sessoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-14 text-center">
          <Dumbbell className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Seu histórico aparecerá aqui</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Quando você registrar séries em um treino, os dados sincronizados serão organizados automaticamente por sessão.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {sessoes.map((sessao) => {
            const exercicios = new Map<string, { nome: string; grupo: string; series: number; volume: number }>()

            for (const registro of sessao.registros) {
              const chave = registro.item_treino?.exercicio_id ?? registro.item_treino?.id ?? registro.id
              const carga = Number(registro.carga_utilizada ?? 0)
              const reps = Number(registro.repeticoes_feitas ?? 0)
              const existente = exercicios.get(chave)
              if (existente) {
                existente.series += 1
                existente.volume += carga * reps
              } else {
                exercicios.set(chave, {
                  nome: registro.item_treino?.exercicio?.nome ?? 'Exercício',
                  grupo: registro.item_treino?.exercicio?.grupo_muscular ?? 'Treino',
                  series: 1,
                  volume: carga * reps,
                })
              }
            }

            return (
              <article key={sessao.chave} className="overflow-hidden rounded-2xl border border-border/40 bg-card/70 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border/30 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {formatarData(sessao.data)}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">{sessao.titulo}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5">{sessao.exercicios} exercícios</span>
                    <span className="rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5">{sessao.series} séries</span>
                    <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 font-semibold text-primary">
                      {Math.round(sessao.volume * 10) / 10} kg
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border/25">
                  {[...exercicios.entries()].map(([id, item]) => (
                    <div key={id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.nome}</p>
                        <p className="text-xs capitalize text-muted-foreground">{item.grupo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{item.series} série(s)</p>
                        <p className="text-xs text-muted-foreground">{Math.round(item.volume * 10) / 10} kg volume</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

function ResumoCard({
  icone: Icone,
  valor,
  rotulo,
}: {
  icone: typeof CalendarDays
  valor: string | number
  rotulo: string
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/70 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icone className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{rotulo}</p>
    </div>
  )
}
