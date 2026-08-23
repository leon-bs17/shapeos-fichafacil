'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  alternarFichaAtiva,
  criarFicha,
  duplicarFicha,
  editarFicha,
  excluirFicha,
  listarFichas,
  type FichaResumo,
  type NovaFicha,
} from '@/services/treinos'

async function comSessao<T>(fn: (uid: string) => Promise<T>): Promise<T> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada')
  return fn(user.id)
}

export function useFichas() {
  return useQuery<FichaResumo[]>({
    queryKey: ['fichas'],
    queryFn: () => comSessao((uid) => listarFichas(createClient(), uid)),
  })
}

export function useAcoesFichas() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['fichas'] })
    void queryClient.invalidateQueries({ queryKey: ['alunos'] })
  }

  const criar = useMutation({
    mutationFn: ({ ficha }: { ficha: NovaFicha }) =>
      comSessao((uid) => criarFicha(createClient(), uid, ficha)),
    onSuccess: invalidate,
  })

  const duplicar = useMutation({
    mutationFn: (fichaId: string) =>
      comSessao(() => duplicarFicha(createClient(), fichaId)),
    onSuccess: invalidate,
  })

  const alternar = useMutation({
    mutationFn: ({ fichaId, ativo }: { fichaId: string; ativo: boolean }) =>
      comSessao(() => alternarFichaAtiva(createClient(), fichaId, ativo)),
    onSuccess: invalidate,
  })

  const editar = useMutation({
    mutationFn: ({
      fichaId,
      ficha,
    }: {
      fichaId: string
      ficha: Omit<NovaFicha, 'aluno_id'>
    }) => comSessao(() => editarFicha(createClient(), fichaId, ficha)),
    onSuccess: invalidate,
  })

  const excluir = useMutation({
    mutationFn: (fichaId: string) =>
      comSessao(() => excluirFicha(createClient(), fichaId)),
    onSuccess: invalidate,
  })

  return { criar, duplicar, alternar, editar, excluir }
}
