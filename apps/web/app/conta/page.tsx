'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, CircleUserRound, Eye, EyeOff, KeyRound, UserRound } from 'lucide-react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { createClient } from '@/lib/supabase/client'

export default function ContaPersonalPage() {
  const profile = useQuery({
    queryKey: ['personal-account'],
    gcTime: 0,
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sessão expirada. Entre novamente.')
      const { data, error } = await supabase.from('usuarios').select('nome, email').eq('id', user.id).single()
      if (error) throw error
      if (!data) throw new Error('Dados da conta indisponíveis.')
      return { nome: data.nome as string | null, email: (data.email || user.email || '') as string }
    },
  })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<'password' | 'confirmation' | null>(null)
  const [success, setSuccess] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const name = profile.data?.nome?.trim() || 'Personal'
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR')

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError('')
    setInvalid(null)
    setSuccess(false)
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Use pelo menos 8 caracteres, incluindo letras e números.')
      setInvalid('password')
      passwordRef.current?.focus()
      return
    }
    if (!confirmation || confirmation !== password) {
      setError(confirmation ? 'As senhas não coincidem.' : 'Confirme a nova senha.')
      setInvalid('confirmation')
      confirmationRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sessão expirada. Entre novamente para alterar sua senha.')
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        if (updateError.code === 'same_password') throw new Error('Escolha uma senha diferente da atual.')
        if (updateError.code === 'reauthentication_needed' || updateError.code === 'session_not_found') throw new Error('Entre novamente na conta e tente alterar a senha.')
        if (updateError.code === 'weak_password') throw new Error('Escolha uma senha mais forte, com letras, números e símbolos.')
        throw new Error('Não foi possível alterar a senha. Tente novamente.')
      }
      setSuccess(true)
      setPassword('')
      setConfirmation('')
      setShowPassword(false)
      setShowConfirmation(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a senha. Tente novamente.')
    } finally { setSaving(false) }
  }

  return <DashboardShell>
    <div className="personal-overview personal-account">
      <header className="personal-page-heading"><span className="personal-heading-icon"><CircleUserRound size={21} strokeWidth={1.75} aria-hidden="true" /></span><div><h1>Minha conta</h1><p>Consulte seus dados e gerencie sua senha de acesso.</p></div></header>
      <div className="personal-account-columns">
        <section className="personal-account-panel" aria-labelledby="personal-account-data-title" aria-busy={profile.isLoading}>
          <header><UserRound size={21} strokeWidth={1.75} aria-hidden="true" /><div><h2 id="personal-account-data-title">Dados da conta</h2><p>Informações do seu perfil de Personal.</p></div></header>
          {profile.isLoading ? <p className="personal-account-state" role="status">Carregando seus dados…</p> : profile.error ? <div className="personal-account-state"><p role="alert">Não foi possível carregar os dados da conta.</p><button type="button" className="personal-account-command" disabled={profile.isFetching} onClick={() => void profile.refetch()}>{profile.isFetching ? 'Carregando…' : 'Tentar novamente'}</button></div> : <>
            <div className="personal-account-identity"><span className="personal-avatar" aria-hidden="true">{initials}</span><div><h3>{name}</h3><span>Personal</span></div></div>
            <dl><div><dt>Nome</dt><dd>{profile.data?.nome || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{profile.data?.email || 'Não informado'}</dd></div><div><dt>Perfil</dt><dd>Personal</dd></div></dl>
          </>}
        </section>
        <section className="personal-account-panel" aria-labelledby="personal-account-security-title">
          <header><KeyRound size={21} strokeWidth={1.75} aria-hidden="true" /><div><h2 id="personal-account-security-title">Segurança da conta</h2><p>Atualize sua senha de acesso.</p></div></header>
          {success && <p className="personal-account-success" role="status"><CheckCircle2 size={17} aria-hidden="true" />Senha alterada com sucesso.</p>}
          <form onSubmit={savePassword} noValidate aria-busy={saving}>
            <div className="personal-account-field"><label htmlFor="personal-new-password">Nova senha</label><div className="personal-account-password" data-invalid={invalid === 'password'}>
              <input ref={passwordRef} id="personal-new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} disabled={saving} minLength={8} required aria-invalid={invalid === 'password'} aria-describedby={'personal-password-help' + (invalid === 'password' ? ' personal-password-error' : '')} onChange={event => { setPassword(event.target.value); setSuccess(false); if (invalid === 'password') { setInvalid(null); setError('') } }} />
              <button type="button" disabled={saving} aria-label={showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'} aria-controls="personal-new-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
            </div><p id="personal-password-help">Pelo menos 8 caracteres, com letras e números.</p></div>
            <div className="personal-account-field"><label htmlFor="personal-confirm-password">Confirmar nova senha</label><div className="personal-account-password" data-invalid={invalid === 'confirmation'}>
              <input ref={confirmationRef} id="personal-confirm-password" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={confirmation} disabled={saving} required aria-invalid={invalid === 'confirmation'} aria-describedby={invalid === 'confirmation' ? 'personal-password-error' : undefined} onChange={event => { setConfirmation(event.target.value); setSuccess(false); if (invalid === 'confirmation') { setInvalid(null); setError('') } }} />
              <button type="button" disabled={saving} aria-label={showConfirmation ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'} aria-controls="personal-confirm-password" aria-pressed={showConfirmation} onClick={() => setShowConfirmation(value => !value)}>{showConfirmation ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
            </div></div>
            {error && <p id="personal-password-error" className="personal-account-error" role="alert">{error}</p>}
            <div className="personal-account-actions"><button type="submit" className="personal-account-command" disabled={saving || !profile.data}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div>
          </form>
        </section>
      </div>
    </div>
    <style jsx global>{`
      .personal-account-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start;}
      .personal-account-panel{padding:22px;border:1px solid var(--p-line);border-radius:16px;background:var(--p-panel);min-width:0;}
      .personal-account-panel>header{display:flex;align-items:center;gap:12px;margin-bottom:24px;}.personal-account-panel>header>svg{color:var(--p-brand);flex-shrink:0;}.personal-account-panel h2{font-size:14px;font-weight:600;margin:0;}.personal-account-panel>header p{font-size:11px;line-height:1.6;color:var(--p-muted);margin:4px 0 0;}
      .personal-account-identity{display:flex;gap:12px;align-items:center;margin-bottom:22px;min-width:0;}.personal-account-identity>div{min-width:0;}.personal-account-identity h3{font-size:14px;font-weight:600;overflow-wrap:anywhere;margin:0;}.personal-account-identity>div>span{font-size:11px;color:var(--p-muted);display:block;margin-top:4px;}.personal-account-panel dl{margin:0;}.personal-account-panel dl>div{padding:13px 0;border-top:1px solid var(--p-line);}.personal-account-panel dt{font-size:11px;color:var(--p-muted);margin-bottom:5px;}.personal-account-panel dd{font-size:12px;line-height:1.6;overflow-wrap:anywhere;margin:0;}
      .personal-account-panel form{display:grid;gap:18px;}.personal-account-field label{display:block;font-size:12px;font-weight:500;margin-bottom:8px;}.personal-account-field>p{font-size:11px;color:var(--p-muted);line-height:1.6;margin:7px 0 0;}
      .personal-account .personal-account-password{display:flex;align-items:center;border:1px solid var(--p-line);border-radius:13px;background:var(--p-panel);min-width:0;transition:background-color 150ms ease,border-color 150ms ease;}.personal-account .personal-account-password:focus-within{border-color:var(--p-brand);outline:1px solid var(--p-brand);outline-offset:0;}.personal-account .personal-account-password[data-invalid="true"]{border-color:var(--p-danger);}
      html body .personal-shell .personal-account-password input{border:0;outline:0;box-shadow:none;background:transparent;padding:12px;min-width:0;flex:1;width:100%;min-height:44px;font-size:14px;}.personal-account .personal-account-password button{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;padding:0;background:transparent;color:var(--p-muted);border:0;border-radius:13px;cursor:pointer;box-shadow:none;transform:none;}
      .personal-account-actions{display:flex;justify-content:flex-end;border-top:1px solid var(--p-line);padding-top:18px;}.personal-account .personal-account-command{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;background:var(--p-panel);color:var(--p-ink);font-size:12px;font-weight:500;border:1px solid var(--p-line);border-radius:13px;cursor:pointer;transition:background-color 150ms ease,border-color 150ms ease;}.personal-account button:disabled{opacity:.5;cursor:default;}.personal-account .personal-account-error{font-size:12px;line-height:1.6;color:var(--p-danger);margin:0;}.personal-account-success{display:flex;align-items:center;gap:8px;color:var(--p-brand);font-size:12px;line-height:1.6;margin:0 0 20px;}.personal-account-state{font-size:12px;line-height:1.7;color:var(--p-muted);}.personal-account-state p{margin:0 0 14px;}
      @media(hover:hover){.personal-account .personal-account-command:enabled:hover,.personal-account .personal-account-password:not(:has(input:disabled)):not(:focus-within):hover{background:color-mix(in srgb,var(--p-brand) 7%,var(--p-panel));border-color:color-mix(in srgb,var(--p-brand) 40%,var(--p-line));}}
      .personal-account .personal-account-command:enabled:active{background:color-mix(in srgb,var(--p-brand) 7%,var(--p-panel));border-color:color-mix(in srgb,var(--p-brand) 40%,var(--p-line));}
      @media(max-width:767px){.personal-account-columns{grid-template-columns:minmax(0,1fr);gap:16px;}.personal-account-panel{padding:18px;}.personal-account .personal-account-password input{font-size:16px;}.personal-account-actions .personal-account-command{width:100%;}}
      @media(prefers-reduced-motion:reduce){.personal-account :is(.personal-account-command,.personal-account-password){transition:none;}}
    `}</style>
  </DashboardShell>
}
