import { createClient } from 'npm:@supabase/supabase-js@2.105.0'
import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.105.0/cors'

const WEB_APP_URL = (Deno.env.get('WEB_APP_URL') || 'https://shapeos-fichafacil.vercel.app').replace(/\/$/, '')
const ALLOWED_ORIGINS = new Set([
  'https://shapeos-fichafacil.vercel.app',
  new URL(WEB_APP_URL).origin,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const headers = {
    ...sdkCorsHeaders,
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://shapeos-fichafacil.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers })

  // The browser sends this unauthenticated check before the authenticated POST.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return reply(405, { error: 'Método não permitido.' })
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(403, { error: 'Origem não permitida.' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return reply(401, { error: 'Sessão expirada. Entre novamente.' })

  let payload: unknown
  try { payload = await req.json() } catch { return reply(400, { error: 'Dados do convite inválidos.' }) }
  if (!payload || typeof payload !== 'object' || !('email' in payload) || typeof payload.email !== 'string') {
    return reply(400, { error: 'Informe um e-mail válido.' })
  }
  const email = payload.email.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Informe um e-mail válido.' })
  const nome = 'nome' in payload && typeof payload.nome === 'string' ? payload.nome.trim().slice(0, 120) : undefined

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: caller, error: authError } = await admin.auth.getUser(authHeader.slice(7))
    if (authError || !caller.user) return reply(401, { error: 'Sessão expirada. Entre novamente.' })
    const { data: profile, error: profileError } = await admin.from('usuarios').select('tipo, status_conta, nome').eq('id', caller.user.id).maybeSingle()
    if (profileError) return reply(503, { error: 'Não foi possível verificar sua conta. Tente novamente.' })
    if (profile?.tipo !== 'PERSONAL' || profile.status_conta !== 'ATIVO') {
      return reply(403, { error: 'Apenas personais com a conta ativa podem convidar alunos.' })
    }

    const { data: allowed, error: limitError } = await admin.rpc('consumir_limite_convite', {
      p_usuario_id: caller.user.id, p_limite: 10, p_janela_segundos: 60,
    })
    if (limitError) {
      console.error('convite-aluno: rate limit indisponível', limitError.code)
      return reply(503, { error: 'O serviço de convites está temporariamente indisponível. Tente novamente.' })
    }
    if (!allowed) return reply(429, { error: 'Muitos convites em sequência. Aguarde um minuto e tente novamente.' })

    const findExisting = () => admin.from('usuarios').select('id, tipo, status_conta').eq('email', email).maybeSingle()
    const { data: existing, error: lookupError } = await findExisting()
    if (lookupError) return reply(503, { error: 'Não foi possível consultar o aluno. Tente novamente.' })
    if (existing && (existing.tipo !== 'ALUNO' || existing.status_conta !== 'ATIVO')) {
      return reply(409, { error: 'Não é possível enviar um convite de aluno para esta conta.' })
    }
    if (existing) {
      const { data: link, error: linkError } = await admin.from('personal_alunos').select('id, status')
        .eq('personal_id', caller.user.id).eq('aluno_id', existing.id).maybeSingle()
      if (linkError) return reply(503, { error: 'Não foi possível verificar o vínculo. Tente novamente.' })
      if (link?.status === 'ATIVO') return reply(409, { error: 'Este aluno já está vinculado a você.' })
    }

    const now = new Date().toISOString()
    const pendingQuery = () => admin.from('convites_aluno').select('id, expira_em')
      .eq('personal_id', caller.user.id).eq('email', email).eq('estado', 'PENDENTE').gt('expira_em', now).maybeSingle()
    const { error: expireError } = await admin.from('convites_aluno').update({ estado: 'EXPIRADO' })
      .eq('personal_id', caller.user.id).eq('email', email).eq('estado', 'PENDENTE').lte('expira_em', now)
    if (expireError) return reply(503, { error: 'Não foi possível preparar o convite. Tente novamente.' })
    const { data: pending, error: pendingError } = await pendingQuery()
    if (pendingError) return reply(503, { error: 'Não foi possível consultar seus convites. Tente novamente.' })
    const invitationReply = (invite: { id: string; expira_em: string }, novo: boolean) => reply(200, {
      data: { convite: { id: invite.id, expira_em: invite.expira_em, estado: 'PENDENTE', novo } },
    })
    if (pending) return invitationReply(pending, false)
    const { data: invitation, error: insertError } = await admin.from('convites_aluno').insert({
      personal_id: caller.user.id, personal_nome: profile.nome || 'Seu personal', email,
    }).select('id, expira_em').single()
    if (insertError?.code === '23505') {
      const { data: concurrent, error: concurrentError } = await pendingQuery()
      if (!concurrentError && concurrent) return invitationReply(concurrent, false)
    }
    if (insertError || !invitation) return reply(503, { error: 'Não foi possível registrar o convite. Tente novamente.' })
    // No personal_alunos INSERT happens here. Consent is a student-only database action.
    if (existing) return invitationReply(invitation, false)

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${WEB_APP_URL}/aceitar-convite`, data: { nome, tipo: 'ALUNO' },
    })
    if (!error && data.user) return invitationReply(invitation, true)
    if (error?.code === 'email_exists' || error?.code === 'user_already_exists' || /already.*(registered|exists)/i.test(error?.message || '')) {
      const { data: student, error: retryError } = await findExisting()
      if (!retryError && student?.tipo === 'ALUNO' && student.status_conta === 'ATIVO') return invitationReply(invitation, false)
    }
    await admin.from('convites_aluno').update({ estado: 'CANCELADO' }).eq('id', invitation.id).eq('estado', 'PENDENTE')
    if (error?.status === 429) return reply(429, { error: 'O limite de envio de e-mails foi atingido. Aguarde e tente novamente.' })
    console.error('convite-aluno: falha no envio', error?.code, error?.status)
    return reply(502, { error: 'Não foi possível enviar o e-mail de convite. Tente novamente.' })
  } catch {
    console.error('convite-aluno: falha inesperada')
    return reply(503, { error: 'O serviço de convites está temporariamente indisponível. Tente novamente.' })
  }
})
