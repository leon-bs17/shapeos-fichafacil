import type { SupabaseClient } from '@supabase/supabase-js'

const INVALID_LINK = 'Este convite é inválido ou expirou. Recupere seu acesso ou peça ajuda ao seu personal.'

async function activeStudent(supabase: SupabaseClient, expectedId?: string) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user || (expectedId && data.user.id !== expectedId)) throw new Error(INVALID_LINK)
  const { data: profile, error: profileError } = await supabase.from('usuarios').select('tipo, status_conta').eq('id', data.user.id).single()
  if (profileError) throw new Error('Não foi possível verificar sua conta. Tente abrir o convite novamente.')
  if (profile?.tipo !== 'ALUNO' || profile.status_conta !== 'ATIVO') throw new Error('Este convite não está disponível para esta conta.')
  return { id: data.user.id, email: data.user.email || '' }
}

/** Only explicit invitation credentials may start first-password setup. */
export async function prepareStudentInvite(supabase: SupabaseClient, url: URL) {
  const query = url.searchParams
  const hash = new URLSearchParams(url.hash.slice(1))
  if (query.has('error') || hash.has('error')) throw new Error(INVALID_LINK)

  const tokenHash = query.get('token_hash')
  const code = query.get('code')
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  let error
  if (tokenHash && query.get('type') === 'invite') {
    ;({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' }))
  } else if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (accessToken && refreshToken && hash.get('type') === 'invite') {
    ;({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }))
  } else {
    throw new Error(INVALID_LINK)
  }
  if (error) throw new Error(INVALID_LINK)
  return activeStudent(supabase)
}

export async function saveStudentInvitePassword(supabase: SupabaseClient, userId: string, password: string, confirmation: string) {
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Use pelo menos 8 caracteres, com letras e números.')
  }
  if (password !== confirmation) throw new Error('As senhas não coincidem.')
  await activeStudent(supabase, userId)
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error('Não foi possível salvar sua senha. Tente novamente ou recupere seu acesso.')
}
