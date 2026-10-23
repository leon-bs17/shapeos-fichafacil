import { api, ApiError, body, dbError, duplicateSchema, json, validate, workout } from '@/lib/api/fitness'
import { modelAccess, workoutModel } from '@/lib/api/workout-models'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return api(async () => {
  const a = await modelAccess(request, true), { id } = await context.params
  await workoutModel(a, id)
  const input = validate(duplicateSchema, await body(request))
  const { data: created, error } = await a.db.rpc('aplicar_modelo_treino', { p_modelo_id: id, p_aluno_id: input.aluno_id, p_titulo: input.titulo?.trim() ?? null })
  if (error?.code === '23503') throw new ApiError(409, 'Um exercício deste modelo não está mais disponível. Salve um novo modelo a partir de uma ficha atualizada.')
  dbError(error)
  return json({ data: await workout(a, created) }, 201, { Location: `/api/treinos/${created}` })
}) }
