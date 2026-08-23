'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, Search, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'

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
        .select('id, nome, grupo_muscular, equipamento, criado_por')
        .order('grupo_muscular')
        .order('nome')
      return data ?? []
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
      })
      if (error) {
        if (error.code === '23505') throw new Error('Exercicio ja existe nesse grupo muscular.')
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-exercicios'] })
      setModalAberto(false); setNovoNome(''); setNovoGrupo(''); setNovoEquipamento(''); setErro(null)
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao criar exercicio.'),
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
    <div className="space-y-8">
      <header className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exercicios</h1>
          <p className="text-muted-foreground text-sm">
            Biblioteca global de exercicios da plataforma.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" /> Novo exercicio
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{exercicios?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de exercicios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{grupos.length}</p>
            <p className="text-xs text-muted-foreground">Grupos musculares</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {exercicios?.filter((e) => e.equipamento).length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Com equipamento</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercicio..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum exercicio encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados?.map((e) => (
            <Card key={e.id} className="hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{e.nome}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{e.grupo_muscular}</p>
                    {e.equipamento && (
                      <p className="text-muted-foreground text-xs mt-1">Equipamento: {e.equipamento}</p>
                    )}
                  </div>
                  <button
                    onClick={() => excluirExercicio.mutate(e.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Novo Exercicio">
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
              Criar exercicio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
