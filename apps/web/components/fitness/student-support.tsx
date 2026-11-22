'use client'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { markNotificationsRead, receivedNotifications, type NotificationCursor } from '@/services/notifications'
import styles from './student-experience.module.css'

function useStudentLinks(studentId: string) {
  return useQuery({ queryKey: ['fitness-student', studentId, 'links'], queryFn: async () => {
    const { data, error } = await createClient().from('personal_alunos').select('id,proxima_avaliacao_em').eq('aluno_id', studentId).eq('status', 'ATIVO')
    if (error) throw new Error('Não foi possível consultar seus vínculos.')
    return (data ?? []) as { id: string; proxima_avaliacao_em: string | null }[]
  } })
}
export function StudentLinkStatus({ studentId }: { studentId: string }) {
  const links = useStudentLinks(studentId)
  return <div className={styles.panel} data-student-link-status>
    <h2>Próximo passo</h2>
    {links.isPending ? <p role="status">Consultando seu vínculo…</p> : links.isError ? <><p role="alert">Não foi possível consultar seu vínculo.</p><Button variant="outline" onClick={() => void links.refetch()}>Tentar novamente</Button></> : <p>{links.data.length ? 'Seu vínculo com o Personal está ativo. Peça a ele para disponibilizar sua ficha de treino.' : 'Você ainda não tem um vínculo ativo. Peça um convite ao seu Personal e aceite-o na seção de convites deste painel.'}</p>}
  </div>
}
export function StudentAssessmentSchedule({ studentId }: { studentId: string }) {
  const links = useStudentLinks(studentId)
  const scheduled = links.data?.filter(link => link.proxima_avaliacao_em).sort((a,b) => a.proxima_avaliacao_em!.localeCompare(b.proxima_avaliacao_em!)) ?? []
  return (
    <section className="personal-panel" aria-labelledby="student-assessment-schedule-title">
      <header className="personal-panel-heading"><h2 id="student-assessment-schedule-title">Avaliações agendadas pelo Personal</h2></header>
      {links.isPending ? <p className={styles.state} role="status">Consultando avaliações agendadas…</p> : links.isError ? (
        <div className={styles.state}><div className="personal-load-error" role="alert">
          <p>Não foi possível consultar as avaliações agendadas.</p>
          <Button variant="outline" onClick={() => void links.refetch()}>Tentar novamente</Button>
        </div></div>
      ) : !scheduled.length ? (
        <div className="personal-empty"><CalendarDays size={26} aria-hidden="true" /><p>Nenhuma data informada pelo Personal. Combine a próxima avaliação com ele.</p></div>
      ) : (
        <ul className={styles.list}>
          {scheduled.map(link => <li className={styles.listRow} key={link.id}>
            <time dateTime={link.proxima_avaliacao_em!}>{new Date(`${link.proxima_avaliacao_em}T12:00:00`).toLocaleDateString('pt-BR')}</time>
            <span className="personal-status" data-active="true">Agendada</span>
          </li>)}
        </ul>
      )}
    </section>
  )
}
export function StudentGuidance({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const inbox = useInfiniteQuery({ queryKey: ['notifications', studentId, 'inbox'], queryFn: ({ pageParam, signal }) => receivedNotifications(pageParam, signal), initialPageParam: undefined as NotificationCursor | undefined, getNextPageParam: page => page.nextCursor })
  const read = useMutation({ mutationFn: (id: string) => markNotificationsRead([id]), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', studentId] }) })
  const items = inbox.data?.pages.flatMap(page => page.items) ?? []
  return (
    <section className="personal-panel" aria-labelledby="student-guidance-title">
      <header className={`personal-panel-heading ${styles.sectionHeading}`}>
        <div>
          <h2 id="student-guidance-title">Comunicados recebidos</h2>
          <p>Orientações do seu Personal e avisos da ShapeOS.</p>
        </div>
        <Button variant="outline" disabled={inbox.isFetching} onClick={() => void inbox.refetch()}>Atualizar</Button>
      </header>
      {inbox.isPending ? <p className={styles.state} role="status">Carregando orientações…</p> : inbox.isError ? (
        <div className={styles.state}><div className="personal-load-error" role="alert">
          <p>Não foi possível atualizar suas orientações.</p>
          <Button variant="outline" onClick={() => void inbox.refetch()}>Tentar novamente</Button>
        </div></div>
      ) : !items.length ? (
        <div className="personal-empty">
          <Megaphone size={26} aria-hidden="true" />
          <h3>Nenhum comunicado recebido</h3>
          <p>As mensagens destinadas a você aparecerão aqui.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id} className={styles.noticeRow}>
              <details onToggle={event => { if (event.currentTarget.open && !item.lida_em && !read.isPending) read.mutate(item.id) }}>
                <summary className={styles.noticeSummary}>
                  <ChevronRight size={14} aria-hidden="true" />
                  <strong>{item.titulo}</strong>
                  <time dateTime={item.criado_em}>{new Date(item.criado_em).toLocaleDateString('pt-BR')}</time>
                  <span className="personal-status" data-active={!item.lida_em}>{item.lida_em ? 'Lido' : 'Não lido'}</span>
                </summary>
                <div className={styles.noticeBody}>
                  <p className={styles.message}>{item.mensagem}</p>
                  {!item.lida_em && <Button variant="outline" size="sm" disabled={read.isPending} onClick={() => read.mutate(item.id)}>Marcar como lida</Button>}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {(read.isError || inbox.hasNextPage) && <footer className={styles.state}>
        {read.isError && <div className="personal-load-error" role="alert"><p>Não foi possível registrar a leitura.</p><Button variant="outline" onClick={() => read.variables && read.mutate(read.variables)}>Tentar novamente</Button></div>}
        {inbox.hasNextPage && <Button variant="outline" disabled={inbox.isFetching} onClick={() => void inbox.fetchNextPage()}>{inbox.isFetching ? 'Carregando…' : 'Carregar mais orientações'}</Button>}
      </footer>}
    </section>
  )
}
