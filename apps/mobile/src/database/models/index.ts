import Treino from './Treino'
import { ItemTreinoLocal } from './ItemTreino'
import RegistroExecucao from './RegistroExecucao'

export const models = {
  treinos: Treino,
  itens_treino: ItemTreinoLocal,
  registros_execucao: RegistroExecucao,
}

export type ModelsMap = typeof models

export { Treino, ItemTreinoLocal, RegistroExecucao }
