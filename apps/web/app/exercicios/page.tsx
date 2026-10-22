'use client'

import { useMemo, useState } from 'react'
import { Library, Plus, Search, Dumbbell, Weight, Bike, Footprints, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useCriarExercicio, useExercicios, useEditarExercicio, useExcluirExercicio } from '@/hooks/use-exercicios'
import { EQUIPAMENTOS, GRUPOS_MUSCULARES } from '@shapeos/shared'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import type { ExercicioBiblioteca } from '@/services/exercicios'
import { ExercisePreview, ExerciseThumbnail } from '@/components/fitness/exercise-demonstration'

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
  const { data: exercicios, isLoading, error, refetch } = useExercicios()
  const criar = useCriarExercicio()
  const editar = useEditarExercicio()
  const excluir = useExcluirExercicio()

  const [busca, setBusca] = useState('')
  const [grupoAtivo, setGrupoAtivo] = useState('Todos')
  
  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [exEditando, setExEditando] = useState<ExercicioBiblioteca | null>(null)
  
  const [nome, setNome] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
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

  function abrirCriacao() {
    setNome('')
    setMediaUrl('')
    setGrupo(GRUPOS_MUSCULARES[0])
    setEquipamento(EQUIPAMENTOS[0])
    setModalAberto(true)
  }

  function abrirEdicao(e: ExercicioBiblioteca) {
    setExEditando(e)
    setNome(e.nome)
    setMediaUrl(e.video_url ?? '')
    setGrupo(e.grupo_muscular)
    setEquipamento(e.equipamento ?? EQUIPAMENTOS[0])
    setModalEditarAberto(true)
  }

  async function salvar() {
    if (nome.trim().length < 2) return
    try {
      await criar.mutateAsync({ nome: nome.trim(), grupo_muscular: grupo, equipamento, video_url: mediaUrl })
      setModalAberto(false)
    } catch { void 0 }
  }

  async function salvarEdicao() {
    if (!exEditando || nome.trim().length < 2) return
    try {
      await editar.mutateAsync({
        id: exEditando.id,
        entrada: { nome: nome.trim(), grupo_muscular: grupo, equipamento, video_url: mediaUrl }
      })
      setModalEditarAberto(false)
    } catch { void 0 }
  }

  return (
    <PersonalWorkspace page="biblioteca">
      <PersonalPageHeader icon="biblioteca" title="Biblioteca de exercícios" description="Encontre demonstrações e organize seus exercícios." actions={<Button onClick={abrirCriacao}><Plus size={16} aria-hidden="true" />Novo exercício</Button>} />

      <div className="personal-toolbar">
        <div className="personal-search">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar exercício pelo nome"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="personal-filter-chips">
          {['Todos', ...GRUPOS_MUSCULARES].map((g) => (
            <button
              key={g}
              onClick={() => setGrupoAtivo(g)}
              className="personal-filter-chip"
              aria-pressed={grupoAtivo === g}
            >
              {g !== 'Todos' && GRUPO_ICONS[g]}
              {g}
            </button>
          ))}
        </div>
      </div>

      <p className="personal-results-note" aria-live="polite">{isLoading ? 'Carregando exercícios…' : `${filtrados.length} de ${exercicios?.length ?? 0} exercícios`}</p>
      {excluir.error && <p role="alert" className="text-destructive text-sm">{excluir.error.message}</p>}
      {error ? <div role="alert" className="personal-load-error"><p>Não foi possível carregar os exercícios.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : isLoading ? (
        <div className="personal-exercise-grid">
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
            <p className="font-medium">Nenhum exercício encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Tente outro termo ou crie um novo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="personal-exercise-grid">
          {filtrados.map((e) => (
            <Card key={e.id} className="personal-exercise-card">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <ExerciseThumbnail name={e.nome} exerciseId={e.id} videoUrl={e.video_url} />
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <p className="personal-exercise-name">{e.nome}</p>
                    <p className="personal-exercise-meta">
                      {e.grupo_muscular}
                      {e.equipamento ? ` · ${e.equipamento}` : ''}
                      {e.proprio ? ' · seu' : ''}
                    </p>
                    <ExercisePreview name={e.nome} exerciseId={e.id} videoUrl={e.video_url}/>
                  </div>
                </div>
                
                {e.proprio ? (
                  <div className="personal-exercise-actions">
                    <button
                      onClick={() => abrirEdicao(e)}
                      className="personal-command"
                      aria-label={`Editar ${e.nome}`} data-shapeos-tooltip="Editar exercício"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Excluir "${e.nome}" permanentemente?`)) excluir.mutate(e.id)
                      }}
                      className="personal-command personal-danger"
                      aria-label={`Excluir ${e.nome}`} data-shapeos-tooltip="Excluir exercício"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  e.video_url ? (
                    <a
                      href={e.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary shrink-0 text-xs font-medium hover:underline"
                    >
                      vídeo
                    </a>
                  ) : null
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar */}
      <Modal personal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Novo Exercício">
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
          <div className="space-y-1.5">
            <Label htmlFor="ex-media">GIF ou vídeo de demonstração (opcional)</Label>
            <Input id="ex-media" type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://.../exercicio.gif" />
            <p className="text-sm text-muted-foreground">Link direto de GIF, WebP, MP4 ou WebM. Aparece também no treino do aluno.</p>
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

      {/* Modal Editar */}
      <Modal personal open={modalEditarAberto} onClose={() => setModalEditarAberto(false)} titulo="Editar Exercício">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input id="edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-grupo" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Grupo muscular</Label>
              <select id="edit-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                {GRUPOS_MUSCULARES.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-equip" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Equipamento</Label>
              <select id="edit-equip" value={equipamento} onChange={(e) => setEquipamento(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                {EQUIPAMENTOS.map((eq) => (<option key={eq} value={eq}>{eq}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-media">GIF ou vídeo de demonstração (opcional)</Label>
            <Input id="edit-media" type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://.../exercicio.gif" />
            <p className="text-sm text-muted-foreground">Link direto de GIF, WebP, MP4 ou WebM. Aparece também no treino do aluno.</p>
          </div>
          {editar.error ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-destructive text-sm">{editar.error.message}</p>
            </div>
          ) : null}
          {excluir.error ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-destructive text-sm">{excluir.error.message}</p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setModalEditarAberto(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={editar.isPending} className="rounded-xl shadow-sm">
              {editar.isPending ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </Modal>
    </PersonalWorkspace>
  )
}


