'use client'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  return <section className={styles.panel}><h2>Avaliações agendadas pelo Personal</h2>
    {links.isPending ? <p role="status">Consultando avaliações agendadas…</p> : links.isError ? <><p role="alert">Não foi possível consultar as avaliações agendadas.</p><Button variant="outline" onClick={() => void links.refetch()}>Tentar novamente</Button></> : !scheduled.length ? <p>Nenhuma data informada pelo Personal. Combine a próxima avaliação com ele.</p> : scheduled.map(link => <p key={link.id}><time dateTime={link.proxima_avaliacao_em!}>{new Date(`${link.proxima_avaliacao_em}T12:00:00`).toLocaleDateString('pt-BR')}</time> · Data definida pelo Personal</p>)}
  </section>
}
export function StudentGuidance({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const inbox = useInfiniteQuery({ queryKey: ['notifications', studentId, 'inbox'], queryFn: ({ pageParam, signal }) => receivedNotifications(pageParam, signal), initialPageParam: undefined as NotificationCursor | undefined, getNextPageParam: page => page.nextCursor })
  const read = useMutation({ mutationFn: (id: string) => markNotificationsRead([id]), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', studentId] }) })
  const items = inbox.data?.pages.flatMap(page => page.items) ?? []
  return <section className={`${styles.panel} ${styles.stack}`} aria-labelledby="student-guidance-title"><h2 id="student-guidance-title">Orientações e avisos</h2><p>Comunicados do seu Personal e da ShapeOS. Para contar como lida, abra a orientação. Suas observações sobre a execução ficam no registro de cada treino.</p>
    {inbox.isPending ? <p role="status">Carregando orientações…</p> : inbox.isError ? <><p role="alert">Não foi possível atualizar suas orientações.</p><Button variant="outline" onClick={() => void inbox.refetch()}>Tentar novamente</Button></> : !items.length ? <p>Nenhuma orientação recebida. As mensagens destinadas a você aparecerão aqui.</p> : null}
    {items.map(item => <details className={styles.notice} key={item.id} onToggle={event => { if (event.currentTarget.open && !item.lida_em && !read.isPending) read.mutate(item.id) }}><summary><strong>{item.titulo}{!item.lida_em ? ' · Não lida' : ''}</strong><time dateTime={item.criado_em}>{new Date(item.criado_em).toLocaleDateString('pt-BR')}</time></summary><p className={styles.message}>{item.mensagem}</p>{!item.lida_em && <Button variant="outline" size="sm" disabled={read.isPending} onClick={() => read.mutate(item.id)}>Marcar como lida</Button>}</details>)}
    {read.isError && <div role="alert"><p>Não foi possível registrar a leitura.</p><Button variant="outline" onClick={() => read.variables && read.mutate(read.variables)}>Tentar novamente</Button></div>}
    {inbox.hasNextPage && <Button variant="outline" disabled={inbox.isFetching} onClick={() => void inbox.fetchNextPage()}>{inbox.isFetching ? 'Carregando…' : 'Carregar mais orientações'}</Button>}
  </section>
}
