import { Q } from '@nozbe/watermelondb'
import * as SecureStore from 'expo-secure-store'
import { colecoes, database, type RegistroExecucao } from '../database'

const CHAVE_USUARIO_LOCAL = 'shapeos.dados.usuario'

export async function limparDadosLocais(): Promise<void> {
  const { treinos, itens, registros } = colecoes()

  await database.write(async () => {
    const [treinosLocais, itensLocais, registrosLocais] = await Promise.all([
      treinos.query().fetch(),
      itens.query().fetch(),
      registros.query().fetch(),
    ])

    const acoes = [
      ...registrosLocais.map((registro) =>
        registro.prepareDestroyPermanently()
      ),
      ...itensLocais.map((item) => item.prepareDestroyPermanently()),
      ...treinosLocais.map((treino) => treino.prepareDestroyPermanently()),
    ]

    if (acoes.length > 0) {
      await database.batch(...acoes)
    }
  })
}

async function associarRegistrosLegados(userId: string): Promise<void> {
  const legados = await colecoes()
    .registros.query(Q.where('aluno_id', null))
    .fetch()

  if (!legados.length) return

  await database.write(async () => {
    await database.batch(
      ...legados.map((registro) =>
        registro.prepareUpdate((item: RegistroExecucao) => {
          item.alunoId = userId
        })
      )
    )
  })
}

export async function prepararDadosLocaisParaUsuario(
  userId: string,
  assumirDadosLegados = false
): Promise<void> {
  const usuarioAnterior = await SecureStore.getItemAsync(CHAVE_USUARIO_LOCAL)

  if (usuarioAnterior && usuarioAnterior !== userId) {
    await limparDadosLocais()
  } else if (!usuarioAnterior) {
    if (assumirDadosLegados) {
      await associarRegistrosLegados(userId)
    } else {
      await limparDadosLocais()
    }
  }

  await SecureStore.setItemAsync(CHAVE_USUARIO_LOCAL, userId)
}

export async function limparContextoLocal(): Promise<void> {
  await limparDadosLocais()
  await SecureStore.deleteItemAsync(CHAVE_USUARIO_LOCAL)
}
