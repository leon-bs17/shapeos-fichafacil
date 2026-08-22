import { Model } from '@nozbe/watermelondb'
import { date, field } from '@nozbe/watermelondb/decorators'

export default class RegistroExecucao extends Model {
  static table = 'registros_execucao'

  @field('remote_id') remoteId!: string | null
  @field('item_treino_remote_id') itemTreinoRemoteId!: string
  @field('carga_utilizada') cargaUtilizada!: number | null
  @field('repeticoes_feitas') repeticoesFeitas!: number | null
  @date('data_registro') dataRegistro!: Date
  @field('sincronizado') sincronizado!: boolean
}
