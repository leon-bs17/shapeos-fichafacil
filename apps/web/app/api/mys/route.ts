import { NextResponse } from 'next/server'
import { getMysAccess } from '@/lib/mys/access'
import { mysInstructions, parseMessages } from '@/lib/mys/contract'

export const runtime = 'nodejs'
export const maxDuration = 60

// Burst protection per server instance. A shared usage quota belongs to the next
// data integration phase; this is not a global billing limit.
const requests = new Map<string, { started: number; count: number }>()
function acceptRequest(id: string) {
  const now = Date.now()
  for (const [key, value] of requests) if (now - value.started >= 60000) requests.delete(key)
  const record = requests.get(id)
  if (record && record.count >= 8) return false
  if (record) record.count++
  else requests.set(id, { started: now, count: 1 })
  return true
}

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return failure('Origem inválida.', 403)
  const access = await getMysAccess()
  if (!access) return failure('A Mys está disponível para administradores e personals com conta ativa. Entre novamente.', 403)
  const key = process.env.DEEPSEEK_API_KEY?.trim()
  if (!key) return failure('A conexão da Mys ainda não foi configurada. Tente novamente após a ativação.', 503)
  if (!request.headers.get('content-type')?.includes('application/json')) return failure('Formato de mensagem inválido.', 400)
  let messages
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
    messages = parseMessages(JSON.parse(body))
  } catch (error) { return failure(error instanceof SyntaxError ? 'Pedido inválido.' : error instanceof Error ? error.message : 'Mensagem inválida.', 400) }
  if (!acceptRequest(access.id)) return failure('Você enviou várias mensagens em sequência. Aguarde um minuto.', 429)
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-flash', messages: [{ role: 'system', content: mysInstructions(access.role) }, ...messages], max_tokens: 1800, thinking: { type: 'disabled' }, stream: false }),
      cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(50000)]),
    })
    if (!response.ok) {
      if (response.status === 429) return failure('A Mys está recebendo muitas solicitações. Tente novamente em instantes.', 429)
      if ([401,402,403].includes(response.status)) return failure('A conexão da Mys precisa ser revisada pelo administrador.', 503)
      return failure('Não foi possível receber uma resposta. Tente novamente.', 502)
    }
    const result = await response.json()
    const content = result?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) return failure('A Mys não retornou uma resposta. Tente novamente.', 502)
    return NextResponse.json({ message: content.trim(), truncated: result.choices[0].finish_reason === 'length' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (request.signal.aborted) return failure('Geração interrompida.', 499)
    return failure(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'A resposta demorou mais que o esperado. Tente novamente.' : 'Não foi possível conectar à Mys. Tente novamente.', 504)
  }
}
