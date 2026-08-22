'use client'

import { useMemo, useState } from 'react'
import { Library, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useCriarExercicio, useExercicios } from '@/hooks/use-exercicios'
import { EQUIPAMENTOS, GRUPOS_MUSCULARES } from '@shapeos/shared'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function ExerciciosPage() {
  return (
    <DashboardShell>
      <ExerciciosConteudo />
    </DashboardShell>
  )
}

function ExerciciosConteudo() {
  const { data: exercicios, isLoading } = useExercicios()
  const criar = useCriarExercicio()

  const [busca, setBusca] = useState('')
  const [grupoAtivo, setGrupoAtivo] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState<string>(GRUPOS_MUSCULARES[0])
  const [equipamento, setEquipamento] = useState<string>(EQUIPAMENTOS[0])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (exercicios ?? []).filter(
      (e) =>
        (grupoAtivo === 'Todos' || e.grupo_muscular === grupoAtivo) &&
        (!termo || e.nome.toLowerCase().includes(termo))
    )
  }, [exercicios, busca, grupoAtivo])

  async function salvar() {
    if (nome.trim().length < 2) return
    try {
      await criar.mutateAsync({
        nome: nome.trim(),
        grupo_muscular: grupo,
        equipamento,
      })
      setNome('')
      setModalAberto(false)
    } catch {
      void 0
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
          <p className="text-muted-foreground text-sm">
            {exercicios?.length ?? 0} exercícios · {filtrados.length} exibidos
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo exercício
        </Button>
      </header>

      <div className="space-y-3">
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {['Todos', ...GRUPOS_MUSCULARES].map((g) => (
            <button
              key={g}
              onClick={() => setGrupoAtivo(g)}
              className={
                grupoAtivo === g
                  ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground cursor-pointer'
                  : 'rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer'
              }
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Library className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum exercício encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.nome}</p>
                  <p className="text-muted-foreground text-xs">
                    {e.grupo_muscular}
                    {e.equipamento ? ` · ${e.equipamento}` : ''}
                    {e.proprio ? ' · seu' : ''}
                  </p>
                </div>
                {e.video_url ? (
                  <a
                    href={e.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary shrink-0 text-xs underline"
                  >
                    vídeo
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Novo Exercício">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-nome">Nome</Label>
            <Input
              id="ex-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Supino com pegada aberta"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ex-grupo">Grupo muscular</Label>
              <select
                id="ex-grupo"
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {GRUPOS_MUSCULARES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-equip">Equipamento</Label>
              <select
                id="ex-equip"
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {EQUIPAMENTOS.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {criar.error ? (
            <p className="text-destructive text-sm">{criar.error.message}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={criar.isPending}>
              {criar.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
