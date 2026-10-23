import { ApiError, uuid } from '@/lib/api/fitness'
export interface NoticeDraft { id: string; titulo: string; mensagem: string; alunos: string[] }
export interface NoticeRecipient { id: string; nome: string; email: string }
export interface SentNotice { envio_id: string; titulo: string; mensagem: string; criado_em: string; destinatarios: number; leituras: number; alunos: { aluno_id: string; nome: string; lida_em: string | null }[] }
export function parseNoticeDraft(input: unknown): NoticeDraft {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Revise o comunicado.')
  const body = input as Record<string, unknown>
  if (Object.keys(body).some(key => !['id', 'titulo', 'mensagem', 'alunos'].includes(key)) || typeof body.id !== 'string' || typeof body.titulo !== 'string' || typeof body.mensagem !== 'string' || !Array.isArray(body.alunos)) throw new ApiError(400, 'Formato de comunicado inválido.')
  const titulo = body.titulo.trim(), mensagem = body.mensagem.trim()
  if (titulo.length < 3 || titulo.length > 120 || !mensagem || mensagem.length > 4000) throw new ApiError(400, 'Use um título de 3 a 120 caracteres e uma mensagem de até 4.000 caracteres.')
  if (!body.alunos.length || body.alunos.length > 100 || body.alunos.some(id => typeof id !== 'string')) throw new ApiError(400, 'Selecione de 1 a 100 alunos.')
  const alunos = (body.alunos as string[]).map(id => uuid(id).toLowerCase()).sort()
  if (new Set(alunos).size !== alunos.length) throw new ApiError(400, 'Há destinatários repetidos.')
  return { id: uuid(body.id).toLowerCase(), titulo, mensagem, alunos }
}
