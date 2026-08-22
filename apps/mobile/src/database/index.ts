import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { mySchema } from './schema'
import Treino from './models/Treino'
import { ItemTreinoLocal } from './models/ItemTreino'
import RegistroExecucao from './models/RegistroExecucao'

const adapter = new SQLiteAdapter({
  schema: mySchema,
  dbName: 'shapeos',
  jsi: true,
  onSetUpError: (error) => {
    throw error
  },
})

export const database = new Database({
  adapter,
  modelClasses: [Treino, ItemTreinoLocal, RegistroExecucao],
})

export function colecoes() {
  return {
    treinos: database.get<Treino>('treinos'),
    itens: database.get<ItemTreinoLocal>('itens_treino'),
    registros: database.get<RegistroExecucao>('registros_execucao'),
  }
}

export type { Treino, ItemTreinoLocal, RegistroExecucao }
