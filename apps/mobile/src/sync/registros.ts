import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'
import { colecoes, database, type RegistroExecucao } from '../database'
import { supabase } from '../services/supabase/client'
import { gerarUuid } from '../lib/uuid'

export interface NovoRegistro {
  itemTreinoRemoteId: string
  cargaUtilizada: number | null
  repeticoesFeitas: number | null
}

export async function salvarRegistro(novo: NovoRegistro): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuario nao autenticado')
  }

  const { registros } = colecoes()

  await database.write(async () => {
    await registros.create((registro) => {
      registro.remoteId = gerarUuid()
      registro.alunoId = user.id
      registro.itemTreinoRemoteId = novo.itemTreinoRemoteId
      registro.cargaUtilizada = novo.cargaUtilizada
      registro.repeticoesFeitas = novo.repeticoesFeitas
      registro.dataRegistro = new Date()
      registro.sincronizado = false
    })
  })
}

export async function contarRegistrosPendentes(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  return colecoes()
    .registros.query(
      Q.where('aluno_id', user.id),
      Q.where('sincronizado', false)
    )
    .fetchCount()
}

export async function enviarRegistrosPendentes(): Promise<number> {
  const estado = await NetInfo.fetch()
  if (!estado.isConnected) return 0

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const pendentes = await colecoes()
    .registros.query(
      Q.where('aluno_id', user.id),
      Q.where('sincronizado', false),
      Q.sortBy('data_registro', Q.asc)
    )
    .fetch()

  if (!pendentes.length) return 0

  const payload = pendentes.map((registro) => ({
    id: registro.remoteId ?? undefined,
    aluno_id: registro.alunoId,
    item_treino_id: registro.itemTreinoRemoteId,
    carga_utilizada: registro.cargaUtilizada,
    repeticoes_feitas: registro.repeticoesFeitas,
    data_registro: registro.dataRegistro.toISOString(),
  }))

  const { error } = await supabase
    .from('registro_execucao')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })

  if (error) throw new Error(error.message)

  await database.write(async () => {
    await database.batch(
      ...pendentes.map((registro) =>
        registro.prepareUpdate((item: RegistroExecucao) => {
          item.sincronizado = true
        })
      )
    )
  })

  return pendentes.length
}
