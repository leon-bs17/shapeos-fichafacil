'use client'

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './student-invitations.module.css'

interface Invitation { id: string; personal_nome: string; expira_em: string }

export function StudentInvitations({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const inFlight = useRef(false)
  const invites = useQuery<Invitation[]>({
    queryKey: ['student-invitations', studentId],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const db = createClient()
      const { data: auth, error: authError } = await db.auth.getUser()
      if (authError || auth.user?.id !== studentId) throw new Error('Entre novamente para consultar seus convites.')
      const { data, error } = await db.from('convites_aluno').select('id, personal_nome, expira_em')
        .eq('estado', 'PENDENTE').gt('expira_em', new Date().toISOString()).order('criado_em', { ascending: false })
      if (error) throw new Error('Não foi possível consultar seus convites.')
      return (data ?? []) as Invitation[]
    },
  })

  async function respond(id: string, accept: boolean) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(id); setError(''); setMessage('')
    try {
      const { error } = await createClient().rpc('responder_convite_aluno', { p_convite_id: id, p_aceitar: accept })
      if (error) throw new Error('Não foi possível responder. O convite pode ter expirado; atualize a lista e tente novamente.')
      setMessage(accept ? 'Convite aceito. Seu vínculo com o personal foi ativado.' : 'Convite recusado. Nenhum vínculo foi criado.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-invitations', studentId] }),
        queryClient.invalidateQueries({ queryKey: ['fitness-student', studentId] }),
      ])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível responder ao convite.') }
    finally { inFlight.current = false; setBusy('') }
  }

  if (invites.isLoading) return <p className={styles.state} role="status">Consultando convites…</p>
  if (invites.error) return <div className={styles.root} role="alert"><p>Não foi possível consultar seus convites.</p><button onClick={() => void invites.refetch()}>Tentar novamente</button></div>
  if (!invites.data?.length && !message) return null
  return <section className={styles.root} aria-labelledby="student-invites-title">
    <header><UserPlus size={19} aria-hidden="true" /><h2 id="student-invites-title">Convites de personal</h2></header>
    {!!invites.data?.length && <p>Você decide com quem compartilhar seus dados de acompanhamento no ShapeOS. O acesso só será liberado ao aceitar.</p>}
    {invites.data?.map(invite => <article key={invite.id}>
      <div><h3>{invite.personal_nome}</h3><p>Quer acompanhar seus treinos e sua evolução.</p><span>Disponível até {new Date(invite.expira_em).toLocaleString('pt-BR')}</span></div>
      <div className={styles.actions}><button disabled={!!busy} onClick={() => void respond(invite.id, false)}>Recusar</button><button disabled={!!busy} onClick={() => void respond(invite.id, true)}>{busy === invite.id ? 'Processando…' : 'Aceitar vínculo'}</button></div>
    </article>)}
    {message && <p role="status">{message}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>
}
