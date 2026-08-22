import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class ItemTreinoLocal extends Model {
  static table = 'itens_treino'

  @field('remote_id') remoteId!: string
  @field('treino_remote_id') treinoRemoteId!: string
  @field('exercicio_nome') exercicioNome!: string
  @field('exercicio_grupo_muscular') exercicioGrupoMuscular!: string
  @field('exercicio_video_url') exercicioVideoUrl!: string | null
  @field('series') series!: number
  @field('repeticoes') repeticoes!: string
  @field('descanso_segundos') descansoSegundos!: number
  @field('ordem') ordem!: number
}
