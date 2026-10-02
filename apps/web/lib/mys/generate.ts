import { mysInstructions, type MysMessage, type MysRole } from './contract'
import { mysDataTools } from './data-tools'

type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }
type ProviderMessage = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }
export class MysProviderError extends Error {
  constructor(public status: number) { super('Provider request failed') }
}

export async function generateMysReply(options: {
  key: string; model: string; role: MysRole; messages: MysMessage[]; signal: AbortSignal
  reader: { run(name: string, raw: string): Promise<string>; sources: Set<string> }
}) {
  const conversation: ProviderMessage[] = [{ role: 'system', content: mysInstructions(options.role) }, ...options.messages]
  let calls = 0, dataBytes = 0
  for (let round = 0; round <= 3; round++) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method:'POST', headers: { Authorization:`Bearer ${options.key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: options.model, messages: conversation, tools: mysDataTools, tool_choice: round === 3 || calls >= 6 ? 'none' : 'auto', max_tokens:1800, thinking:{ type:'disabled' }, stream:false }),
      cache:'no-store', signal: options.signal,
    })
    if (!response.ok) throw new MysProviderError(response.status)
    const result = await response.json()
    const message = result?.choices?.[0]?.message
    const toolCalls = message?.tool_calls
    if (!Array.isArray(toolCalls) || !toolCalls.length) {
      if (typeof message?.content !== 'string' || !message.content.trim()) throw new MysProviderError(502)
      return { message: message.content.trim(), truncated: result.choices[0].finish_reason === 'length', sources: [...options.reader.sources], consultedAt: options.reader.sources.size ? new Date().toISOString() : null }
    }
    if (round === 3 || toolCalls.length > 6 || toolCalls.some(call => typeof call.id !== 'string' || call.id.length > 100 || call.type !== 'function' || typeof call.function?.name !== 'string' || typeof call.function?.arguments !== 'string')) throw new MysProviderError(502)
    conversation.push({ role:'assistant', content: typeof message.content === 'string' ? message.content : null, tool_calls:toolCalls })
    for (const call of toolCalls) {
      // Preserve the provider protocol even when refusing an excess tool call.
      const content = calls++ >= 6 || dataBytes >= 60000 ? JSON.stringify({ erro:'Limite de consultas desta resposta atingido. Peça uma consulta mais específica.' }) : await options.reader.run(call.function.name, call.function.arguments)
      dataBytes += content.length
      conversation.push({ role:'tool', tool_call_id:call.id, content })
    }
  }
  throw new MysProviderError(502)
}
