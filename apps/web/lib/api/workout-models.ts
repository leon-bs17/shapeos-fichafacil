import { access, ApiError, createSchema, dbError, uuid } from '@/lib/api/fitness'

export const saveModelSchema = createSchema.pick({ titulo: true }).extend({ ficha_id: createSchema.shape.aluno_id }).strict()
export async function modelAccess(request: Request, write = false) {
  const a = await access(request, write)
  if (a.role !== 'PERSONAL') throw new ApiError(403, 'Somente o Personal pode acessar seus modelos de treino.')
  return a
}
export function modelQuery(a: Awaited<ReturnType<typeof modelAccess>>) {
  return a.db.from('modelos_treino').select('id,titulo,quantidade_exercicios,criado_em').eq('personal_id', a.id)
}
export async function workoutModel(a: Awaited<ReturnType<typeof modelAccess>>, id: string) {
  const { data, error } = await modelQuery(a).eq('id', uuid(id)).maybeSingle()
  dbError(error)
  if (!data) throw new ApiError(404, 'Modelo não encontrado.')
  return data
}
