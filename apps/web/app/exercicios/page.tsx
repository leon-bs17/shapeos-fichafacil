'use client'

import { useMemo, useState } from 'react'
import { Library, Plus, Search, Dumbbell, Weight, Bike, Footprints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useCriarExercicio, useExercicios } from '@/hooks/use-exercicios'
import { EQUIPAMENTOS, GRUPOS_MUSCULARES } from '@shapeos/shared'
import { DashboardShell } from '@/components/layout/dashboard-shell'

const GRUPO_ICONS: Record<string, React.ReactNode> = {
  Peito: <Dumbbell className="h-4 w-4" />,
  Costas: <Dumbbell className="h-4 w-4" />,
  Pernas: <Footprints className="h-4 w-4" />,
  Gluteos: <Footprints className="h-4 w-4" />,
  Ombros: <Weight className="h-4 w-4" />,
  Bracos: <Dumbbell className="h-4 w-4" />,
  Abdomen: <Dumbbell className="h-4 w-4" />,
  Panturrilha: <Footprints className="h-4 w-4" />,
  Cardio: <Bike className="h-4 w-4" />,
}

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
      await criar.mutateAsync({ nome: nome.trim(), grupo_muscular: grupo, equipamento })
      setNome(''); setModalAberto(false)
    } catch { void 0 }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
          <p className="text-muted-foreground text-sm">
            {exercicios?.length ?? 0} exercicios · {filtrados.length} exibidos
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" /> Novo exercicio
        </Button>
      </header>

      <div className="space-y-3 animate-fade-in stagger-1">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Todos', ...GRUPOS_MUSCULARES].map((g) => (
            <button
              key={g}
              onClick={() => setGrupoAtivo(g)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                grupoAtivo === g
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {g !== 'Todos' && GRUPO_ICONS[g]}
              {g}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Library className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Nenhum exercicio encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Tente outro termo ou crie um novo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((e, idx) => (
            <Card key={e.id} className={`animate-slide-up stagger-${Math.min(idx + 1, 6)} hover:shadow-md transition-all duration-200 group`}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                    {GRUPO_ICONS[e.grupo_muscular] ?? <Dumbbell className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{e.nome}</p>
                    <p className="text-muted-foreground text-xs truncate">
                      {e.grupo_muscular}
                      {e.equipamento ? ` · ${e.equipamento}` : ''}
                      {e.proprio ? ' · seu' : ''}
                    </p>
                  </div>
                </div>
                {e.video_url ? (
                  <a
                    href={e.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary shrink-0 text-xs font-medium hover:underline"
                  >
                    video
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Novo Exercicio">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-nome" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input id="ex-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Supino com pegada aberta" className="h-10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ex-grupo" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Grupo muscular</Label>
              <select id="ex-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                {GRUPOS_MUSCULARES.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-equip" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Equipamento</Label>
              <select id="ex-equip" value={equipamento} onChange={(e) => setEquipamento(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                {EQUIPAMENTOS.map((eq) => (<option key={eq} value={eq}>{eq}</option>))}
              </select>
            </div>
          </div>
          {criar.error ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-destructive text-sm">{criar.error.message}</p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={salvar} disabled={criar.isPending} className="rounded-xl shadow-sm">
              {criar.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
