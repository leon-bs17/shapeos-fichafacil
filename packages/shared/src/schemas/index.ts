import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const itemTreinoSchema = z.object({
  exercicio_id: z.string().uuid(),
  series: z.number().int().min(1).max(30),
  repeticoes: z.string().min(1).max(20),
  descanso_segundos: z.number().int().min(0).max(900),
  ordem: z.number().int().min(0),
})

export type ItemTreinoInput = z.infer<typeof itemTreinoSchema>

export const dataCalendarioSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').refine(value => {
  const date = new Date(`${value}T00:00:00Z`)
  return Number(value.slice(0, 4)) >= 1 && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Informe uma data válida')

export const criarTreinoSchema = z.object({
  aluno_id: z.string().uuid(),
  titulo: z.string().min(3, 'Título muito curto').max(80),
  valida_ate: dataCalendarioSchema.nullable().optional(),
  itens: z.array(itemTreinoSchema).min(1, 'Adicione ao menos um exercício'),
})

export type CriarTreinoInput = z.infer<typeof criarTreinoSchema>

export const registroExecucaoSchema = z.object({
  item_treino_id: z.string().uuid(),
  carga_utilizada: z.number().nonnegative().nullable(),
  repeticoes_feitas: z.number().int().positive().nullable(),
  data_registro: z.string().datetime(),
})

export type RegistroExecucaoInput = z.infer<typeof registroExecucaoSchema>

export const vincularAlunoSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

