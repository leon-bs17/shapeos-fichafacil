import { NextResponse } from 'next/server'
import { getMysAccess } from '@/lib/mys/access'
import { parseMessages, parseMysStudent } from '@/lib/mys/contract'
import { createClient } from '@/lib/supabase/server'
import { createMysDataReader } from '@/lib/mys/data-tools'
import { generateMysReply, MysProviderError } from '@/lib/mys/generate'

export const runtime = 'nodejs'
export const maxDuration = 60

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const access = await getMysAccess()
  if (!access) return failure('Entre na sua conta para acessar a Mys.', 403)
  return NextResponse.json({ configured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()), role: access.role }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return failure('Origem inválida.', 403)
  const access = await getMysAccess()
  if (!access) return failure('A Mys está disponível para contas ativas da ShapeOS. Entre novamente.', 403)
  const key = process.env.DEEPSEEK_API_KEY?.trim()
  if (!key) return failure('A conexão da Mys ainda não foi configurada. Tente novamente após a ativação.', 503)
  if (!request.headers.get('content-type')?.includes('application/json')) return failure('Formato de mensagem inválido.', 400)
  let messages, studentId: string | undefined
  try {
    // Bound the body while reading, including requests without Content-Length.
    const reader = request.body?.getReader()
    if (!reader) return failure('Mensagem vazia.', 400)
    const decoder = new TextDecoder()
    let body = '', bytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > 128000) { await reader.cancel(); return failure('Conversa muito longa. Inicie outra.', 413) }
        body += decoder.decode(value, { stream: true })
      }
    } finally { reader.releaseLock() }
    body += decoder.decode()
    const parsed = JSON.parse(body)
    messages = parseMessages(parsed)
    studentId = parseMysStudent(parsed)
  } catch (error) { return failure(error instanceof SyntaxError ? 'Pedido inválido.' : error instanceof Error ? error.message : 'Mensagem inválida.', 400) }
  if (studentId && access.role !== 'PERSONAL') return failure('Seleção de aluno disponível na conta do Personal.', 403)
  const db = await createClient()
  const { data: quota, error: quotaError } = await db.rpc('consumir_cota_mys')
  if (quotaError || !quota || typeof quota.permitido !== 'boolean') return failure('Não foi possível verificar a disponibilidade da Mys. Tente novamente.', 503)
  if (!quota.permitido) return NextResponse.json({ error: quota.motivo === 'minuto'
    ? 'Você enviou várias mensagens em sequência. Aguarde um minuto.'
    : 'O limite diário da Mys foi atingido. Tente novamente amanhã.' },
    { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(Math.max(1, Number(quota.retry_after) || 60)) } })
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(50000)])
    const reader = createMysDataReader(db, access, signal, studentId)
    let studentContext
    if (studentId) {
      const context = await reader.run('resumir_acompanhamento', JSON.stringify({ aluno_id: studentId }))
      const parsed = JSON.parse(context)
      if (parsed.erro) return failure(parsed.erro, parsed.status === 403 ? 403 : 503)
      studentContext = { id: studentId, result: context }
    }
    const result = await generateMysReply({ key, model: process.env.DEEPSEEK_MODEL || 'deepseek-flash', role: access.role, messages, signal, reader, studentContext })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof MysProviderError) {
      if (error.status === 429) return failure('A Mys está recebendo muitas solicitações. Tente novamente em instantes.', 429)
      if ([401,402,403].includes(error.status)) return failure('A conexão da Mys precisa ser revisada pelo administrador.', 503)
      return failure('Não foi possível receber uma resposta. Tente novamente.', 502)
    }
    if (request.signal.aborted) return failure('Geração interrompida.', 499)
    return failure(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'A resposta demorou mais que o esperado. Tente novamente.' : 'Não foi possível conectar à Mys. Tente novamente.', 504)
  }
}

