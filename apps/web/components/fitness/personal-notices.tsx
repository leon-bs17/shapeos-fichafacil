'use client'
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Send, Users, CheckCheck, SquareCheck, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalSearch } from '@/components/ui/personal-search'
import { PersonalBannerWireframe } from '@/components/layout/personal-banner-wireframe'
import { ShapeosBanner } from '@/components/layout/shapeos-banner'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { fitnessRequest } from '@/lib/api/client'
import type { NoticeDraft, NoticeRecipient, SentNotice } from '@/lib/fitness/personal-notice'
import styles from './personal-notices.module.css'

const date = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : words[0]?.slice(0,2).toUpperCase() || '?'
}
export function PersonalNotices() {
  const client = useQueryClient(), sending = useRef(false), requestId = useRef<string | null>(null)
  const [titulo, setTitulo] = useState(''), [mensagem, setMensagem] = useState(''), [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([]), [preview, setPreview] = useState<NoticeDraft | null>(null), [details, setDetails] = useState<SentNotice | null>(null)
  const [page, setPage] = useState(1), [error, setError] = useState(''), [success, setSuccess] = useState('')
  const recipients = useQuery({ queryKey: ['personal-notice-recipients'], queryFn: () => fitnessRequest<NoticeRecipient[]>('/api/comunicados?destinatarios=1'), gcTime: 0 })
  const history = useQuery({ queryKey: ['personal-notices', page], queryFn: () => fitnessRequest<{ items: SentNotice[]; total: number; page: number }>(`/api/comunicados?pagina=${page}`), gcTime: 0, refetchInterval: 60000 })
  const mutation = useMutation({ mutationFn: (draft: NoticeDraft) => fitnessRequest<{ id: string; total: number }>('/api/comunicados', 'POST', draft) })
  const filtered = recipients.data?.filter(student => `${student.nome} ${student.email}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) ?? []
  function changed() { requestId.current = null; setError(''); setSuccess('') }
  function toggle(id: string) {
    if (!selected.includes(id) && selected.length >= 100) { setError('Selecione até 100 alunos por envio.'); return }
    changed(); setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])
  }
  function openPreview() {
    setError(''); mutation.reset()
    if (titulo.trim().length < 3 || !mensagem.trim() || !selected.length || selected.length > 100) { setError('Informe título, mensagem e de 1 a 100 destinatários.'); return }
    if (selected.some(id => !recipients.data?.some(student => student.id === id))) { setError('Atualize os destinatários antes de publicar.'); return }
    requestId.current ??= crypto.randomUUID()
    setPreview({ id: requestId.current, titulo: titulo.trim(), mensagem: mensagem.trim(), alunos: [...selected] })
  }
  async function publish() {
    if (!preview || sending.current) return
    sending.current = true
    try {
      const result = await mutation.mutateAsync(preview)
      setSuccess(`Comunicado publicado para ${result.total} ${result.total === 1 ? 'aluno' : 'alunos'}.`)
      setTitulo(''); setMensagem(''); setSelected([]); setPreview(null); requestId.current = null; setPage(1)
      await client.invalidateQueries({ queryKey: ['personal-notices'] })
    } catch { /* Keep the same preview and request ID for an idempotent retry. */ }
    finally { sending.current = false }
  }
  const metrics = [
    { label: 'Alunos disponíveis', value: recipients.isError ? undefined : recipients.data?.length, icon: Users },
    { label: 'Selecionados', value: selected.length, icon: SquareCheck },
    { label: 'Comunicados enviados', value: history.isError ? undefined : history.data?.total, icon: Send },
    { label: 'Leituras nesta página', value: history.isError ? undefined : history.data?.items.reduce((sum, item) => sum + item.leituras, 0), icon: CheckCheck },
  ]
  return <div className={styles.page}>
    <ShapeosBanner titleId="personal-notices-banner" eyebrow="Comunicados do Personal"
      title={<>Oriente e acompanhe <span>seus alunos</span></>}
      description="Envie orientações e acompanhe a leitura dos seus comunicados."
      art={<PersonalBannerWireframe variant="notices"/>} />
    <dl className={styles.metrics} aria-label="Indicadores de comunicados">
      {metrics.map(({label,value,icon:Icon}) => <div key={label}><span className={styles.metricIcon} aria-hidden="true"><Icon size={24} /></span><div><dt>{label}</dt><dd>{value ?? '—'}</dd></div></div>)}
    </dl>
    <section className={styles.panel} aria-labelledby="notice-compose-title"><h2 id="notice-compose-title">Preparar comunicado</h2><p className={styles.note}>O aviso chega ao sino de notificações dos alunos selecionados. Confira a prévia antes de publicar.</p>
      <div className={styles.composeGrid}><div className={styles.messageFields}>
      <div className={styles.field}><label htmlFor="notice-title">Título</label><Input id="notice-title" placeholder="Título do comunicado" maxLength={120} value={titulo} disabled={mutation.isPending} onChange={event => { changed(); setTitulo(event.target.value) }} /></div>
      <div className={styles.field}><label htmlFor="notice-message">Mensagem</label><AutoResizeTextarea id="notice-message" placeholder="Escreva sua orientação…" aria-describedby="notice-message-count" rows={3} maxLength={4000} value={mensagem} disabled={mutation.isPending} onChange={event => { changed(); setMensagem(event.target.value) }} /><p id="notice-message-count" className={styles.counter}>{mensagem.length}/4.000 caracteres</p></div>
      </div><div className={styles.recipientPanel}>
      <div className={styles.recipientHeading}><h3>Destinatários</h3><span>{selected.length}/100 selecionados</span></div>
      {recipients.isPending ? <p role="status">Carregando alunos…</p> : recipients.isError ? <div role="alert"><p>Não foi possível carregar seus alunos.</p><Button variant="outline" onClick={() => void recipients.refetch()}>Recarregar alunos</Button></div> : <>
        <PersonalSearch aria-label="Buscar destinatário" placeholder="Buscar aluno por nome ou e-mail" value={search} onChange={event => setSearch(event.target.value)} />
        <div className={styles.selectionActions}><Button variant="outline" disabled={!filtered.length || mutation.isPending} onClick={() => { const ids = Array.from(new Set([...selected, ...filtered.map(student => student.id)])); if (ids.length > 100) { setError('O grupo excede 100 alunos. Refine a busca ou selecione individualmente.'); return } changed(); setSelected(ids) }}>Selecionar exibidos ({filtered.length})</Button><Button variant="outline" disabled={!selected.length || mutation.isPending} onClick={() => { changed(); setSelected([]) }}>Limpar seleção</Button></div>
        {!filtered.length ? <p className={styles.note}>Nenhum aluno com vínculo ativo e conta liberada encontrado.</p> : <ul className={styles.recipients}>{filtered.map(student => <li key={student.id}><label><input type="checkbox" checked={selected.includes(student.id)} disabled={mutation.isPending} onChange={() => toggle(student.id)} /><span className={styles.avatar} aria-hidden="true">{initials(student.nome)}</span><span className={styles.recipientIdentity}><strong>{student.nome}</strong><small>{student.email}</small></span></label></li>)}</ul>}
      </>}
      </div></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}{success && <p role="status" className={styles.note}>{success}</p>}
      <div className={styles.actions}><Button disabled={recipients.isPending || recipients.isError || mutation.isPending || !selected.length || titulo.trim().length < 3 || !mensagem.trim()} onClick={openPreview}><Eye className={styles.previewIcon} size={16} aria-hidden="true" />Ver prévia</Button></div>
    </section>
    <section className={styles.panel} aria-labelledby="notice-history-title"><div className={styles.recipientHeading}><h2 id="notice-history-title">Comunicados enviados</h2><Button variant="outline" disabled={history.isFetching} onClick={() => void history.refetch()}>Atualizar leituras</Button></div><p className={styles.note}>A leitura é registrada ao abrir o aviso ou marcá-lo como lido. Isso não confirma que a orientação foi compreendida.</p>
      {history.isPending ? <p role="status">Carregando envios…</p> : history.isError ? <div role="alert"><p>Não foi possível carregar seus envios.</p><Button variant="outline" onClick={() => void history.refetch()}>Recarregar envios</Button></div> : !history.data?.items.length ? <div className={styles.empty}><FileText size={24} aria-hidden="true"/><p>Nenhum comunicado nesta página.</p></div> : <ul className={styles.history}>{history.data.items.map(item => <li key={item.envio_id}><div><strong>{item.titulo}</strong><p>{date(item.criado_em)}</p><span><Users size={14} aria-hidden="true" />{item.destinatarios} destinatários <CheckCheck size={14} aria-hidden="true" />{item.leituras} lidos</span></div><Button variant="outline" onClick={() => setDetails(item)}><Eye size={14} aria-hidden="true" />Ver</Button></li>)}</ul>}
      {history.data && <div className={styles.pagination}><span>Página {page} de {Math.max(1, Math.ceil(history.data.total / 10))}</span><div><Button variant="outline" disabled={page === 1 || history.isFetching} onClick={() => setPage(value => value - 1)}>Anterior</Button><Button variant="outline" disabled={page * 10 >= history.data.total || history.isFetching} onClick={() => setPage(value => value + 1)}>Próxima</Button></div></div>}
    </section>
    <Modal personal className={`${styles.modal} ${styles.compactPreview}`} open={!!preview} onClose={() => { if (!sending.current) setPreview(null) }} titulo="Prévia do comunicado"><div className={styles.preview}>{preview && <><h3>{preview.titulo}</h3><p className={styles.message}>{preview.mensagem}</p><h3>Destinatários ({preview.alunos.length})</h3><ul className={styles.previewRecipients}>{preview.alunos.map(id => { const name = recipients.data?.find(student => student.id === id)?.nome ?? 'Aluno selecionado'; return <li key={id}><span className={styles.avatar} aria-hidden="true">{initials(name)}</span><span>{name}</span></li> })}</ul><p className={styles.note}>Após publicar, os alunos receberão o aviso no sino de notificações.</p>{mutation.isError && <p role="alert" className={styles.error}>{mutation.error.message}</p>}<div className={styles.actions}><Button variant="outline" disabled={mutation.isPending} onClick={() => setPreview(null)}>Voltar</Button><Button className={styles.publishButton} disabled={mutation.isPending} onClick={() => void publish()}><Send size={15} aria-hidden="true" />{mutation.isPending ? 'Publicando…' : 'Publicar comunicado'}</Button></div></>}</div></Modal>
    <Modal personal className={styles.modal} open={!!details} onClose={() => setDetails(null)} titulo="Comunicado enviado"><div className={styles.preview}>{details && <><h3>{details.titulo}</h3><p className={styles.note}>{date(details.criado_em)}</p><p className={styles.message}>{details.mensagem}</p><h3>Leitura por destinatário</h3><ul className={styles.readers}>{details.alunos.map(student => <li key={student.aluno_id}><span className={styles.avatar} aria-hidden="true">{initials(student.nome)}</span><div><strong>{student.nome}</strong><span>{student.lida_em ? `Lido em ${date(student.lida_em)}` : 'Ainda não lido'}</span></div></li>)}</ul></>}</div></Modal>
  </div>
}
