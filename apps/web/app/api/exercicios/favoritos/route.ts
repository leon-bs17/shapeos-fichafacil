import { access, api, ApiError, dbError, json } from '@/lib/api/fitness'

export async function GET(request: Request) { return api(async () => {
  const a = await access(request)
  if (a.role !== 'PERSONAL') throw new ApiError(403, 'Favoritos são exclusivos da conta do Personal.')
  const ids: string[] = []
  for (;;) {
    const { data, error } = await a.db.from('exercicios_favoritos').select('exercicio_id')
      .eq('personal_id', a.id).order('exercicio_id').range(ids.length, ids.length + 199)
    dbError(error)
    if (!data) throw new ApiError(500, 'Não foi possível carregar os favoritos.')
    if (!data.length) break
    ids.push(...data.map(row => row.exercicio_id))
  }
  return json({ data: ids })
}) }
