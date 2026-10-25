'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { StudentInvitations } from '@/components/fitness/student-invitations'
import { createClient } from '@/lib/supabase/client'
import { prepareStudentInvite, saveStudentInvitePassword } from '@/lib/auth/student-invite'
import styles from './page.module.css'

type Student = { id: string; email: string }
type Mode = 'loading' | 'ready' | 'saving' | 'success' | 'invalid'

export default function AceitarConvitePage() {
  const [mode, setMode] = useState<Mode>('loading')
  const [student, setStudent] = useState<Student | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState('')
  const preparation = useRef<Promise<Student> | null>(null)
  const saving = useRef(false)

  useEffect(() => {
    let active = true
    if (!preparation.current) {
      const inviteUrl = new URL(window.location.href)
      // Clear single-use credentials before creating the browser auth client.
      window.history.replaceState({}, '', '/aceitar-convite')
      preparation.current = prepareStudentInvite(createClient(), inviteUrl)
    }
    preparation.current.then(user => {
      if (active) { setStudent(user); setMode('ready') }
    }).catch(cause => {
      if (active) { setError(cause instanceof Error ? cause.message : 'Não foi possível validar seu convite.'); setMode('invalid') }
    })
    return () => { active = false }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current || !student || mode !== 'ready') return
    saving.current = true
    setError('')
    setMode('saving')
    try {
      await saveStudentInvitePassword(createClient(), student.id, password, confirmation)
      setPassword(''); setConfirmation(''); setShowPassword(false); setShowConfirmation(false)
      setMode('success')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar sua senha.')
      setMode('ready')
    } finally { saving.current = false }
  }

  return <AuthShell compact testId="student-invite">
    <section className={styles.root} aria-labelledby="invite-title" aria-busy={mode === 'loading' || mode === 'saving'}>
      <header><KeyRound size={22} aria-hidden="true" /><p className={styles.eyebrow}>Convite de aluno</p>
        <h1 id="invite-title">{mode === 'success' ? 'Senha definida' : mode === 'invalid' ? 'Convite indisponível' : 'Defina sua senha'}</h1>
        <p>{mode === 'success' ? 'Seu acesso está pronto. Confira abaixo o convite e decida se deseja se vincular ao personal.' : mode === 'invalid' ? 'Não foi possível concluir a validação deste link.' : 'Crie sua senha. Depois, você poderá aceitar ou recusar o vínculo com seu personal.'}</p>
      </header>
      {mode === 'loading' && <p className={styles.state} role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Validando seu convite…</p>}
      {(mode === 'ready' || mode === 'saving') && <form onSubmit={save} noValidate>
        <p className={styles.account}>Conta: <strong>{student?.email}</strong></p>
        <div><label htmlFor="invite-password">Nova senha</label><div className={styles.password}>
          <input id="invite-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Digite a nova senha" value={password} disabled={mode === 'saving'} minLength={8} required aria-describedby="invite-help" onChange={event => setPassword(event.target.value)} />
          <button type="button" disabled={mode === 'saving'} aria-label={showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'} aria-controls="invite-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div><p id="invite-help" className={styles.help}>Use pelo menos 8 caracteres, com letras e números.</p></div>
        <div><label htmlFor="invite-confirmation">Confirmar nova senha</label><div className={styles.password}>
          <input id="invite-confirmation" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita a nova senha" value={confirmation} disabled={mode === 'saving'} required onChange={event => setConfirmation(event.target.value)} />
          <button type="button" disabled={mode === 'saving'} aria-label={showConfirmation ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'} aria-controls="invite-confirmation" aria-pressed={showConfirmation} onClick={() => setShowConfirmation(value => !value)}>{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div></div>
        <button type="submit" className={styles.command} disabled={mode === 'saving'}>{mode === 'saving' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{mode === 'saving' ? 'Salvando…' : 'Definir minha senha'}</button>
      </form>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {mode === 'success' && student && <><StudentInvitations studentId={student.id} /><div className={styles.state}><CheckCircle2 size={24} aria-hidden="true" /><Link href="/painel" className={styles.command}>Acessar meu painel</Link></div></>}
      {mode === 'invalid' && <Link href="/recuperar-senha" className={styles.command}>Recuperar meu acesso</Link>}
      {mode !== 'loading' && mode !== 'saving' && mode !== 'success' && <Link href="/login" className={styles.back}>Voltar ao login</Link>}
    </section>
  </AuthShell>
}
