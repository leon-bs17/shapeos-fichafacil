'use client'

import { useState } from 'react'
import { Copy, Dumbbell, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useAcoesFichas, useFichas } from '@/hooks/use-fichas'
import { useAlunos } from '@/hooks/use-alunos'
import { useExercicios } from '@/hooks/use-exercicios'
import { formatarData } from '@/lib/utils'

interface LinhaItem {
  exercicio_id: string
  series: string
  repeticoes: string
  descanso_segundos: string
}

const ITEM_VAZIO: LinhaItem = {
  exercicio_id: '',
  series: '3',
  repeticoes: '10-12',
  descanso_segundos: '60',
}

export default function TreinosPage() {
  const { data: fichas, isLoading } = useFichas()
  const acoes = useAcoesFichas()
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Treinos</h1>
          <p className="text-muted-foreground text-sm">
            Monte fichas rapidamente e gerencie as ativas de cada aluno.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova Ficha
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : fichas?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Dumbbell className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma ficha criada</p>
            <p className="text-muted-foreground text-sm max-w-md">
              Clique em Nova Ficha para montar o treino de um aluno em segundos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fichas?.map((ficha) => (
            <Card key={ficha.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{ficha.titulo}</CardTitle>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {ficha.aluno_nome} · {formatarData(ficha.criado_em)}
                    </p>
                  </div>
                  <span
                    className={
                      ficha.ativo
                        ? 'rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
                        : 'rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                    }
                  >
                    {ficha.ativo ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm">
                  {ficha.itens.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="truncate">{item.exercicio.nome}</span>
                      <span className="text-muted-foreground shrink-0">
                        {item.series}×{item.repeticoes}
                      </span>
                    </li>
                  ))}
                  {ficha.itens.length === 0 ? (
                    <li className="text-muted-foreground">Sem exercícios</li>
                  ) : null}
                </ul>

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={acoes.duplicar.isPending}
                    onClick={() => acoes.duplicar.mutate(ficha.id)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={acoes.alternar.isPending}
                    onClick={() =>
                      acoes.alternar.mutate({
                        fichaId: ficha.id,
                        ativo: !ficha.ativo,
                      })
                    }
                  >
                    {ficha.ativo ? (
                      <>
                        <Pause className="mr-1 h-3.5 w-3.5" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3.5 w-3.5" /> Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto hover:text-destructive"
                    disabled={acoes.excluir.isPending}
                    onClick={() => {
                      if (window.confirm(`Excluir a ficha "${ficha.titulo}"?`)) {
                        acoes.excluir.mutate(ficha.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ModalNovaFicha
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        erro={acoes.criar.error?.message ?? null}
        ocupado={acoes.criar.isPending}
      />
    </div>
  )
}

function ModalNovaFicha({
  open,
  onClose,
  erro,
  ocupado,
}: {
  open: boolean
  onClose: () => void
  erro: string | null
  ocupado: boolean
}) {
  const { data: alunos } = useAlunos()
  const { data: exercicios } = useExercicios()
  const { criar } = useAcoesFichas()

  const [alunoId, setAlunoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [itens, setItens] = useState<LinhaItem[]>([{ ...ITEM_VAZIO }])
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  function atualizarItem(indice: number, campo: keyof LinhaItem, valor: string) {
    setItens((atual) =>
      atual.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item))
    )
  }

  async function salvar() {
    setErroLocal(null)

    if (!alunoId) {
      setErroLocal('Escolha o aluno da ficha.')
      return
    }
    if (titulo.trim().length < 3) {
      setErroLocal('Dê um título com pelo menos 3 letras.')
      return
    }

    const itensValidos = itens.filter(
      (i) => i.exercicio_id && Number(i.series) > 0 && i.repeticoes.trim()
    )
    if (itensValidos.length === 0) {
      setErroLocal('Adicione ao menos um exercício completo.')
      return
    }

    try {
      await criar.mutateAsync({
        ficha: {
          aluno_id: alunoId,
          titulo: titulo.trim(),
          itens: itensValidos.map((i, indice) => ({
            exercicio_id: i.exercicio_id,
            series: Number(i.series),
            repeticoes: i.repeticoes.trim(),
            descanso_segundos: Number(i.descanso_segundos) || 60,
            ordem: indice,
          })),
        },
      })

      setTitulo('')
      setAlunoId('')
      setItens([{ ...ITEM_VAZIO }])
      onClose()
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao salvar ficha')
    }
  }

  const grupos = new Map<string, typeof exercicios>()
  exercicios?.forEach((e) => {
    const lista = grupos.get(e.grupo_muscular) ?? []
    lista.push(e)
    grupos.set(e.grupo_muscular, lista)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      titulo="Nova Ficha de Treino"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ficha-aluno">Aluno</Label>
            <select
              id="ficha-aluno"
              value={alunoId}
              onChange={(e) => setAlunoId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              {alunos?.map((a) => (
                <option key={a.vinculo_id} value={a.aluno_id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ficha-titulo">Título</Label>
            <Input
              id="ficha-titulo"
              placeholder="Ex.: Push A - Peito e Tríceps"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Exercícios</Label>
          {itens.map((item, indice) => (
            <div key={indice} className="flex items-end gap-2">
              <select
                value={item.exercicio_id}
                onChange={(e) => atualizarItem(indice, 'exercicio_id', e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Exercício...</option>
                {[...grupos.entries()].map(([grupo, lista]) => (
                  <optgroup key={grupo} label={grupo}>
                    {(lista ?? []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Input
                className="w-16"
                type="number"
                min={1}
                max={30}
                aria-label={`Séries do exercício ${indice + 1}`}
                value={item.series}
                onChange={(e) => atualizarItem(indice, 'series', e.target.value)}
              />
              <Input
                className="w-20"
                placeholder="Reps"
                aria-label={`Repetições do exercício ${indice + 1}`}
                value={item.repeticoes}
                onChange={(e) => atualizarItem(indice, 'repeticoes', e.target.value)}
              />
              <Input
                className="w-20"
                type="number"
                min={0}
                max={900}
                aria-label={`Descanso do exercício ${indice + 1}`}
                value={item.descanso_segundos}
                onChange={(e) =>
                  atualizarItem(indice, 'descanso_segundos', e.target.value)
                }
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remover exercício ${indice + 1}`}
                onClick={() =>
                  setItens((atual) => atual.filter((_, i) => i !== indice))
                }
                disabled={itens.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setItens((atual) => [...atual, { ...ITEM_VAZIO }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar exercício
          </Button>
        </div>

        {erroLocal || erro ? (
          <p className="text-sm text-destructive">{erroLocal ?? erro}</p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={ocupado}>
            {ocupado ? 'Salvando...' : 'Criar Ficha'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
