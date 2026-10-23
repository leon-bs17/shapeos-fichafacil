import { api, dbError, json } from '@/lib/api/fitness'
import { modelAccess, workoutModel } from '@/lib/api/workout-models'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { return api(async () => {
  return json({ data: await workoutModel(await modelAccess(request), (await context.params).id) })
}) }

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { return api(async () => {
  const a = await modelAccess(request, true), { id } = await context.params
  await workoutModel(a, id)
  const { error } = await a.db.from('modelos_treino').delete().eq('id', id).eq('personal_id', a.id)
  dbError(error)
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}) }
