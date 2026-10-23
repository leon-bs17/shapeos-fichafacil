import { access, api, ApiError, body, dbError, json } from '@/lib/api/fitness'
import { parseNoticeDraft, type NoticeRecipient } from '@/lib/fitness/personal-notice'

export async function GET(request: Request) { return api(async () => {
  const a = await access(request)
  if (a.role !== 'PERSONAL') throw new ApiError(403, 'Área exclusiva do Personal.')
  const url = new URL(request.url)
  if (url.searchParams.get('destinatarios') === '1') {
    const students: NoticeRecipient[] = []
    for (;;) {
      const { data, error } = await a.db.from('personal_alunos').select('aluno:usuarios!personal_alunos_aluno_id_fkey!inner(id,nome,email)')
        .eq('personal_id', a.id).eq('status', 'ATIVO').eq('aluno.status_conta', 'ATIVO').eq('aluno.tipo', 'ALUNO')
        .order('aluno_id').range(students.length, students.length + 199)
      dbError(error)
      if (!data) throw new ApiError(500, 'Não foi possível carregar os destinatários.')
      if (!data.length) break
      for (const row of data) {
        const student = Array.isArray(row.aluno) ? row.aluno[0] : row.aluno
        if (!student) throw new ApiError(500, 'Destinatário indisponível. Atualize a lista.')
        students.push(student as NoticeRecipient)
      }
    }
    return json({ data: students.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) })
  }
  const page = Number(url.searchParams.get('pagina') ?? '1')
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new ApiError(400, 'Página inválida.')
  const { data, count, error } = await a.db.from('personal_comunicados_enviados')
    .select('envio_id,titulo,mensagem,criado_em,destinatarios,leituras,alunos', { count: 'exact' }).eq('personal_id', a.id)
    .order('criado_em', { ascending: false }).order('envio_id', { ascending: false }).range((page - 1) * 10, page * 10 - 1)
  dbError(error)
  if (!data || count == null) throw new ApiError(500, 'Não foi possível carregar seus envios.')
  return json({ data: { items: data, total: count, page } })
}) }
export async function POST(request: Request) { return api(async () => {
  const a = await access(request, true), draft = parseNoticeDraft(await body(request))
  const { data, error } = await a.db.rpc('publicar_comunicado_personal', { p_envio_id: draft.id, p_titulo: draft.titulo, p_mensagem: draft.mensagem, p_alunos: draft.alunos })
  if (error?.code === '42501') throw new ApiError(403, 'Revise os destinatários: todos precisam de vínculo ativo e conta liberada.')
  if (error?.code === '22023') throw new ApiError(400, 'O conteúdo ou os destinatários mudaram. Revise a prévia antes de publicar.')
  dbError(error)
  if (typeof data !== 'number' || data !== draft.alunos.length) throw new ApiError(500, 'Não foi possível confirmar o envio. Tente novamente pela mesma prévia.')
  return json({ data: { id: draft.id, total: data } }, 201)
}) }
