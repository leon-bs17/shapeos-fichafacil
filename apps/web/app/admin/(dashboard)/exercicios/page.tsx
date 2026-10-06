'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, Search, Plus, Trash2, X, Loader2, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { validateExerciseUrl } from '@/lib/fitness/exercise-media'
import { ExercisePreview, ExerciseThumbnail } from '@/components/fitness/exercise-demonstration'

type Exercicio = { id: string; nome: string; grupo_muscular: string; equipamento: string | null; criado_por: string | null; video_url: string | null }

const GRUPOS_MUSCULAREIS = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps', 'Quadriceps',
  'Posterior', 'Gluteos', 'Panturrilha', 'Abdomen', 'Antebracos', 'Trapézio',
]

export default function AdminExerciciosPage() {
  return <ExerciciosConteudo />
}

function ExerciciosConteudo() {
  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaMedia, setNovaMedia] = useState('')
  const [editandoMedia, setEditandoMedia] = useState<Exercicio | null>(null)
  const [mediaUrl, setMediaUrl] = useState('')
  const [novoGrupo, setNovoGrupo] = useState('')
  const [novoEquipamento, setNovoEquipamento] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: exercicios, isLoading } = useQuery({
    queryKey: ['admin-exercicios'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('exercicios')
        .select('id, nome, grupo_muscular, equipamento, criado_por, video_url')
        .order('grupo_muscular')
        .order('nome')
      return (data ?? []) as Exercicio[]
    },
  })

  const criarExercicio = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('exercicios').insert({
        nome: novoNome.trim(),
        grupo_muscular: novoGrupo,
        equipamento: novoEquipamento.trim() || null,
        criado_por: user?.id ?? null,
        video_url: validateExerciseUrl(novaMedia),
      })
      if (error) {
        if (error.code === '23505') throw new Error('Exercício já existe nesse grupo muscular.')
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] })
      setModalAberto(false); setNovoNome(''); setNovoGrupo(''); setNovoEquipamento(''); setNovaMedia(''); setErro(null)
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao criar exercicio.'),
  })

  const salvarMedia = useMutation({
    mutationFn: async () => {
      if (!editandoMedia) throw new Error('Selecione o exercício.')
      const supabase = createClient()
      const { error } = await supabase.from('exercicios')
        .update({ video_url: validateExerciseUrl(mediaUrl) })
        .eq('id', editandoMedia.id).select('id').single()
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] })
      void queryClient.invalidateQueries({ queryKey: ['exercicios'] })
      setEditandoMedia(null)
    },
  })

  const excluirExercicio = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('exercicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] }),
  })

  const filtrados = exercicios?.filter((e) => {
    const matchesBusca = busca === '' ||
      e.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      e.grupo_muscular?.toLowerCase().includes(busca.toLowerCase())
    const matchesGrupo = !filtroGrupo || e.grupo_muscular === filtroGrupo
    return matchesBusca && matchesGrupo
  })

  const grupos = [...new Set(exercicios?.map((e) => e.grupo_muscular) ?? [])].sort()

  return (
    <div className="exercises-workspace space-y-5">
      <header className="exercises-hero">
        <div className="exercises-hero-copy"><p className="eyebrow">Gestão</p>
          <h1>Biblioteca de <span>exercícios</span></h1>
          <p className="exercises-subtitle">
            Biblioteca global de exercícios da plataforma.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="exercises-create">
          <Plus className="mr-1.5 h-4 w-4" /> Novo exercício
        </Button>
        <ExerciseWireframe />
      </header>

      <div className="exercises-stats grid grid-cols-3 gap-3">
        <Card className="exercise-stat">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{exercicios?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de exercícios</p>
          </CardContent>
        </Card>
        <Card className="exercise-stat">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{grupos.length}</p>
            <p className="text-xs text-muted-foreground">Grupos musculares</p>
          </CardContent>
        </Card>
        <Card className="exercise-stat">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {exercicios?.filter((e) => e.equipamento).length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Com equipamento</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="exercises-search relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar exercício por nome ou grupo muscular"
            placeholder="Buscar exercício..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
      </div>

      <div className="exercises-filters flex flex-wrap gap-2" aria-label="Filtrar por grupo muscular">
        <button
          aria-pressed={!filtroGrupo}
          onClick={() => setFiltroGrupo(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !filtroGrupo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Todos
        </button>
        {grupos.map((g) => (
          <button
            key={g}
            aria-pressed={filtroGrupo === g}
            onClick={() => setFiltroGrupo(filtroGrupo === g ? null : g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtroGrupo === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="exercise-grid grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum exercício encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="exercise-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados?.map((e) => (
            <Card key={e.id} className="exercise-card group">
              <CardContent className="p-4">
                <div className="exercise-visual-row">
                  <ExerciseThumbnail name={e.nome} exerciseId={e.id} videoUrl={e.video_url} />
                  <div className="exercise-details min-w-0 flex-1">
                    <p className="exercise-name font-semibold">{e.nome}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{e.grupo_muscular}</p>
                    {e.equipamento && (
                      <p className="text-muted-foreground text-xs mt-1">Equipamento: {e.equipamento}</p>
                    )}
                    <ExercisePreview name={e.nome} exerciseId={e.id} videoUrl={e.video_url}/>
                  </div>
                  <button type="button" onClick={() => { setEditandoMedia(e); setMediaUrl(e.video_url ?? ''); salvarMedia.reset() }}
                    className="exercise-edit p-2 rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Editar demonstração de ${e.nome}`} title="Editar demonstração">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => excluirExercicio.mutate(e.id)}
                    className="exercise-delete p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    aria-label={`Excluir ${e.nome}`}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Novo exercício">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-nome" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input id="ex-nome" placeholder="Ex: Supino reto" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Grupo muscular</Label>
            <div className="flex flex-wrap gap-2">
              {GRUPOS_MUSCULAREIS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setNovoGrupo(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    novoGrupo === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-equipamento" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Equipamento (opcional)</Label>
            <Input id="ex-equipamento" placeholder="Ex: Barra, Halteres" value={novoEquipamento} onChange={(e) => setNovoEquipamento(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-media">GIF ou vídeo de demonstração (opcional)</Label>
            <Input id="ex-media" type="url" value={novaMedia} onChange={e => setNovaMedia(e.target.value)} placeholder="https://.../exercicio.gif" />
            <p className="text-sm text-muted-foreground">Link direto de GIF, WebP, MP4 ou WebM.</p>
          </div>
          {erro && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-destructive text-sm">{erro}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={() => criarExercicio.mutate()}
              disabled={criarExercicio.isPending || !novoNome.trim() || !novoGrupo}
              className="rounded-xl shadow-sm"
            >
              {criarExercicio.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar exercício
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editandoMedia} onClose={() => setEditandoMedia(null)} titulo="Demonstração do exercício">
        <div className="space-y-4">
          <p className="font-medium">{editandoMedia?.nome}</p>
          <div className="space-y-1.5">
            <Label htmlFor="admin-media-url">Link do GIF ou vídeo</Label>
            <Input id="admin-media-url" type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://.../exercicio.gif" />
            <p className="text-sm text-muted-foreground">A mídia aparece para o aluno e o personal. Use um link direto de GIF, WebP, MP4 ou WebM.</p>
          </div>
          {salvarMedia.error && <p role="alert" className="text-sm text-destructive">{salvarMedia.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditandoMedia(null)}>Cancelar</Button>
            <Button onClick={() => salvarMedia.mutate()} disabled={salvarMedia.isPending}>{salvarMedia.isPending ? 'Salvando...' : 'Salvar demonstração'}</Button>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        .exercises-workspace { --exercise-surface:#fcfdf9; --exercise-border:#d7ded3; --exercise-muted:#5f6f68; --exercise-ink:#162623; --exercise-brand:#129b89; min-width:0; font-family:'Sora',sans-serif; }
        html.dark .exercises-workspace { --exercise-surface:#091d18; --exercise-border:#24453b; --exercise-muted:#A3BECD; --exercise-ink:#F5FAF9; --exercise-brand:#00E9DF; }
        .exercises-workspace .exercises-hero { position:relative; isolation:isolate; overflow:hidden; border:1px solid var(--exercise-border); border-radius:18px; min-height:224px; padding:32px 40px; display:flex; align-items:center; justify-content:space-between; gap:24px; background:radial-gradient(ellipse at 80% 50%,#e4f3eb,transparent 65%),#fcfdf9; }
        html.dark .exercises-workspace .exercises-hero { background:radial-gradient(ellipse at 80% 60%,#073d32,#071d18 48%,#041512); }
        .exercises-workspace .exercises-hero-copy { position:relative; z-index:1; max-width:72%; }
        .exercises-workspace .eyebrow { display:inline-flex; border:1px solid var(--exercise-brand); border-radius:999px; padding:6px 16px; margin-bottom:17px; color:var(--exercise-brand); font-size:10px; font-weight:650; letter-spacing:.1em; text-transform:uppercase; }
        .exercises-workspace .exercises-hero h1 { color:var(--exercise-ink); font-size:46px; font-weight:800; line-height:1.12; letter-spacing:-.045em; }
        .exercises-workspace .exercises-hero h1 span { color:var(--exercise-brand); }
        .exercises-workspace .exercises-subtitle { color:var(--exercise-muted)!important; -webkit-text-fill-color:currentColor; font-size:16px; font-weight:400; line-height:1.6; margin-top:13px; }
        .exercises-workspace .exercise-wireframe { position:absolute; right:10%; top:50%; transform:translateY(-50%); width:34%; max-width:440px; height:auto; color:var(--exercise-brand); pointer-events:none; z-index:-1; opacity:.35; }
        .exercises-workspace .exercises-create { position:relative; z-index:1; flex-shrink:0; height:42px; border-radius:10px; background:var(--exercise-brand); color:white; box-shadow:none; font-size:12px; }
        html.dark .exercises-workspace .exercises-create { color:#04231e; }
        .exercises-workspace .exercise-stat { border:1px solid var(--exercise-border); border-radius:14px; background:var(--exercise-surface); box-shadow:none; }
        .exercises-workspace .exercise-stat > div { padding:19px 20px; }
        .exercises-workspace .exercise-stat p:first-child { color:var(--exercise-ink); font-size:26px; font-weight:750; }
        .exercises-workspace .exercise-stat p:last-child { color:var(--exercise-muted); line-height:1.5; }
        .exercises-workspace .exercises-search input { border:1px solid var(--exercise-border); border-radius:10px; background:var(--exercise-surface); color:var(--exercise-ink); box-shadow:none; }
        .exercises-workspace .exercises-search input::placeholder { color:var(--exercise-muted); }
        .exercises-workspace .exercises-filters button { min-height:34px; border:1px solid var(--exercise-border); border-radius:9px; padding:6px 12px; background:var(--exercise-surface); color:var(--exercise-muted); font-size:11px; box-shadow:none; }
        .exercises-workspace .exercises-filters button[aria-pressed="true"] { background:var(--exercise-brand); color:white; border-color:var(--exercise-brand); }
        html.dark .exercises-workspace .exercises-filters button[aria-pressed="true"] { color:#04231e; }
        .exercises-workspace .exercise-card { border:1px solid var(--exercise-border); border-radius:14px; background:var(--exercise-surface); box-shadow:none; transition:border-color .2s,background .2s; }
        .exercises-workspace .exercise-card:hover { border-color:var(--exercise-brand); }
        .exercises-workspace .exercise-card > div { padding:14px; }
        .exercises-workspace .exercise-visual-row { display:flex; align-items:center; gap:14px; position:relative; padding-right:22px; min-height:120px; }
        .exercises-workspace .exercise-details { align-self:center; }
        .exercises-workspace .exercise-delete { position:absolute; top:0; right:0; }
        .exercises-workspace .exercise-edit { position:absolute; bottom:0; right:0; min-width:36px; min-height:36px; }
        .exercises-workspace .exercise-card .exercise-visual-row .exercise-details > button { min-height:34px; }
        .exercises-workspace .exercise-card .exercise-visual-row > div:first-child button { min-height:28px; padding:0; }
        .exercises-workspace .exercise-name { font-size:14px; color:var(--exercise-ink); line-height:1.5; overflow-wrap:anywhere; }
        .exercises-workspace .exercise-name ~ p { color:var(--exercise-muted); font-size:11px; line-height:1.6; margin-top:4px; }
        .exercises-workspace .exercise-card button:not(.exercise-delete) { color:var(--exercise-brand); min-height:34px; font-size:11px; }
        .exercises-workspace .exercise-delete { opacity:.65; flex-shrink:0; }
        .exercises-workspace .exercise-delete:hover,.exercises-workspace .exercise-delete:focus-visible { opacity:1; }
        .exercises-workspace button:focus-visible,.exercises-workspace input:focus-visible { outline:2px solid var(--exercise-brand); outline-offset:3px; }
        @media(max-width:767px) {
          .exercises-workspace .exercises-hero { min-height:240px; padding:27px 22px; flex-direction:column; align-items:flex-start; gap:20px; }
          .exercises-workspace .exercises-hero-copy { max-width:100%; }
          .exercises-workspace .exercises-hero h1 { font-size:32px; }
          .exercises-workspace .exercises-subtitle { font-size:14px; }
          .exercises-workspace .exercise-wireframe { width:280px; right:-100px; top:65%; opacity:.12; }
          .exercises-workspace .exercises-create { height:44px; }
          .exercises-workspace .exercises-stats { gap:8px; }
          .exercises-workspace .exercise-stat > div { padding:14px 10px; }
          .exercises-workspace .exercise-stat p:first-child { font-size:24px; }
          .exercises-workspace .exercise-stat p:last-child { font-size:10px; }
          .exercises-workspace .exercises-filters { gap:6px; }
          .exercises-workspace .exercises-filters button { min-height:38px; font-size:10px; padding:7px 10px; }
          .exercises-workspace .exercise-card > div { padding:14px; }
          .exercises-workspace .exercise-grid { grid-template-columns:minmax(0,1fr); }
          .exercises-workspace .exercise-visual-row { gap:12px; }
          .exercises-workspace .exercise-name { font-size:13px; }
          .exercises-workspace .exercise-card .exercise-visual-row .exercise-details > button { min-height:44px; }
          .exercises-workspace .exercise-card .exercise-visual-row > div:first-child button { min-height:32px; }
          .exercises-workspace .exercise-card button:not(.exercise-delete) { min-height:44px; font-size:12px; }
          .exercises-workspace .exercise-delete { min-width:36px; min-height:36px; }
        }
        @media(prefers-reduced-motion:reduce) { .exercises-workspace .exercise-card { transition:none; } }

        html:not(.dark) .exercises-workspace .exercises-hero h1 { color:#112b2a; }
        html:not(.dark) .exercises-workspace .exercises-hero h1 span,
        html:not(.dark) .exercises-workspace .exercise-wireframe { color:#008d85; }
        html:not(.dark) .exercises-workspace .exercises-subtitle { color:#53717e!important; }
        html:not(.dark) .exercises-workspace .exercises-search input::placeholder { color:#7b8983; }
        html:not(.dark) .exercises-workspace .exercises-filters button[aria-pressed="true"] { background:#e4f3eb; color:#0d7e70; border-color:#129b89; }
        html:not(.dark) .exercises-workspace .exercises-create:hover { background:#0d7e70; }
      `}</style>
    </div>
  )
}

function ExerciseWireframe() {
  return (
    <svg className="exercise-wireframe" viewBox="0 0 400 240" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth=".8">
        <ellipse cx="200" cy="120" rx="145" ry="55" transform="rotate(-45 200 120)" />
        <ellipse cx="200" cy="120" rx="150" ry="63" transform="rotate(36 200 120)" />
        <ellipse cx="200" cy="120" rx="133" ry="87" transform="rotate(-12 200 120)" />
        {Array.from({length:16},(_,i) => <ellipse key={i} cx="200" cy="120" rx={60+i*3} ry="32" transform={`rotate(${i*11} 200 120)`} opacity=".35" />)}
      </g>
      {[{x:99,y:48},{x:241,y:27},{x:332,y:111},{x:235,y:209},{x:70,y:164}].map((point,i) => (
        <g key={i}><circle cx={point.x} cy={point.y} r="9" fill="var(--exercise-surface)" stroke="currentColor" /><circle cx={point.x-2} cy={point.y-2} r="3" fill="currentColor" opacity=".6" /></g>
      ))}
    </svg>
  )
}
