import { Model } from '@nozbe/watermelondb'
import { children, date, field } from '@nozbe/watermelondb/decorators'
import type { ItemTreinoLocal } from './ItemTreino'

export default class Treino extends Model {
  static table = 'treinos'

  static associations = {
    itens_treino: { type: 'has_many' as const, foreignKey: 'treino_remote_id' },
  }

  @field('remote_id') remoteId!: string
  @field('titulo') titulo!: string
  @field('ativo') ativo!: boolean
  @date('criado_em') criadoEm!: Date

  @children('itens_treino') itens!: ItemTreinoLocal[]
}
