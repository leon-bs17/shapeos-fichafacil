export interface ExercicioTemplate {
  nome: string
  series: number
  repeticoes: string
  descanso_segundos: number
}

export interface TemplateFicha {
  id: string
  titulo: string
  descricao: string
  exercicios: ExercicioTemplate[]
}

export type TipoTreino = 'hipertrofia' | 'emagrecer' | 'condicionamento'

export interface InfoTipoTreino {
  id: TipoTreino
  titulo: string
  descricao: string
  icone: string
  ajustes: {
    seriesDelta: number
    repeticoes: string
    descanso_segundos: number
  }
}

export const TIPOS_TREINO: InfoTipoTreino[] = [
  {
    id: 'hipertrofia',
    titulo: 'Hipertrofia',
    descricao: 'Carga moderada-alta, 8-12 reps, descanso médio',
    icone: '💪',
    ajustes: {
      seriesDelta: 0,
      repeticoes: '',
      descanso_segundos: 0,
    },
  },
  {
    id: 'emagrecer',
    titulo: 'Emagrecimento',
    descricao: 'Carga leve, 12-20 reps, descanso curto, mais series',
    icone: '🔥',
    ajustes: {
      seriesDelta: 1,
      repeticoes: '12-20',
      descanso_segundos: -30,
    },
  },
  {
    id: 'condicionamento',
    titulo: 'Condicionamento',
    descricao: 'Carga leve, muitas reps, descanso mínimo',
    icone: '🫀',
    ajustes: {
      seriesDelta: 0,
      repeticoes: '15-25',
      descanso_segundos: -45,
    },
  },
]

export function aplicarTipoTreino(
  exercicios: ExercicioTemplate[],
  tipo: TipoTreino
): ExercicioTemplate[] {
  const info = TIPOS_TREINO.find((t) => t.id === tipo)
  if (!info || tipo === 'hipertrofia') return exercicios

  return exercicios.map((ex) => ({
    ...ex,
    series: Math.max(2, ex.series + info.ajustes.seriesDelta),
    repeticoes: info.ajustes.repeticoes || ex.repeticoes,
    descanso_segundos: Math.max(15, ex.descanso_segundos + info.ajustes.descanso_segundos),
  }))
}

export const TEMPLATES: TemplateFicha[] = [
  {
    id: 'push-pull-legs',
    titulo: 'Push / Pull / Legs',
    descricao: '3 dias — Peito/Ombro/Tríceps · Costas/Bíceps · Pernas',
    exercicios: [
      { nome: 'Supino Reto', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Supino Inclinado', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Crucifixo Máquina', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
      { nome: 'Desenvolvimento Halteres', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Elevação Lateral', series: 4, repeticoes: '12-15', descanso_segundos: 45 },
      { nome: 'Tríceps Corda', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
    ],
  },
  {
    id: 'abc',
    titulo: 'ABC (A/B/C)',
    descricao: '3 dias — Peito+Tríceps · Costas+Bíceps · Pernas+Ombros',
    exercicios: [
      { nome: 'Supino Reto', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Supino Inclinado', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Paralelas', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Tríceps Francês', series: 3, repeticoes: '10-12', descanso_segundos: 60 },
      { nome: 'Tríceps Corda', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
    ],
  },
  {
    id: 'full-body',
    titulo: 'Full Body',
    descricao: '3 dias — Treino corpo inteiro',
    exercicios: [
      { nome: 'Agachamento Livre', series: 4, repeticoes: '8-10', descanso_segundos: 120 },
      { nome: 'Supino Reto', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Remada Curvada', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Desenvolvimento Halteres', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Leg Press 45', series: 3, repeticoes: '10-12', descanso_segundos: 90 },
      { nome: 'Prancha Isométrica', series: 3, repeticoes: '30-45s', descanso_segundos: 45 },
    ],
  },
  {
    id: 'upper-lower',
    titulo: 'Upper / Lower',
    descricao: '4 dias — Upper (superior) · Lower (inferior)',
    exercicios: [
      { nome: 'Supino Reto', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Remada Curvada', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Desenvolvimento Halteres', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Puxada Frontal', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Rosca Direta', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
      { nome: 'Tríceps Corda', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
    ],
  },
  {
    id: 'pernas-gluteos',
    titulo: 'Pernas & Glúteos',
    descricao: 'Foco em pernas e glúteos',
    exercicios: [
      { nome: 'Agachamento Livre', series: 4, repeticoes: '8-10', descanso_segundos: 120 },
      { nome: 'Leg Press 45', series: 4, repeticoes: '10-12', descanso_segundos: 90 },
      { nome: 'Cadeira Extensora', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
      { nome: 'Mesa Flexora', series: 3, repeticoes: '12-15', descanso_segundos: 60 },
      { nome: 'Elevação Pélvica', series: 4, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Panturrilha em Pé', series: 4, repeticoes: '15-20', descanso_segundos: 45 },
    ],
  },
  {
    id: 'costas-biceps',
    titulo: 'Costas & Bíceps',
    descricao: 'Foco em costas e bíceps',
    exercicios: [
      { nome: 'Barra Fixa', series: 4, repeticoes: '6-10', descanso_segundos: 90 },
      { nome: 'Remada Curvada', series: 4, repeticoes: '8-10', descanso_segundos: 90 },
      { nome: 'Puxada Frontal', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Remada Baixa', series: 3, repeticoes: '10-12', descanso_segundos: 75 },
      { nome: 'Rosca Alternada', series: 3, repeticoes: '10-12', descanso_segundos: 60 },
      { nome: 'Rosca Direta', series: 3, repeticoes: '12-15', descanso_segundos: 45 },
    ],
  },
]
