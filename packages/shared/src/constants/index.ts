export const GRUPOS_MUSCULARES = [
  'Peito',
  'Costas',
  'Pernas',
  'Glúteos',
  'Ombros',
  'Braços',
  'Abdômen',
  'Panturrilha',
  'Cardio',
] as const

export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number]

export const EQUIPAMENTOS = [
  'Barra',
  'Halteres',
  'Máquina',
  'Cabo',
  'Peso Corporal',
  'Kettlebell',
  'Elástico',
] as const

export type Equipamento = (typeof EQUIPAMENTOS)[number]

export const DESCANSO_PADRAO_SEGUNDOS = 60

export const STATUS_VINCULO = {
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
} as const
