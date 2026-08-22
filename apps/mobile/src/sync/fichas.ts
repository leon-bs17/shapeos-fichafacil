import NetInfo from '@react-native-community/netinfo'
import type { FichaCompleta } from '@shapeos/shared'
import { colecoes, database } from '../database'
import { supabase } from '../services/supabase/client'

export async function baixarFichasDoAluno(alunoId: string): Promise<number> {
  const estado = await NetInfo.fetch()
  if (!estado.isConnected) return 0

  const { data, error } = await supabase
    .from('treinos')
    .select('*, itens:itens_treino(*, exercicio:exercicios(*))')
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data?.length) return 0

  const fichas = data as unknown as FichaCompleta[]
  await gravarFichasLocalmente(fichas)
  return fichas.length
}

async function gravarFichasLocalmente(fichas: FichaCompleta[]): Promise<void> {
  const { treinos: colTreinos, itens: colItens } = colecoes()

  await database.write(async () => {
    const [treinosLocais, itensLocais] = await Promise.all([
      colTreinos.query().fetch(),
      colItens.query().fetch(),
    ])

    const acoes = [
      ...itensLocais.map((i) => i.prepareDestroyPermanently()),
      ...treinosLocais.map((t) => t.prepareDestroyPermanently()),
    ]

    for (const ficha of fichas) {
      acoes.push(
        colTreinos.prepareCreate((t) => {
          t._raw.id = ficha.id
          t.remoteId = ficha.id
          t.titulo = ficha.titulo
          t.ativo = ficha.ativo
          t.criadoEm = new Date(ficha.criado_em)
        })
      )

      for (const item of [...ficha.itens].sort((a, b) => a.ordem - b.ordem)) {
        acoes.push(
          colItens.prepareCreate((i) => {
            i._raw.id = item.id
            i.remoteId = item.id
            i.treinoRemoteId = ficha.id
            i.exercicioNome = item.exercicio.nome
            i.exercicioGrupoMuscular = item.exercicio.grupo_muscular
            i.exercicioVideoUrl = item.exercicio.video_url
            i.series = item.series
            i.repeticoes = item.repeticoes
            i.descansoSegundos = item.descanso_segundos
            i.ordem = item.ordem
          })
        )
      }
    }

    await database.batch(...acoes)
  })
}
