import { access, api, dbError, json } from '@/lib/api/fitness'

export async function GET(request: Request) { return api(async () => {
  const a = await access(request), url = new URL(request.url)
  const name = url.searchParams.get('q')?.trim().slice(0, 80), group = url.searchParams.get('grupo')?.trim().slice(0, 80)
  const exercises: { id: string; nome: string; grupo_muscular: string; video_url: string | null; equipamento: string | null; proprio: boolean }[] = []
  for (;;) {
    let query = a.db.from('exercicios').select('id,nome,grupo_muscular,video_url,equipamento,criado_por').order('nome').order('id')
    if (name) query = query.ilike('nome', `%${name.replace(/[\\%_]/g, '\\$&')}%`)
    if (group) query = query.eq('grupo_muscular', group)
    const { data, error } = await query.range(exercises.length, exercises.length + 199)
    dbError(error)
    if (!data?.length) break
    exercises.push(...data.map(({ criado_por, ...exercise }) => ({ ...exercise, proprio: criado_por === a.id })))
  }
  return json({ data: exercises })
}) }
