import { api, ApiError, body, dbError, json, validate, workout } from '@/lib/api/fitness'
import { modelAccess, modelQuery, saveModelSchema, workoutModel } from '@/lib/api/workout-models'

export async function GET(request: Request) { return api(async () => {
  const a = await modelAccess(request)
  const raw = new URL(request.url).searchParams.get('pagina') ?? '0'
  if (!/^\d{1,5}$/.test(raw) || Number(raw) > 10000) throw new ApiError(400, 'Página inválida.')
  const page = Number(raw), size = 20
  const { data, error } = await modelQuery(a).order('criado_em', { ascending: false }).order('id', { ascending: false }).range(page * size, page * size + size)
  dbError(error)
  return json({ data: { modelos: (data ?? []).slice(0, size), proximaPagina: (data?.length ?? 0) > size ? page + 1 : null } })
}) }

export async function POST(request: Request) { return api(async () => {
  const a = await modelAccess(request, true), input = validate(saveModelSchema, await body(request))
  await workout(a, input.ficha_id)
  const { data: id, error } = await a.db.rpc('salvar_modelo_de_ficha', { p_ficha_id: input.ficha_id, p_titulo: input.titulo.trim() })
  dbError(error)
  return json({ data: await workoutModel(a, id) }, 201, { Location: `/api/modelos-treino/${id}` })
}) }
