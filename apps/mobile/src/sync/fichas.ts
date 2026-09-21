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

  const fichas = (data ?? []) as unknown as FichaCompleta[]
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
      ...itensLocais.map((item) => item.prepareDestroyPermanently()),
      ...treinosLocais.map((treino) => treino.prepareDestroyPermanently()),
    ]

    for (const ficha of fichas) {
      acoes.push(
        colTreinos.prepareCreate((treino) => {
          treino._raw.id = ficha.id
          treino.remoteId = ficha.id
          treino.titulo = ficha.titulo
          treino.ativo = ficha.ativo
          treino.criadoEm = new Date(ficha.criado_em)
        })
      )

      for (const item of [...ficha.itens].sort((a, b) => a.ordem - b.ordem)) {
        acoes.push(
          colItens.prepareCreate((registro) => {
            registro._raw.id = item.id
            registro.remoteId = item.id
            registro.treinoRemoteId = ficha.id
            registro.exercicioNome = item.exercicio.nome
            registro.exercicioGrupoMuscular = item.exercicio.grupo_muscular
            registro.exercicioVideoUrl = item.exercicio.video_url
            registro.series = item.series
            registro.repeticoes = item.repeticoes
            registro.descansoSegundos = item.descanso_segundos
            registro.ordem = item.ordem
          })
        )
      }
    }

    if (acoes.length > 0) {
      await database.batch(...acoes)
    }
  })
}
