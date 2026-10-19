'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { FileText, Users, Dumbbell, Search, Plus, Trash2, X, Loader2, Pencil } from 'lucide-react'
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
  const [comEquipamento, setComEquipamento] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaMedia, setNovaMedia] = useState('')
  const [editandoMedia, setEditandoMedia] = useState<Exercicio | null>(null)
  const [mediaUrl, setMediaUrl] = useState('')
  const [novoGrupo, setNovoGrupo] = useState('')
  const [novoEquipamento, setNovoEquipamento] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const html = document.documentElement
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Tab') html.setAttribute('data-exercises-search-keyboard', 'true')
    }
    const pointer = () => html.removeAttribute('data-exercises-search-keyboard')
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    let first = 0
    let second = 0
    let dark = html.classList.contains('dark')
    const observer = new MutationObserver(() => {
      const nextDark = html.classList.contains('dark')
      if (nextDark === dark) return
      dark = nextDark
      html.classList.add('exercises-theme-changing')
      void getComputedStyle(html).color
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => html.classList.remove('exercises-theme-changing'))
      })
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => {
      document.removeEventListener('keydown', keyboard, true)
      document.removeEventListener('pointerdown', pointer, true)
      observer.disconnect()
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
      html.removeAttribute('data-exercises-search-keyboard')
      html.classList.remove('exercises-theme-changing')
    }
  }, [])


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
    return matchesBusca && matchesGrupo && (!comEquipamento || Boolean(e.equipamento))
  })

  const grupos = [...new Set(exercicios?.map((e) => e.grupo_muscular) ?? [])].sort()

  return (
    <div className="exercises-workspace space-y-5" data-exercises-refined>
      <header className="exercises-hero">
        <div className="exercises-hero-copy"><p className="eyebrow">Biblioteca</p>
          <h2 className="exercises-banner-title">Biblioteca de <span>exercícios</span></h2>
          <p className="exercises-subtitle">
            Biblioteca global de exercícios da plataforma.
          </p>
        </div>

        <ExerciseWireframe />
      </header>

      <div className="exercises-stats grid grid-cols-3 gap-3">
        <button type="button" data-admin-metric-action aria-controls="exercises-results" aria-label="Mostrar todos os exercícios" title="Mostrar todos os exercícios" aria-pressed={!busca && !filtroGrupo && !comEquipamento} onClick={() => { setBusca(''); setFiltroGrupo(null); setComEquipamento(false); requestAnimationFrame(() => { const heading = document.querySelector<HTMLElement>('#exercises-results'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start', behavior: 'auto' }) }) }} className="exercise-stat">
          <CardContent className="p-4"><span data-admin-metric-icon aria-hidden="true" className="exercise-stat-icon"><FileText size={25} strokeWidth={1.7}/></span><div className="exercise-stat-copy">
            <p className="text-2xl font-bold">{exercicios?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de exercícios</p>
          </div></CardContent>
        </button>
        <button type="button" data-admin-metric-action aria-controls="exercise-group-filters" aria-label="Escolher um grupo muscular" title="Escolher um grupo muscular" onClick={() => { requestAnimationFrame(() => { const group = document.getElementById('exercise-group-filters'); group?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); group?.scrollIntoView({ block: 'center', behavior: 'auto' }) }) }} className="exercise-stat">
          <CardContent className="p-4"><span data-admin-metric-icon aria-hidden="true" className="exercise-stat-icon"><Users size={25} strokeWidth={1.7}/></span><div className="exercise-stat-copy">
            <p className="text-2xl font-bold">{grupos.length}</p>
            <p className="text-xs text-muted-foreground">Grupos musculares</p>
          </div></CardContent>
        </button>
        <button type="button" data-admin-metric-action aria-controls="exercises-results" aria-label="Mostrar exercícios com equipamento" title="Mostrar exercícios com equipamento" aria-pressed={comEquipamento} onClick={() => { setBusca(''); setFiltroGrupo(null); setComEquipamento(true); requestAnimationFrame(() => { const heading = document.querySelector<HTMLElement>('#exercises-results'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start', behavior: 'auto' }) }) }} className="exercise-stat">
          <CardContent className="p-4"><span data-admin-metric-icon aria-hidden="true" className="exercise-stat-icon"><Dumbbell size={25} strokeWidth={1.7}/></span><div className="exercise-stat-copy">
            <p className="text-2xl font-bold">
              {exercicios?.filter((e) => e.equipamento).length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Com equipamento</p>
          </div></CardContent>
        </button>
      </div>

      <section className="exercises-management"><header className="exercises-management-heading"><h2 id="exercises-results" tabIndex={-1}>Exercícios cadastrados</h2><span>{filtrados?.length ?? 0} exercícios</span></header>
      <div className="exercises-toolbar">
        <div data-admin-search className="exercises-search relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar exercício por nome ou grupo muscular"
            placeholder="Buscar exercício..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <button type="button" onClick={() => setModalAberto(true)} className="exercises-create">
          <Plus size={16} aria-hidden="true" /> Novo exercício
        </button>
      </div>

      {comEquipamento && <div className="exercises-filters flex flex-wrap gap-2" aria-label="Filtros ativos"><button type="button" aria-label="Remover filtro com equipamento" aria-pressed="true" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 text-xs" onClick={() => setComEquipamento(false)}>Com equipamento<X size={14} aria-hidden="true"/></button></div>}
      <div id="exercise-group-filters" className="exercises-filters flex flex-wrap gap-2" aria-label="Filtrar por grupo muscular">
        <button
          aria-pressed={!filtroGrupo}
          onClick={() => setFiltroGrupo(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !filtroGrupo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
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
              filtroGrupo === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
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
        <>
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
                    </div>
                </div>
                <div className="exercise-card-actions">
                  <ExercisePreview name={e.nome} exerciseId={e.id} videoUrl={e.video_url}/>
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
        </div></>
      )}

      </section>
      <Modal admin open={modalAberto} onClose={() => setModalAberto(false)} titulo="Novo exercício">
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

      <Modal admin open={!!editandoMedia} onClose={() => setEditandoMedia(null)} titulo="Demonstração do exercício">
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

        .exercises-workspace .exercises-toolbar { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create) {
          height:48px!important; min-height:48px!important; border:1px solid var(--exercise-border)!important;
          border-radius:13px!important; background:var(--exercise-surface)!important;
          box-shadow:none!important; outline:none!important; transform:none!important; filter:none!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
        }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-create {
          display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:8px!important;
          padding:0 18px!important; color:var(--exercise-ink)!important; font-family:inherit!important;
          font-size:13px!important; font-weight:500!important; white-space:nowrap;
        }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-create svg { color:inherit!important; flex-shrink:0; }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-search:focus-within { border-color:var(--exercise-border)!important; outline:none!important; box-shadow:none!important; }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-search input:is(:focus,:focus-visible) { outline:none!important; box-shadow:none!important; background:transparent!important; border:0!important; }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-search input { transition:none!important; }
        html:is(.light,.dark)[data-exercises-search-keyboard="true"] body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-search:has(input:focus-visible),
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-create:focus-visible { outline:2px solid var(--exercise-brand)!important; outline-offset:3px!important; }
        @media(hover:hover) and (pointer:fine) {
          html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-search:not(:has(input:disabled)):hover,
          html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-create:not(:disabled):hover {
            background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important;
          }
        }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-create:disabled { cursor:not-allowed; opacity:.5; }
        html.exercises-theme-changing .exercises-workspace,
        html.exercises-theme-changing .exercises-workspace * { transition:none!important; }
        @media(max-width:767px) {
          .exercises-workspace .exercises-toolbar { grid-template-columns:minmax(0,1fr); }
          html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-create { width:100%!important; }
        }
        @media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create) { transition:none!important; } }


        /* Group filters and exercise tiles share the approved hover treatment. */
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-filters button,.exercise-card) {
          border:1px solid var(--exercise-border)!important; border-radius:13px!important;
          background:var(--exercise-surface)!important; box-shadow:none!important;
          transform:none!important; filter:none!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
        }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-filters button { color:var(--exercise-muted)!important; }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-filters button[aria-pressed="true"] {
          background:var(--exercise-filter-selected-bg)!important;
          border-color:var(--exercise-brand)!important; color:var(--exercise-filter-selected-text)!important;
        }
        html.light body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace { --exercise-filter-selected-bg:#e4f3eb; --exercise-filter-selected-text:#0d7e70; }
        html.dark body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace { --exercise-filter-selected-bg:#123b31; --exercise-filter-selected-text:#00e9df; }
        @media(hover:hover) and (pointer:fine) {
          html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-filters button:not(:disabled):hover,
          html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercise-card:hover {
            background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important;
          }
        }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-filters button:focus-visible { outline:2px solid var(--exercise-brand)!important; outline-offset:3px!important; }
        html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace .exercises-filters button:disabled { cursor:not-allowed; opacity:.5; }
        html.exercises-theme-changing body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-card) { transition:none!important; }
        @media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content][data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-filters button,.exercise-card) { transition:none!important; } }

      
/* Exercise controls use the same quiet treatment as the search field. */
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete) {
background:var(--exercise-surface)!important;background-image:none!important;
border:1px solid var(--exercise-border)!important;border-radius:13px!important;
box-shadow:none!important;-webkit-box-shadow:none!important;text-shadow:none!important;
transform:none!important;translate:none!important;scale:none!important;filter:none!important;animation:none!important;
transition:background-color 150ms ease,border-color 150ms ease!important;
}
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete)::before, html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete)::after { content:none!important;display:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercises-search input { background:transparent!important;border:0!important;box-shadow:none!important;outline:none!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercises-filters button[aria-pressed="true"] { background:color-mix(in srgb,var(--exercise-brand) 7%,var(--exercise-surface))!important;border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important;color:var(--exercise-brand)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete):focus:not(:focus-visible) { outline:none!important;box-shadow:none!important; }
@media(hover:hover) and (pointer:fine) {
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete):not(:disabled):hover { background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important; }
}
@media(hover:none) {
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete):hover:not([aria-pressed="true"]) { background:var(--exercise-surface)!important;border-color:var(--exercise-border)!important; }
}
html.exercises-theme-changing body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace * { transition:none!important; }
@media(prefers-reduced-motion:reduce) { html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace :is(.exercises-search,.exercises-create,.exercises-filters button,.exercise-details>button,.exercise-edit,.exercise-delete) { transition:none!important; } }

html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercises-hero { min-height:180px!important;padding:28px 32px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat>div { display:flex!important;align-items:center!important;gap:16px!important;padding:18px 20px!important;min-height:82px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat-icon { display:grid!important;place-items:center!important;flex-shrink:0!important;width:42px!important;height:42px!important;border-radius:13px!important;background:color-mix(in srgb,var(--exercise-brand) 8%,transparent)!important;color:var(--exercise-brand)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat-copy { min-width:0!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-list-heading { display:flex!important;justify-content:space-between!important;align-items:center!important;gap:12px!important;margin-bottom:12px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-list-heading h2 { font-size:14px!important;font-weight:650!important;color:var(--exercise-ink)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-list-heading>span { font-size:12px!important;color:var(--exercise-muted)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card>div { padding:14px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-visual-row { display:flex!important;align-items:center!important;min-height:120px!important;gap:16px!important;padding-right:0!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-details { align-self:center!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-name { font-size:14px!important;line-height:1.4!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-details>p:nth-child(2) { display:inline-flex!important;align-items:center!important;width:fit-content!important;padding:3px 8px!important;margin-top:8px!important;border:1px solid var(--exercise-border)!important;border-radius:999px!important;font-size:11px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-details>p:nth-child(3) { font-size:12px!important;line-height:1.5!important;margin-top:7px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions { display:grid!important;grid-template-columns:minmax(0,1fr) 40px 40px!important;align-items:center!important;gap:8px!important;margin-top:12px!important;padding-top:12px!important;border-top:1px solid var(--exercise-border)!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>button { position:static!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;width:100%!important;min-width:0!important;height:40px!important;min-height:40px!important;padding:0 8px!important;font-size:12px!important;border:1px solid var(--exercise-border)!important;border-radius:13px!important;background:transparent!important;color:var(--exercise-brand)!important;box-shadow:none!important;transform:none!important;filter:none!important;opacity:1!important;transition:background-color 150ms ease,border-color 150ms ease!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>.exercise-delete { color:var(--exercise-muted)!important; }
@media(hover:hover) and (pointer:fine) { html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>button:hover:enabled { background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important; } }
@media(max-width:767px) {
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercises-hero { min-height:0!important;padding:24px 20px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat>div { gap:8px!important;flex-direction:column!important;text-align:center!important;padding:12px 6px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat-icon { width:32px!important;height:32px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat-copy p:first-child { font-size:24px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-stat-copy p:last-child { font-size:10px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-visual-row { gap:12px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions { grid-template-columns:minmax(0,1fr) 44px 44px!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>button { height:44px!important;min-height:44px!important; }
}
html.exercises-theme-changing body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace * { transition:none!important; }

html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace { --exercise-danger:#b42336; }
html.dark body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace { --exercise-danger:#ff8f9b; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-wireframe { right:2%!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>.exercise-delete { color:var(--exercise-danger)!important;border-color:color-mix(in srgb,var(--exercise-danger) 40%,transparent)!important;background:transparent!important; }
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>.exercise-delete svg { color:var(--exercise-danger)!important; }
@media(hover:hover) and (pointer:fine) {
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>.exercise-delete:hover:enabled { color:var(--exercise-danger)!important;background:color-mix(in srgb,var(--exercise-danger) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-danger) 40%,transparent)!important; }
}
html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-card-actions>.exercise-delete:focus-visible { outline-color:var(--exercise-danger)!important; }
@media(max-width:767px) { html:is(.light,.dark) body [data-admin-route="/admin/exercicios"][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route][data-admin-route] [data-admin-content] .exercises-workspace.exercises-workspace .exercise-wireframe { right:-120px!important; } }
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-hero{min-height:130px!important;padding:22px 26px!important;border-radius:16px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-banner-title{display:block!important;margin:5px 0 8px!important;font-size:28px!important;font-weight:650!important;line-height:1.15!important;letter-spacing:-.035em!important;color:var(--exercise-ink)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-banner-title span{display:inline!important;color:var(--exercise-brand)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .eyebrow{margin-bottom:6px!important;padding:4px 10px!important;font-size:9px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-subtitle{font-size:12px!important;margin-top:8px!important;line-height:1.5!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-stats{gap:0!important;margin:0!important;padding:18px 0!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat+.exercise-stat{border-left:1px solid var(--exercise-border)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat>div{display:flex!important;align-items:center!important;gap:12px!important;padding:4px 20px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat p:first-child{font-size:24px!important;line-height:1.2!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-management{border:1px solid var(--exercise-border)!important;border-radius:16px!important;background:var(--exercise-surface)!important;padding:20px!important;min-width:0!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-management-heading{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:12px!important;margin-bottom:16px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-management-heading h2{font-size:15px!important;font-weight:650!important;color:var(--exercise-ink)!important;margin:0!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-management-heading>span{font-size:11px!important;color:var(--exercise-muted)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-toolbar{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:12px!important;margin:0 0 14px!important;padding:0!important;border:0!important;background:transparent!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-create{height:44px!important;min-height:44px!important;padding:0 16px!important;border:1px solid var(--exercise-border)!important;border-radius:13px!important;background:transparent!important;color:var(--exercise-ink)!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;box-shadow:none!important;transform:none!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-create svg{color:var(--exercise-brand)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-search input{height:44px!important;min-height:44px!important;border-radius:13px!important;box-shadow:none!important;transform:none!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-filters{gap:7px!important;margin:0 0 18px!important;padding:0 0 16px!important;border-bottom:1px solid var(--exercise-border)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-filters button{min-height:36px!important;border:1px solid var(--exercise-border)!important;border-radius:10px!important;background:transparent!important;color:var(--exercise-ink)!important;padding:6px 11px!important;font-size:11px!important;box-shadow:none!important;transform:none!important;transition:background-color 150ms ease,border-color 150ms ease!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-filters button[aria-pressed="true"]{background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important;color:var(--exercise-brand)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card{border:1px solid var(--exercise-border)!important;border-radius:13px!important;box-shadow:none!important;transform:none!important;background:var(--exercise-surface)!important;min-width:0!important;transition:none!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card>div{padding:14px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-visual-row{min-height:100px!important;padding-right:0!important;gap:12px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-name{font-size:13px!important;font-weight:600!important;line-height:1.5!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card-actions{margin-top:12px!important;padding-top:12px!important;gap:8px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card-actions>.exercise-delete{color:var(--exercise-danger)!important;border-color:color-mix(in srgb,var(--exercise-danger) 40%,transparent)!important;background:transparent!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card-actions>.exercise-delete svg{color:var(--exercise-danger)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card-actions>.exercise-delete:hover:enabled{color:var(--exercise-danger)!important;background:color-mix(in srgb,var(--exercise-danger) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-danger) 40%,transparent)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-create:hover{background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important;color:var(--exercise-ink)!important;box-shadow:none!important;transform:none!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-filters button:hover{background:color-mix(in srgb,var(--exercise-brand) 7%,transparent)!important;border-color:color-mix(in srgb,var(--exercise-brand) 40%,transparent)!important;box-shadow:none!important;transform:none!important}
@media(min-width:768px) and (max-width:1199px){html body :is(#exercises-refined,[data-exercises-refined]) .exercise-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:767px){html body :is(#exercises-refined,[data-exercises-refined]) .exercises-hero{min-height:150px!important;padding:20px!important;flex-direction:row!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-hero-copy{max-width:100%!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-banner-title{font-size:25px!important;white-space:normal!important;max-width:100%!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-subtitle{font-size:11px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat>div{padding:4px 10px!important;flex-direction:column!important;align-items:flex-start!important;gap:7px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat p:first-child{font-size:21px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-stat p:last-child{font-size:10px!important;line-height:1.4!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-management{padding:14px!important;border-radius:13px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-management-heading{flex-wrap:wrap!important;margin-bottom:14px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-toolbar{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-create{width:100%!important;height:44px!important;min-height:44px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercises-filters button{min-height:44px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-grid{grid-template-columns:minmax(0,1fr)!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card-actions{grid-template-columns:minmax(0,1fr) 44px 44px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-card-actions>button{height:44px!important;min-height:44px!important}
html body :is(#exercises-refined,[data-exercises-refined]) .exercise-wireframe{right:-80px!important;width:240px!important;opacity:.12!important}}
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
