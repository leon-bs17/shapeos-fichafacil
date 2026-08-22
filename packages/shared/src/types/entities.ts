export type TipoUsuario = 'PERSONAL' | 'ALUNO'

export type StatusVinculo = 'ATIVO' | 'INATIVO'

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo: TipoUsuario
  criado_em: string
}

export interface PersonalAluno {
  id: string
  personal_id: string
  aluno_id: string
  status: StatusVinculo
  criado_em: string
}

export interface Exercicio {
  id: string
  nome: string
  grupo_muscular: string
  video_url: string | null
  equipamento: string | null
}

export interface Treino {
  id: string
  aluno_id: string
  personal_id: string
  titulo: string
  ativo: boolean
  criado_em: string
}

export interface ItemTreino {
  id: string
  treino_id: string
  exercicio_id: string
  series: number
  repeticoes: string
  descanso_segundos: number
  ordem: number
}

export interface RegistroExecucao {
  id: string
  aluno_id: string
  item_treino_id: string
  carga_utilizada: number | null
  repeticoes_feitas: number | null
  data_registro: string
}

export type ItemTreinoComExercicio = ItemTreino & {
  exercicio: Exercicio
}

export type FichaCompleta = Treino & {
  itens: ItemTreinoComExercicio[]
}
