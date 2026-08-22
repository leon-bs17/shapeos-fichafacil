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
  const { registros } = colecoes()

  await database.write(async () => {
    await registros.create((r) => {
      r.remoteId = gerarUuid()
      r.itemTreinoRemoteId = novo.itemTreinoRemoteId
      r.cargaUtilizada = novo.cargaUtilizada
      r.repeticoesFeitas = novo.repeticoesFeitas
      r.dataRegistro = new Date()
      r.sincronizado = false
    })
  })
}

export async function contarRegistrosPendentes(): Promise<number> {
  return colecoes()
    .registros.query(Q.where('sincronizado', false))
    .fetchCount()
}

export async function enviarRegistrosPendentes(): Promise<number> {
  const estado = await NetInfo.fetch()
  if (!estado.isConnected) return 0

  const pendentes = await colecoes()
    .registros.query(Q.where('sincronizado', false), Q.sortBy('data_registro', Q.asc))
    .fetch()

  if (!pendentes.length) return 0

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const payload = pendentes.map((r) => ({
    id: r.remoteId ?? undefined,
    aluno_id: user.id,
    item_treino_id: r.itemTreinoRemoteId,
    carga_utilizada: r.cargaUtilizada,
    repeticoes_feitas: r.repeticoesFeitas,
    data_registro: r.dataRegistro.toISOString(),
  }))

  const { error } = await supabase
    .from('registro_execucao')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })

  if (error) throw new Error(error.message)

  await database.write(async () => {
    await database.batch(
      ...pendentes.map((r) =>
        r.prepareUpdate((rec: RegistroExecucao) => {
          rec.sincronizado = true
        })
      )
    )
  })

  return pendentes.length
}
