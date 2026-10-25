'use client'

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, ArrowUpRight, ChartColumn, CircleCheck, Check, Copy, Dumbbell, MessageCircle, Plus, RotateCcw, ShieldCheck, Square, Users, X, Database, ChevronDown, Activity, CheckCheck } from 'lucide-react'
import type { MysMessage, MysRole } from '@/lib/mys/contract'
import { MessageResponse } from '@/components/ai-elements/message'
import type { MysDataCard } from '@/lib/mys/data-cards'
import { MysWelcomeWireframe } from './mys-welcome-wireframe'
import s from './mys.module.css'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { NotificationBell } from '@/components/layout/notification-bell'
import { MysStudentPicker, type MysSelectedStudent } from './mys-student-picker'

type Message = MysMessage & { id: string; truncated?: boolean; sources?: string[]; consultedAt?: string; cards?: MysDataCard[] }
const prompts = {
  ADMIN: [
    { icon: CircleCheck, title: 'Revisar aprovações', description: 'Organize a revisão dos acessos pendentes.', text: 'Consulte os status das contas da ShapeOS e resuma os cadastros que aguardam aprovação. Me ajude a organizar a revisão dos acessos, sem alterar os dados.' },
    { icon: ChartColumn, title: 'Analisar a plataforma', description: 'Veja um panorama dos dados da operação.', text: 'Consulte o banco e me dê um resumo atual da ShapeOS: usuários, status das contas, fichas ativas e sessões concluídas nos últimos 30 dias.' },
  ],
  ALUNO: [
    { icon: Dumbbell, title: 'Entenda sua ficha', description: 'Leia a prescrição do seu Personal com mais clareza.', text: 'Consulte minhas fichas ativas e me ajude a entender a prescrição, sem sugerir alterações.' },
    { icon: Activity, title: 'Veja seu acompanhamento', description: 'Resuma seus registros recentes.', text: 'Consulte meu acompanhamento e resuma minhas sessões concluídas nos últimos 7 e 30 dias corridos. Informe os limites e os dados que faltam.' },
  ],
  PERSONAL: [
    { icon: Dumbbell, title: 'Planeje um treino', description: 'Organize os próximos passos da prescrição.', text: 'Me ajude a planejar um treino. Quais informações do aluno você precisa?' },
    { icon: RotateCcw, title: 'Revise uma ficha', description: 'Prepare uma análise do treino do aluno.', text: 'Quero revisar uma ficha de treino. Me diga o que preciso compartilhar para você analisar.' },
    { icon: Users, title: 'Acompanhe seu aluno', description: 'Consulte os alunos vinculados à sua conta.', text: 'Consulte meus alunos vinculados na ShapeOS e liste seus nomes. Depois quero analisar a evolução de um deles.' },
    { icon: MessageCircle, title: 'Prepare uma orientação', description: 'Escreva uma mensagem de acompanhamento.', text: 'Me ajude a escrever uma mensagem acolhedora para um aluno que perdeu a rotina de treinos.' },
  ],
}

function MysMark({ small = false }: { small?: boolean }) {
  return <span className={small ? s.smallMark : s.mark} aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M8 31V9L20 23L32 9V31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
}

// Links and remote images are intentionally rendered as plain text/omitted.
// Markdown is presentation only; it cannot execute actions or render raw HTML.
const markdownComponents = { a: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>, img: () => null }
function Answer({ content }: { content: string }) {
  return <MessageResponse className={s.answer} mode="static" controls={false} skipHtml components={markdownComponents}>{content}</MessageResponse>
}

export function MysChat({ role, name, configured, embedded = false }: { role: MysRole; name: string; configured: boolean; embedded?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<MysSelectedStudent | null>(null)
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
  const admin = role === 'ADMIN', student = role === 'ALUNO'
  useEffect(() => () => { controller.current?.abort(); if (copyTimer.current) clearTimeout(copyTimer.current) }, [])
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }) }, [messages, loading])

  useLayoutEffect(() => {
    if (admin || !input.current) return
    input.current.style.height = 'auto'
    input.current.style.height = Math.min(input.current.scrollHeight, 160) + 'px'
  }, [admin, draft])

  async function send(retry = false, regenerate = false) {
    if (busy.current || !configured) return
    const previous = regenerate ? messages.slice(0, -2) : retry ? messages.slice(0, -1) : messages
    const text = regenerate ? messages.at(-2)?.content || '' : retry ? messages.at(-1)?.content || '' : draft.trim()
    if (!text || text.length > 2000) return
    if (!retry && !regenerate && messages.at(-1)?.role === 'user') return
    const next: Message[] = [...previous, { role: 'user', content: text, id: crypto.randomUUID() }]
    // Retain the latest nine completed exchanges plus this request.
    const context = next.slice(-19).map(({ role, content }) => ({ role, content }))
    setMessages(next); setDraft(''); setError(''); setNotice(''); setLoading(true); busy.current = true
    const abort = new AbortController()
    controller.current = abort
    try {
      const response = await fetch('/api/mys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: context, ...(selectedStudent && !admin ? { studentId: selectedStudent.id } : {}) }), signal: abort.signal })
      if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Sua sessão não foi reconhecida. Atualize a página e entre novamente se necessário.')
      }
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível enviar a mensagem.')
      if (typeof result.message !== 'string') throw new Error('A Mys não retornou uma resposta válida.')
      setMessages([...next, { role: 'assistant', content: result.message, id: crypto.randomUUID(), truncated: Boolean(result.truncated), sources: Array.isArray(result.sources) ? result.sources.filter((source: unknown): source is string => typeof source === 'string') : [], consultedAt: typeof result.consultedAt === 'string' ? result.consultedAt : undefined, cards: Array.isArray(result.cards) ? result.cards.slice(0, 8) : [] }])
    } catch (error) {
      if (abort.signal.aborted) setError('Resposta interrompida. Você pode tentar novamente ou editar a pergunta.')
      else setError(error instanceof Error ? error.message : 'Não foi possível conectar à Mys.')
    } finally { busy.current = false; setLoading(false); controller.current = null }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send() }
  function clear() { setMessages([]); setDraft(''); setSelectedStudent(null); setError(''); setNotice('Nova conversa iniciada.'); setConfirmClear(false); input.current?.focus() }
  function editQuestion() { setDraft(messages.at(-1)?.content || ''); setMessages(messages.slice(0,-1)); setError(''); input.current?.focus() }
  function choose(text: string) { setDraft(text); input.current?.focus() }
  async function copy(message: Message) {
    try { await navigator.clipboard.writeText(message.content); setCopied(message.id); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 2000) }
    catch { setNotice('Não foi possível copiar automaticamente. Selecione o texto da resposta para copiar.') }
  }

  return <section className={`${s.workspace} ${messages.length ? '' : s.emptyWorkspace}`} aria-label="Mys, assistente ShapeOS">
    {!embedded && <header className={s.header}>
      <div className={s.identity}><MysMark small/><div><h1>Mys <span>ShapeOS</span></h1><p>Sua assistente de {admin ? 'gestão e academia' : 'treino e acompanhamento'}.</p></div></div>
      <div className={s.headerActions}>
        <div className={s.headerTools}><NotificationBell/><ThemeToggle/></div>
      <button className={s.newChat} disabled={loading} aria-label="Nova conversa" title="Nova conversa" onClick={() => messages.length ? setConfirmClear(true) : clear()}><Plus size={18} aria-hidden="true"/><span>Nova conversa</span></button>
      </div>
    </header>}
    <div className={`${s.chatPanel} ${messages.length ? '' : s.emptyPanel}`}>
      {Boolean(messages.length) && <div className={s.contextBar}><span><span className={s.dot}/>{admin ? 'Administração' : student ? 'Espaço do Aluno' : 'Espaço do personal'}</span><span className={s.connectionState}><Database size={12}/>{configured ? 'Consultas à ShapeOS habilitadas' : 'Aguardando conexão'}</span></div>}
      <div className={`${s.thread} ${messages.length ? '' : s.emptyThread}`} role="log" aria-label="Conversa com a Mys" aria-live="polite" aria-relevant="additions" aria-busy={loading}>
        {!messages.length ? <div className={s.welcome}>
          <div className={s.welcomeMark}>
            <span className={s.wireframeClip} aria-hidden="true"><MysWelcomeWireframe className={s.welcomeWireframe}/></span>
            <MysMark/>
          </div>
          <p className={s.greeting}>Olá, {firstName}.</p>
          <h2>Como posso ajudar hoje?</h2>
          <p className={s.welcomeSubtitle}>Clareza para decidir. Agilidade para agir.</p>
          <div className={s.quickPrompts}>{(admin ? prompts.ADMIN : student ? prompts.ALUNO : [prompts.PERSONAL[0], prompts.PERSONAL[2]]).map(({ icon: Icon, title, description, text }) => <button key={title} type="button" disabled={loading} onClick={() => choose(text)}><Icon size={22} strokeWidth={1.8} aria-hidden="true"/><span className={s.promptCopy}><strong>{title}</strong><span>{description}</span></span></button>)}</div>
        </div> : <div className={s.messages}>{messages.map((message, index) => <article key={message.id} className={message.role === 'user' ? s.userMessage : s.assistantMessage} aria-label={message.role === 'user' ? 'Sua mensagem' : 'Resposta da Mys'}>
          {message.role === 'assistant' && <div className={s.answerIdentity}><MysMark small/><span>Mys</span><span className={s.answerLabel}>ASSISTENTE</span></div>}
          <div className={s.bubble}>{message.role === 'assistant' ? <Answer content={message.content}/> : <p>{message.content}</p>}</div>
          {message.role === 'assistant' && Boolean(message.cards?.length) && <div className={s.dataCards} aria-label="Dados consultados na ShapeOS">{message.cards?.map((card, cardIndex) => <div className={s.dataCard} key={`${card.kind}-${cardIndex}`}><div className={s.cardHeading}>{card.kind === 'student' ? <Users size={16}/> : card.kind === 'workout' ? <Dumbbell size={16}/> : <Activity size={16}/>}<span>{card.kind === 'student' ? 'ALUNO' : card.kind === 'workout' ? 'FICHA DE TREINO' : 'DADOS DA SHAPEOS'}</span><CheckCheck size={13}/></div><h3>{card.title}</h3><p>{card.detail}</p>{Boolean(card.metrics?.length) && <dl>{card.metrics?.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>}{card.prompt && <button disabled={loading || Boolean(error)} onClick={() => choose(card.prompt!)}>Explorar {card.kind === 'student' ? 'aluno' : 'ficha'}<ArrowUpRight size={13}/></button>}</div>)}</div>}
          {message.role === 'assistant' && <>
            {Boolean(message.sources?.length) && <details className={s.sources}><summary><Database size={13}/><span>Consultou {message.sources?.length} {message.sources?.length === 1 ? 'fonte' : 'fontes'} da ShapeOS</span><ChevronDown size={13}/></summary><ul>{message.sources?.map(source => <li key={source}><Check size={12}/>{source}</li>)}</ul>{message.consultedAt && !Number.isNaN(Date.parse(message.consultedAt)) && <p>Consulta às {new Date(message.consultedAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}. Os dados podem mudar.</p>}</details>}
            <div className={s.answerActions}><button onClick={() => void copy(message)} aria-label={copied === message.id ? 'Resposta copiada' : 'Copiar resposta'}>{copied === message.id ? <Check size={14}/> : <Copy size={14}/>} {copied === message.id ? 'Copiado' : 'Copiar'}</button>{index === messages.length - 1 && <button disabled={loading} onClick={() => void send(false, true)}><RotateCcw size={14}/>Refazer</button>}{message.truncated && <span>Peça para continuar a resposta.</span>}</div>
          </>}
        </article>)}</div>}
        {loading && <div className={s.thinking} role="status"><MysMark small/><div><span>Mys está preparando uma resposta</span><div className={s.thinkingDots}><i/><i/><i/></div></div></div>}
        <div ref={end}/>
      </div>
      <div className={s.composerArea}>
        {role === 'PERSONAL' && <MysStudentPicker selected={selectedStudent} locked={loading || messages.length > 0} onSelect={student => { setSelectedStudent(student); setDraft('') }} onSummary={() => choose(`Resuma o acompanhamento de ${selectedStudent?.name ?? 'meu aluno'}: frequência nos últimos 7 e 30 dias corridos, último treino concluído, fichas ativas e avaliações. Destaque as informações que faltam e sugira próximos passos para eu revisar, sem alterar os dados.`)} />}
        {confirmClear && <div className={s.confirm} role="alert"><span>Começar outra conversa? As mensagens atuais serão descartadas.</span><button onClick={clear}>Começar</button><button onClick={() => setConfirmClear(false)} aria-label="Manter conversa" data-shapeos-tooltip="Manter conversa"><X size={16}/></button></div>}
        {!configured && <div className={s.setup}><span className={s.dot}/><p>A Mys está sendo conectada. Você já pode preparar sua primeira pergunta.</p></div>}
        {error && <div className={s.error} role="alert"><p>{error}</p><div><button onClick={() => void send(true)}><RotateCcw size={14}/> Tentar novamente</button><button onClick={editQuestion}>Editar pergunta</button></div></div>}
        {notice && <p className={s.notice} role="status">{notice}</p>}
        <form className={s.composer} onSubmit={submit}><label className={s.srOnly} htmlFor="mys-message">Mensagem para a Mys</label><textarea id="mys-message" ref={input} rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder={admin ? 'Pergunte sobre sua gestão ou os dados da ShapeOS…' : student ? 'Pergunte sobre sua ficha ou seus registros…' : 'Pergunte sobre treinos, fichas ou seus alunos…'} disabled={loading || Boolean(error)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }}/><div className={s.composerBottom}><span data-shapeos-tooltip="Esta conversa não fica salva no histórico. Ao sair ou recarregar a página, as mensagens são descartadas."><MessageCircle size={13}/><span>Conversa temporária</span></span><div><span className={s.count}>{draft.length > 1500 ? `${draft.length}/2000` : 'Enter para enviar'}</span>{loading ? <button className={s.send} type="button" onClick={() => controller.current?.abort()} aria-label="Interromper resposta" data-shapeos-tooltip="Interromper resposta"><Square size={16}/></button> : <button className={s.send} type="submit" disabled={!configured || !draft.trim() || Boolean(error)} aria-label="Enviar mensagem" data-shapeos-tooltip="Enviar mensagem"><ArrowUp size={19}/></button>}</div></div></form>
        <p className={s.footnote}>Mys pode cometer erros. Revise as sugestões antes de aplicar.</p>
      </div>
    </div>
    <details className={s.scope}><summary><ShieldCheck size={13}/>Seu espaço, seus dados<ChevronDown size={13}/></summary><p>{admin ? 'Consulte contagens gerais, alunos, fichas, sessões e avaliações.' : student ? 'Consulte somente suas fichas, sessões, avaliações e agenda. A prescrição continua sob responsabilidade do Personal.' : 'Consulte seus alunos com vínculo ativo, suas fichas e a evolução registrada.'} A Mys tem acesso de leitura, limitado às permissões da sua conta. As mensagens e os dados necessários para responder são enviados à DeepSeek. Esta conversa fica na página até você sair ou começar outra.</p></details>
  </section>
}


