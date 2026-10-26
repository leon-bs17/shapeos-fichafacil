'use client'

import { Suspense, useState } from 'react'
import { workoutStatusFilter } from '@/lib/fitness/list-filters'
import { useRouter, useSearchParams } from 'next/navigation'
import { calendarDaysUntil, workoutDeadline } from '@/lib/fitness/deadlines'
import { resolveLinkedStudent } from '@/lib/fitness/personal-attention'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Copy, Dumbbell, Pause, Play, Plus, Pencil, Trash2, FileCheck2, BookOpen, FileText, Users, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PersonalBannerWireframe } from '@/components/layout/personal-banner-wireframe'
import { ShapeosBanner } from '@/components/layout/shapeos-banner'
import { WorkoutSelect } from '@/components/fitness/workout-select'
import { AgendaDatePicker } from '@/components/fitness/agenda-date-picker'
import styles from './page.module.css'
import { PersonalSearch } from '@/components/ui/personal-search'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { LinhaItemArrastavel } from '@/components/ui/linha-item-arrastavel'
import { useAcoesFichas, useFichas } from '@/hooks/use-fichas'
import { useAlunos } from '@/hooks/use-alunos'
import { useExercicios } from '@/hooks/use-exercicios'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { formatarData } from '@/lib/utils'
import { TEMPLATES, TIPOS_TREINO, aplicarTipoTreino, type TemplateFicha, type TipoTreino } from '@/lib/templates'
import { ApplyWorkoutModel, SaveWorkoutModel, WorkoutModelsLibrary } from '@/components/fitness/workout-models'
import type { WorkoutModel } from '@/services/workout-models'
import { DuplicateWorkout, type WorkoutReviewMode } from '@/components/fitness/duplicate-workout'
import { PrescriptionEditor } from '@/components/fitness/prescription-editor'
import type { FichaResumo } from '@/services/treinos'
import { filterWorkouts, exportWorkouts, type WorkoutStatus } from '@/lib/fitness/workout-tools'

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
  return (
    <DashboardShell>
      <Suspense fallback={<p role="status">Carregando fichas…</p>}><TreinosConteudo /></Suspense>
    </DashboardShell>
  )
}

function TreinosConteudo() {
  const { data: fichas, isLoading, error, refetch } = useFichas()
  const acoes = useAcoesFichas()
  const students = useAlunos()
  const params = useSearchParams()
  const router = useRouter()
  const selectedStudentId = resolveLinkedStudent(params.get('aluno'), students.data ?? [])
  const selectedStudent = students.data?.find(student => student.aluno_id === selectedStudentId)
  const [modalAberto, setModalAberto] = useState(false)
  const [prescricao, setPrescricao] = useState<FichaResumo | null>(null)
  const [fichaEditando, setFichaEditando] = useState<FichaResumo | null>(null)
  const [fichaDuplicando, setFichaDuplicando] = useState<FichaResumo | null>(null)
  const [fichaExcluindo, setFichaExcluindo] = useState<FichaResumo | null>(null)
  const [copyNotice, setCopyNotice] = useState<FichaResumo | null>(null)
  const [fichaParaModelo, setFichaParaModelo] = useState<FichaResumo | null>(null)
  const [modelosAbertos, setModelosAbertos] = useState(false)
  const [modeloAplicando, setModeloAplicando] = useState<WorkoutModel | null>(null)
  const [modeloSalvo, setModeloSalvo] = useState<WorkoutModel | null>(null)
  const [templateSelecionado, setTemplateSelecionado] = useState<TemplateFicha | null>(null)
  const [tipoTreino, setTipoTreino] = useState<TipoTreino>('hipertrofia')
  const [busca,setBusca]=useState('')
  const status = workoutStatusFilter(params.get('status'))
  function setStatus(next: WorkoutStatus) {
    const query = new URLSearchParams(params.toString())
    if (next === 'TODAS') query.delete('status'); else query.set('status', next)
    router.replace('/treinos' + (query.size ? '?' + query.toString() : ''), { scroll: false })
  }
  const [exportMessage,setExportMessage]=useState('')
  const studentWorkouts = selectedStudentId ? (fichas ?? []).filter(ficha => ficha.aluno_id === selectedStudentId) : fichas ?? []
  const filtradas=filterWorkouts(studentWorkouts,busca,status)
  const actionError=acoes.alternar.error??acoes.excluir.error
  const metrics = [
    { label: 'Fichas cadastradas', value: studentWorkouts.length, icon: FileText },
    { label: 'Fichas ativas', value: studentWorkouts.filter(ficha => ficha.ativo).length, icon: Play },
    { label: 'Alunos com ficha', value: new Set(studentWorkouts.map(ficha => ficha.aluno_id)).size, icon: Users },
  ]
  function reviewCopy(copy: FichaResumo, mode: WorkoutReviewMode) {
    setFichaDuplicando(null); setModeloAplicando(null)
    if (mode === 'exercicios') setFichaEditando(copy); else setPrescricao(copy)
  }
  function notifyCopy(copy: FichaResumo) { setCopyNotice(copy); setModeloSalvo(null) }
  function exportar(){
    try{
      const blob=new Blob([exportWorkouts(filtradas)],{type:'application/json'})
      const url=URL.createObjectURL(blob),link=document.createElement('a')
      link.href=url;link.download=`shapeos-fichas-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
      setExportMessage(`${filtradas.length} ficha(s) preparada(s) para download.`)
    }catch{setExportMessage('Não foi possível preparar o arquivo. Tente novamente.')}
  }

  if (params.get('aluno') && students.isPending) return <PersonalWorkspace page="treinos"><PersonalPageHeader icon="treinos" title="Treinos" description="Organize fichas e acompanhe a prescrição de cada aluno." /><p role="status">Carregando aluno…</p></PersonalWorkspace>
  if (params.get('aluno') && students.error) return <PersonalWorkspace page="treinos"><PersonalPageHeader icon="treinos" title="Treinos" description="Organize fichas e acompanhe a prescrição de cada aluno." /><div className="personal-load-error" role="alert"><p>Não foi possível verificar o aluno.</p><Button variant="outline" onClick={() => void students.refetch()}>Tentar novamente</Button></div></PersonalWorkspace>

  return (
    <PersonalWorkspace page="treinos">
      <PersonalPageHeader icon="treinos" title="Treinos" description="Organize fichas e acompanhe a prescrição de cada aluno." actions={<><Button variant="outline" onClick={() => setModelosAbertos(true)}><BookOpen size={16} aria-hidden="true" />Meus modelos</Button><Button onClick={() => setModalAberto(true)}><Plus size={16} aria-hidden="true" />Nova ficha</Button></>} />

      <div className={styles.page}>
      <ShapeosBanner titleId="personal-workouts-banner" eyebrow="Treinos do Personal" title={<>Prescreva com <span>clareza</span> e organização</>} description="Organize suas fichas e acompanhe a prescrição de cada aluno."
        art={<PersonalBannerWireframe variant="workouts"/>} />
      <dl className={styles.metrics} aria-label="Resumo das fichas" aria-busy={isLoading}>{metrics.map(({label,value,icon:Icon}) => <div key={label}><span className={styles.metricIcon}><Icon aria-hidden="true" /></span><div><dt>{label}</dt><dd>{isLoading || error ? '—' : value}</dd></div></div>)}</dl>
      {params.get('aluno') && !selectedStudent && <p role="status" className="personal-results-note">Aluno indisponível neste vínculo. Exibindo suas fichas.</p>}
      {selectedStudent && <div className="personal-toolbar"><p className="personal-results-note">Fichas de <strong>{selectedStudent.nome}</strong></p><Button variant="outline" onClick={() => router.replace('/treinos', { scroll: false })}>Ver todos os alunos</Button></div>}
      <div className={styles.toolbar}>
        <div className={styles.searchField}><Label htmlFor="buscar-fichas">Buscar fichas</Label><PersonalSearch id="buscar-fichas" placeholder="Título da ficha ou nome do aluno" value={busca} onChange={e=>setBusca(e.target.value)} /></div>
        <div className={styles.filterField}><Label htmlFor="status-fichas">Status</Label><WorkoutSelect id="status-fichas" label="Status das fichas" value={status} onChange={value=>setStatus(value as WorkoutStatus)} options={[{value:'TODAS',label:'Todas'},{value:'ATIVAS',label:'Ativas'},{value:'PAUSADAS',label:'Pausadas'}]} /></div>
        <Button variant="outline" className={styles.exportButton} disabled={isLoading||Boolean(error)||!filtradas.length} onClick={exportar}><FileCheck2 size={16} aria-hidden="true"/>Exportar JSON</Button>
      </div>
      {modeloSalvo && <div className="personal-toolbar" role="status"><p className="personal-results-note">Modelo <strong>{modeloSalvo.titulo}</strong> salvo na sua biblioteca.</p><Button variant="outline" onClick={() => setModelosAbertos(true)}>Meus modelos</Button><Button variant="outline" onClick={() => setModeloSalvo(null)}>Dispensar</Button></div>}
      {copyNotice && <div className="personal-toolbar" role="status"><p className="personal-results-note">Cópia de <strong>{copyNotice.titulo}</strong> criada para <strong>{copyNotice.aluno_nome}</strong> em modo pausado.</p><Button variant="outline" onClick={() => { setBusca(''); setStatus('TODAS'); router.replace(`/treinos?${new URLSearchParams({ aluno: copyNotice.aluno_id })}`, { scroll: false }) }}>Ver fichas do aluno</Button><Button variant="outline" onClick={() => setCopyNotice(null)}>Dispensar</Button></div>}
      {exportMessage && <p role="status" className="text-sm text-muted-foreground">{exportMessage}</p>}
      {actionError && <p role="alert" className="text-sm text-destructive">{actionError.message}</p>}
      {error ? <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm"><p>{error.message}</p><Button variant="outline" className="mt-3" onClick={()=>void refetch()}>Tentar novamente</Button></div> :
      isLoading ? (
        <div className={`personal-workout-grid ${styles.grid}`}>
          {[0, 1].map((i) => (
            <div key={i} className="h-48 skeleton" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <p className="font-semibold text-lg">{selectedStudent && !studentWorkouts.length ? 'Este aluno ainda não tem ficha' : fichas?.length ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha criada'}</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              {selectedStudent && !studentWorkouts.length ? 'Clique em Nova ficha para montar o treino do aluno selecionado.' : fichas?.length ? 'Ajuste a busca ou o filtro de status para encontrar suas fichas.' : 'Clique em Nova Ficha para montar o treino de um aluno em segundos.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`personal-workout-grid ${styles.grid}`}>
          {filtradas.map((ficha) => (
            <Card key={ficha.id} className={`personal-workout-card ${styles.card}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base">{ficha.titulo}</h3>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {ficha.aluno_nome} · {formatarData(ficha.criado_em)}
                    </p>
                  </div>
                  <span className={styles.status} data-active={ficha.ativo}>{ficha.ativo ? <CheckCircle2 size={12} aria-hidden="true" /> : <span className={styles.statusDot} aria-hidden="true" />}{ficha.ativo ? 'Ativa' : 'Pausada'}</span>
                </div>

                <WorkoutValidity date={ficha.valida_ate} active={ficha.ativo} />
                <div className="personal-workout-items">
                  {ficha.itens.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate text-muted-foreground">{item.exercicio.nome}</span>
                      <span className="text-xs font-mono text-muted-foreground/70 shrink-0 ml-2">
                        {item.series}x{item.repeticoes}
                      </span>
                    </div>
                  ))}
                  {ficha.itens.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{ficha.itens.length - 4} exercicios</p>
                  )}
                  {ficha.itens.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Sem exercicios</p>
                  )}
                </div>

                <div className={`personal-workout-actions ${styles.cardActions}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPrescricao(ficha)}>Prescrição avançada</Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!ficha.itens.length} onClick={() => setFichaParaModelo(ficha)}><BookOpen size={13} aria-hidden="true" />Salvar modelo</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setFichaDuplicando(ficha)}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setFichaEditando(ficha)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
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
                        <Pause className="mr-1 h-3 w-3" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3 w-3" /> Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="personal-danger ml-auto h-8 w-8 p-0"
                    aria-label={`Excluir ficha ${ficha.titulo}`}
                    disabled={acoes.excluir.isPending}
                    onClick={() => setFichaExcluindo(ficha)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal personal open={!!fichaExcluindo} onClose={() => { if (!acoes.excluir.isPending) setFichaExcluindo(null) }} titulo="Excluir ficha">
        {fichaExcluindo && <div className="space-y-3"><p>Excluir a ficha “{fichaExcluindo.titulo}”?</p>
          {acoes.excluir.error && <p role="alert" className="text-destructive">{acoes.excluir.error.message}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" disabled={acoes.excluir.isPending} onClick={() => setFichaExcluindo(null)}>Cancelar</Button>
            <Button variant="outline" className="personal-danger" disabled={acoes.excluir.isPending} onClick={() => acoes.excluir.mutate(fichaExcluindo.id, { onSuccess: () => setFichaExcluindo(null) })}><Trash2 size={14} aria-hidden="true" />{acoes.excluir.isPending ? 'Excluindo…' : 'Excluir ficha'}</Button>
          </div>
        </div>}
      </Modal>
      {fichaParaModelo && <SaveWorkoutModel key={fichaParaModelo.id} ficha={fichaParaModelo} onClose={() => setFichaParaModelo(null)} onSaved={model => { setModeloSalvo(model); setCopyNotice(null) }} />}
      {modelosAbertos && <WorkoutModelsLibrary onClose={() => setModelosAbertos(false)} onUse={model => { setModelosAbertos(false); setModeloAplicando(model) }} />}
      {modeloAplicando && <ApplyWorkoutModel key={modeloAplicando.id} model={modeloAplicando} initialStudentId={selectedStudentId} onClose={() => setModeloAplicando(null)} onCreated={notifyCopy} onReview={reviewCopy} />}
      {fichaDuplicando && <DuplicateWorkout key={fichaDuplicando.id} ficha={fichaDuplicando} onClose={() => setFichaDuplicando(null)} onCreated={notifyCopy} onReview={reviewCopy} />}
      {prescricao && <PrescriptionEditor personal ficha={prescricao} onClose={() => setPrescricao(null)} />}
      <ModalNovaFicha
        key={selectedStudentId}
        initialAlunoId={selectedStudentId}
        open={modalAberto}
        onClose={() => { setModalAberto(false); setTemplateSelecionado(null); setTipoTreino('hipertrofia') }}
        erro={acoes.criar.error?.message ?? null}
        ocupado={acoes.criar.isPending}
        template={templateSelecionado}
        onSelecionarTemplate={setTemplateSelecionado}
        tipoTreino={tipoTreino}
        onSelecionarTipo={setTipoTreino}
      />

      {fichaEditando ? (
        <ModalEditarFicha
          ficha={fichaEditando}
          open={!!fichaEditando}
          onClose={() => setFichaEditando(null)}
          erro={acoes.editar.error?.message ?? null}
          ocupado={acoes.editar.isPending}
        />
      ) : null}
      </div>
    </PersonalWorkspace>
  )
}

function ModalNovaFicha({
  initialAlunoId = '',
  open,
  onClose,
  erro,
  ocupado,
  template,
  onSelecionarTemplate,
  tipoTreino,
  onSelecionarTipo,
}: {
  initialAlunoId?: string
  open: boolean
  onClose: () => void
  erro: string | null
  ocupado: boolean
  template: TemplateFicha | null
  onSelecionarTemplate: (t: TemplateFicha | null) => void
  tipoTreino: TipoTreino
  onSelecionarTipo: (t: TipoTreino) => void
}) {
  const { data: alunos } = useAlunos()
  const { data: exercicios } = useExercicios()
  const { criar } = useAcoesFichas()

  const [alunoId, setAlunoId] = useState(initialAlunoId)
  const [titulo, setTitulo] = useState(template?.titulo ?? '')
  const [validade, setValidade] = useState('')
  const [itens, setItens] = useState<LinhaItem[]>([{ ...ITEM_VAZIO }])
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [editorAberto, setEditorAberto] = useState(false)

  function aplicarTemplate(t: TemplateFicha | null) {
    setEditorAberto(true)
    onSelecionarTemplate(t)
    if (t && exercicios) {
      setTitulo(t.titulo)
      const comTipo = aplicarTipoTreino(t.exercicios, tipoTreino)
      setItens(
        comTipo.map((ex) => {
          const encontrado = exercicios.find((e) => e.nome === ex.nome)
          return {
            exercicio_id: encontrado?.id ?? '',
            series: String(ex.series),
            repeticoes: ex.repeticoes,
            descanso_segundos: String(ex.descanso_segundos),
          }
        })
      )
    } else {
      setTitulo('')
      setItens([{ ...ITEM_VAZIO }])
    }
  }

  function atualizarItem(indice: number, campo: keyof LinhaItem, valor: string) {
    setItens((atual) =>
      atual.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item))
    )
  }

  async function salvar() {
    setErroLocal(null)
    if (!alunoId) { setErroLocal('Escolha o aluno da ficha.'); return }
    if (validade && calendarDaysUntil(validade) == null) { setErroLocal('Informe uma data de validade válida.'); return }
    if (titulo.trim().length < 3) { setErroLocal('De um titulo com pelo menos 3 letras.'); return }
    const itensValidos = itens.filter((i) => i.exercicio_id && Number(i.series) > 0 && i.repeticoes.trim())
    if (itensValidos.length === 0) { setErroLocal('Adicione ao menos um exercicio completo.'); return }
    try {
      await criar.mutateAsync({
        ficha: {
          aluno_id: alunoId,
          titulo: titulo.trim(),
          valida_ate: validade || null,
          itens: itensValidos.map((i, indice) => ({
            exercicio_id: i.exercicio_id,
            series: Number(i.series),
            repeticoes: i.repeticoes.trim(),
            descanso_segundos: Number(i.descanso_segundos) || 60,
            ordem: indice,
          })),
        },
      })
      setTitulo(''); setValidade(''); setAlunoId(initialAlunoId); setItens([{ ...ITEM_VAZIO }]); onSelecionarTemplate(null); onClose()
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao salvar ficha')
    }
  }

  const grupos = new Map<string, typeof exercicios>()
  exercicios?.forEach((e) => { const l = grupos.get(e.grupo_muscular) ?? []; l.push(e); grupos.set(e.grupo_muscular, l) })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItens((atual) => {
      const oldIdx = atual.findIndex((_, i) => `item-${i}` === active.id)
      const newIdx = atual.findIndex((_, i) => `item-${i}` === over.id)
      return arrayMove(atual, oldIdx, newIdx)
    })
  }

  return (
    <Modal personal open={open} onClose={onClose} titulo="Nova Ficha de Treino" className="max-w-2xl">
      <div className="space-y-5">
        {!template && !editorAberto ? (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo de Treino</Label>
              <div className="personal-template-grid grid grid-cols-3 gap-2">
                {TIPOS_TREINO.map((tipo) => (
                  <button
                    key={tipo.id}
                    aria-pressed={tipoTreino === tipo.id}
                    onClick={() => onSelecionarTipo(tipo.id)}
                    className={`personal-template-button flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center text-sm transition-all duration-200 ${
                      tipoTreino === tipo.id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:border-border/80 hover:bg-accent/50'
                    }`}
                  >
                    <span className="text-2xl">{tipo.icone}</span>
                    <span className="font-semibold">{tipo.titulo}</span>
                    <span className="text-muted-foreground text-xs leading-tight">{tipo.descricao}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Template</Label>
              <p className="text-muted-foreground text-xs">Escolha a estrutura do treino ou comeca do zero.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => aplicarTemplate(null)}
                  className="personal-template-button flex flex-col items-start gap-1 rounded-xl border-2 border-dashed border-border p-4 text-left text-sm transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="font-semibold">Em branco</span>
                  <span className="text-muted-foreground text-xs">Monte do zero</span>
                </button>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => aplicarTemplate(t)}
                    className="personal-template-button flex flex-col items-start gap-1 rounded-xl border-2 border-border p-4 text-left text-sm transition-all hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="font-semibold">{t.titulo}</span>
                    <span className="text-muted-foreground text-xs">{t.descricao}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ficha-aluno" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aluno</Label>
                <WorkoutSelect id="ficha-aluno" label="Aluno da ficha" value={alunoId} onChange={setAlunoId} options={[{value:'',label:'Selecione...'},...(alunos ?? []).map(aluno=>({value:aluno.aluno_id,label:aluno.nome}))]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ficha-titulo" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Titulo</Label>
                <Input id="ficha-titulo" placeholder="Ex.: Push A - Peito e Triceps" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ficha-validade">Válida até (opcional)</Label>
              <AgendaDatePicker id="ficha-validade" label="Validade da ficha" value={validade} onChange={setValidade} allowClear describedBy="ficha-validade-hint" />
              <p id="ficha-validade-hint" className="text-xs text-muted-foreground">Deixe em branco para manter a ficha sem prazo. O aviso aparece sete dias antes do vencimento.</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Exercicios</Label>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditorAberto(false); onSelecionarTemplate(null) }}>
                  Trocar template
                </Button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itens.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {itens.map((item, indice) => (
                      <LinhaItemArrastavel
                        key={`item-${indice}`}
                        id={`item-${indice}`}
                        indice={indice}
                        item={item}
                        grupos={grupos}
                        totalItens={itens.length}
                        onAtualizar={atualizarItem}
                        onRemover={(i) => setItens((atual) => atual.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setItens((atual) => [...atual, { ...ITEM_VAZIO }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar exercicio
              </Button>
            </div>

            {erroLocal || erro ? (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive">{erroLocal ?? erro}</p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
              <Button onClick={salvar} disabled={ocupado} className="rounded-xl shadow-sm">
                {ocupado ? 'Salvando...' : 'Criar Ficha'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function ModalEditarFicha({
  ficha, open, onClose, erro, ocupado,
}: {
  ficha: FichaResumo; open: boolean; onClose: () => void; erro: string | null; ocupado: boolean
}) {
  const { data: exercicios } = useExercicios()
  const { editar } = useAcoesFichas()
  const [titulo, setTitulo] = useState(ficha.titulo)
  const [validade, setValidade] = useState(ficha.valida_ate ?? '')
  const [itens, setItens] = useState<LinhaItem[]>(
    ficha.itens.length > 0 ? ficha.itens.map((item) => ({
      exercicio_id: item.exercicio.id, series: String(item.series), repeticoes: item.repeticoes, descanso_segundos: String(item.descanso_segundos),
    })) : [{ ...ITEM_VAZIO }]
  )
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  function atualizarItem(indice: number, campo: keyof LinhaItem, valor: string) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)))
  }

  async function salvar() {
    setErroLocal(null)
    if (validade && calendarDaysUntil(validade) == null) { setErroLocal('Informe uma data de validade válida.'); return }
    if (titulo.trim().length < 3) { setErroLocal('De um titulo com pelo menos 3 letras.'); return }
    const itensValidos = itens.filter((i) => i.exercicio_id && Number(i.series) > 0 && i.repeticoes.trim())
    if (itensValidos.length === 0) { setErroLocal('Adicione ao menos um exercicio completo.'); return }
    try {
      await editar.mutateAsync({
        fichaId: ficha.id,
        ficha: { titulo: titulo.trim(), valida_ate: validade || null, itens: itensValidos.map((i, indice) => ({
          exercicio_id: i.exercicio_id, series: Number(i.series), repeticoes: i.repeticoes.trim(), descanso_segundos: Number(i.descanso_segundos) || 60, ordem: indice,
        })) },
      })
      onClose()
    } catch (e) { setErroLocal(e instanceof Error ? e.message : 'Erro ao salvar alteracoes') }
  }

  const grupos = new Map<string, typeof exercicios>()
  exercicios?.forEach((e) => { const l = grupos.get(e.grupo_muscular) ?? []; l.push(e); grupos.set(e.grupo_muscular, l) })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event; if (!over || active.id === over.id) return
    setItens((atual) => { const old = atual.findIndex((_, i) => `item-${i}` === active.id); const nw = atual.findIndex((_, i) => `item-${i}` === over.id); return arrayMove(atual, old, nw) })
  }

  return (
    <Modal personal open={open} onClose={onClose} titulo="Editar Ficha de Treino" className="max-w-2xl">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aluno</Label>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">{ficha.aluno_nome}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editar-titulo" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Titulo</Label>
          <Input id="editar-titulo" placeholder="Ex.: Push A - Peito e Triceps" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editar-validade">Válida até (opcional)</Label>
          <AgendaDatePicker id="editar-validade" label="Validade da ficha" value={validade} onChange={setValidade} allowClear describedBy="editar-validade-hint" />
          <p id="editar-validade-hint" className="text-xs text-muted-foreground">Apague a data para retirar o prazo. O aviso aparece sete dias antes do vencimento.</p>
        </div>
        <div className="space-y-2.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Exercicios</Label>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itens.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {itens.map((item, indice) => (
                  <LinhaItemArrastavel key={`item-${indice}`} id={`item-${indice}`} indice={indice} item={item} grupos={grupos} totalItens={itens.length} onAtualizar={atualizarItem} onRemover={(i) => setItens((atual) => atual.filter((_, idx) => idx !== i))} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setItens((atual) => [...atual, { ...ITEM_VAZIO }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar exercicio
          </Button>
        </div>
        {erroLocal || erro ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{erroLocal ?? erro}</p>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button onClick={salvar} disabled={ocupado} className="rounded-xl shadow-sm">{ocupado ? 'Salvando...' : 'Salvar Alteracoes'}</Button>
        </div>
      </div>
    </Modal>
  )
}




function WorkoutValidity({ date, active }: { date?: string | null; active: boolean }) {
  const deadline = workoutDeadline(date)
  return <p className="text-xs" style={{ color: active && deadline && deadline.days < 0 ? 'var(--p-danger)' : 'var(--p-muted)', overflowWrap: 'anywhere' }}>{deadline?.label ?? 'Validade não definida'}</p>
}


