import { access, api, ApiError, dbError, json, uuid } from '@/lib/api/fitness'

type Context = { params: Promise<{ id: string }> }
export async function PUT(request: Request, context: Context) { return api(async () => {
  const a = await access(request, true), id = uuid((await context.params).id)
  const { data: exercise, error: exerciseError } = await a.db.from('exercicios').select('id').eq('id', id).maybeSingle()
  dbError(exerciseError)
  if (!exercise) throw new ApiError(404, 'Exercício não encontrado.')
  const { error } = await a.db.from('exercicios_favoritos').upsert({ personal_id: a.id, exercicio_id: id }, {
    onConflict: 'personal_id,exercicio_id', ignoreDuplicates: true,
  })
  dbError(error)
  return json({ data: { id, favorite: true } })
}) }
export async function DELETE(request: Request, context: Context) { return api(async () => {
  const a = await access(request, true), id = uuid((await context.params).id)
  const { error } = await a.db.from('exercicios_favoritos').delete().eq('personal_id', a.id).eq('exercicio_id', id)
  dbError(error)
  return json({ data: { id, favorite: false } })
}) }
