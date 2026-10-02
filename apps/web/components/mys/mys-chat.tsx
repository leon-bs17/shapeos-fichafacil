'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, ArrowUpRight, Check, Copy, Dumbbell, LoaderCircle, MessageCircle, Plus, RotateCcw, ShieldCheck, Square, Users, X } from 'lucide-react'
import type { MysMessage, MysRole } from '@/lib/mys/contract'
import s from './mys.module.css'

type Message = MysMessage & { id: string; truncated?: boolean }
const prompts = {
  ADMIN: [
    { icon: ShieldCheck, title: 'Uma gestão mais clara', text: 'Quais indicadores devo acompanhar na gestão de uma academia?' },
    { icon: Users, title: 'Melhore a experiência', text: 'Como organizar uma boa jornada de acompanhamento para os alunos?' },
    { icon: MessageCircle, title: 'Resuma informações', text: 'Quero resumir informações da operação. Me ajude a organizar os dados que preciso fornecer.' },
    { icon: Dumbbell, title: 'Converse sobre academia', text: 'Quais práticas ajudam a incentivar a consistência nos treinos?' },
  ],
  PERSONAL: [
    { icon: Dumbbell, title: 'Planeje um treino', text: 'Me ajude a planejar um treino. Quais informações do aluno você precisa?' },
    { icon: RotateCcw, title: 'Revise uma ficha', text: 'Quero revisar uma ficha de treino. Me diga o que preciso compartilhar para você analisar.' },
    { icon: Users, title: 'Acompanhe seu aluno', text: 'Como avaliar a evolução de um aluno além do peso na balança?' },
    { icon: MessageCircle, title: 'Prepare uma orientação', text: 'Me ajude a escrever uma mensagem acolhedora para um aluno que perdeu a rotina de treinos.' },
  ],
}

function MysMark({ small = false }: { small?: boolean }) {
  return <span className={small ? s.smallMark : s.mark} aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M7 29V11L20 25L33 11V29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 31L20 25L26 31" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
}

// Text-only rendering: model content never becomes raw HTML or executable links.
function Answer({ content }: { content: string }) {
  return <div className={s.answer}>{content.split('\n').map((line, index) => {
    const heading = /^#{1,4}\s/.test(line)
    const text = line.replace(/^#{1,4}\s+/, '')
    const parts = text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)
    return heading ? <h3 key={index}>{parts}</h3> : <p key={index}>{parts.length === 1 && parts[0] === '' ? '\u00a0' : parts}</p>
  })}</div>
}

export function MysChat({ role, name, configured }: { role: MysRole; name: string; configured: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [notice, setNotice] = useState('')
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstName = name.trim().split(/\s+/)[0] || 'vamos começar'
  const admin = role === 'ADMIN'
  useEffect(() => () => { controller.current?.abort(); if (copyTimer.current) clearTimeout(copyTimer.current) }, [])
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }) }, [messages, loading])

  async function send(retry = false) {
    if (busy.current || !configured) return
    const previous = retry ? messages.slice(0, -1) : messages
    const text = retry ? messages.at(-1)?.content || '' : draft.trim()
    if (!text || text.length > 2000) return
    if (!retry && messages.at(-1)?.role === 'user') return
    const next: Message[] = [...previous, { role: 'user', content: text, id: crypto.randomUUID() }]
    // Retain the latest nine completed exchanges plus this request.
    const context = next.slice(-19).map(({ role, content }) => ({ role, content }))
    setMessages(next); setDraft(''); setError(''); setNotice(''); setLoading(true); busy.current = true
    const abort = new AbortController()
    controller.current = abort
    try {
      const response = await fetch('/api/mys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: context }), signal: abort.signal })
      if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Sua sessão não foi reconhecida. Atualize a página e entre novamente se necessário.')
      }
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível enviar a mensagem.')
      if (typeof result.message !== 'string') throw new Error('A Mys não retornou uma resposta válida.')
      setMessages([...next, { role: 'assistant', content: result.message, id: crypto.randomUUID(), truncated: Boolean(result.truncated) }])
    } catch (error) {
      if (abort.signal.aborted) setError('Resposta interrompida. Você pode tentar novamente ou editar a pergunta.')
      else setError(error instanceof Error ? error.message : 'Não foi possível conectar à Mys.')
    } finally { busy.current = false; setLoading(false); controller.current = null }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send() }
  function clear() { setMessages([]); setDraft(''); setError(''); setNotice('Nova conversa iniciada.'); setConfirmClear(false); input.current?.focus() }
  function editQuestion() { setDraft(messages.at(-1)?.content || ''); setMessages(messages.slice(0,-1)); setError(''); input.current?.focus() }
  function choose(text: string) { setDraft(text); input.current?.focus() }
  async function copy(message: Message) {
    try { await navigator.clipboard.writeText(message.content); setCopied(message.id); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 2000) }
    catch { setNotice('Não foi possível copiar automaticamente. Selecione o texto da resposta para copiar.') }
  }

  return <section className={s.workspace} aria-label="Mys, assistente ShapeOS">
    <header className={s.header}><div className={s.identity}><MysMark small/><div><h1>Mys<span>Assistente ShapeOS</span></h1><p>{admin ? 'Gestão, academia e novas perspectivas.' : 'Mais clareza para planejar e acompanhar.'}</p></div></div><button className={s.newChat} disabled={loading} onClick={() => messages.length ? setConfirmClear(true) : clear()}><Plus size={16}/><span>Nova conversa</span></button></header>
    <div className={s.contextBar}><span><span className={s.dot}/>{admin ? 'Espaço do administrador' : 'Espaço do personal'}</span><span className={s.connectionState}>{configured ? 'Pronta para conversar' : 'Aguardando conexão'}</span></div>
    <div className={s.chatPanel}>
      <div className={s.thread} role="log" aria-label="Conversa com a Mys" aria-live="polite" aria-relevant="additions" aria-busy={loading}>
        {!messages.length ? <div className={s.welcome}><div className={s.welcomeBrand}><MysMark/><span>mys<span className={s.brandDot}>.</span></span></div><p className={s.greeting}>Olá, {firstName}.</p><h2>{admin ? <>Um novo olhar<br/>para sua gestão.</> : <>Seu conhecimento.<br/>Uma força a mais.</>}</h2><p className={s.intro}>{admin ? 'Converse sobre academia, organize ideias e transforme informações em próximos passos.' : 'Explore ideias de treino, prepare orientações e pense no próximo passo de cada aluno.'}</p><div className={s.suggestions}>{prompts[role].map(({ icon: Icon, title, text }) => <button key={title} onClick={() => choose(text)}><Icon size={18}/><span>{title}</span><ArrowUpRight size={15}/></button>)}</div></div> : <div className={s.messages}>{messages.map(message => <article key={message.id} className={message.role === 'user' ? s.userMessage : s.assistantMessage} aria-label={message.role === 'user' ? 'Sua mensagem' : 'Resposta da Mys'}>{message.role === 'assistant' && <div className={s.answerIdentity}><MysMark small/><span>Mys</span></div>}<div className={s.bubble}>{message.role === 'assistant' ? <Answer content={message.content}/> : <p>{message.content}</p>}</div>{message.role === 'assistant' && <div className={s.answerActions}><button onClick={() => void copy(message)} aria-label={copied === message.id ? 'Resposta copiada' : 'Copiar resposta'}>{copied === message.id ? <Check size={14}/> : <Copy size={14}/>} {copied === message.id ? 'Copiado' : 'Copiar'}</button>{message.truncated && <span>Resposta atingiu o limite. Peça para continuar.</span>}</div>}</article>)}</div>}
        {loading && <div className={s.thinking} role="status"><MysMark small/><LoaderCircle size={15} className={s.spin}/><span>Mys está preparando uma resposta…</span></div>}
        <div ref={end}/>
      </div>
      <div className={s.composerArea}>
        {confirmClear && <div className={s.confirm} role="alert"><span>Começar outra conversa? As mensagens atuais serão descartadas.</span><button onClick={clear}>Começar</button><button onClick={() => setConfirmClear(false)} aria-label="Manter conversa"><X size={16}/></button></div>}
        {!configured && <div className={s.setup}><span className={s.dot}/><p>A Mys está sendo conectada. Você já pode explorar as sugestões e preparar sua primeira pergunta.</p></div>}
        {error && <div className={s.error} role="alert"><p>{error}</p><div><button onClick={() => void send(true)}><RotateCcw size={14}/> Tentar novamente</button><button onClick={editQuestion}>Editar pergunta</button></div></div>}
        {notice && <p className={s.notice} role="status">{notice}</p>}
        <form className={s.composer} onSubmit={submit}><label className={s.srOnly} htmlFor="mys-message">Mensagem para a Mys</label><textarea id="mys-message" ref={input} rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder={admin ? 'O que vamos organizar hoje?' : 'O que vamos desenvolver hoje?'} disabled={loading || Boolean(error)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }}/><div className={s.composerBottom}><span><MessageCircle size={13}/><span>Conversa temporária</span></span><div><span className={s.count}>{draft.length}/2000</span>{loading ? <button className={s.send} type="button" onClick={() => controller.current?.abort()} aria-label="Interromper resposta"><Square size={16}/></button> : <button className={s.send} type="submit" disabled={!configured || !draft.trim() || Boolean(error)} aria-label="Enviar mensagem"><ArrowUp size={19}/></button>}</div></div></form>
        <p className={s.footnote}>Mys pode cometer erros. Revise as sugestões antes de aplicar.</p>
      </div>
    </div>
    <details className={s.scope}><summary>O que a Mys pode fazer neste espaço?</summary><p>{admin ? 'Apoiar a gestão da academia, explicar conceitos de treinamento e resumir informações que você compartilhar.' : 'Ajudar com planejamento, revisão de treinos e acompanhamento a partir das informações que você compartilhar.'} Nesta etapa, os dados da plataforma ainda não são consultados automaticamente. A Mys não altera fichas nem contas. As mensagens são enviadas à DeepSeek e ficam visíveis nesta página até você sair ou iniciar outra conversa.</p></details>
  </section>
}
