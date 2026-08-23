import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ConvitePayload {
  email: string
  nome?: string
}

const ALLOWED_ORIGINS = [
  'https://shapeos-fichafacil.vercel.app',
  'http://localhost:3000',
]

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGINS.includes(origin ?? '')
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < windowMs)
  if (recent.length >= limit) return false
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return true
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Metodo nao permitido' },
      { status: 405, headers }
    )
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: 'Rate limit excedido' },
      { status: 429, headers }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return Response.json(
      { error: 'Nao autenticado' },
      { status: 401, headers }
    )
  }

  let payload: ConvitePayload
  try {
    payload = await req.json()
  } catch {
    return Response.json(
      { error: 'JSON invalido' },
      { status: 400, headers }
    )
  }

  const email = payload.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return Response.json(
      { error: 'E-mail invalido' },
      { status: 400, headers }
    )
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: chamador } = await admin.auth.getUser(token)
  if (!chamador.user) {
    return Response.json(
      { error: 'Sessao invalida' },
      { status: 401, headers }
    )
  }

  const { data: perfilChamador } = await admin
    .from('usuarios')
    .select('tipo')
    .eq('id', chamador.user.id)
    .maybeSingle()

  if (perfilChamador?.tipo !== 'PERSONAL') {
    return Response.json(
      { error: 'Apenas personal trainers podem convidar alunos.' },
      { status: 403, headers }
    )
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${Deno.env.get('WEB_APP_URL') ?? ''}/login`,
    data: { nome: payload.nome, tipo: 'ALUNO' },
  })

  if (!error && data.user) {
    return Response.json(
      { data: { user: { id: data.user.id, novo: true } } },
      { status: 200, headers }
    )
  }

  if (
    error &&
    (error.message.includes('already been registered') ||
      error.message.includes('already exists'))
  ) {
    const { data: perfil } = await admin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (perfil?.id) {
      return Response.json(
        { data: { user: { id: perfil.id, novo: false } } },
        { status: 200, headers }
      )
    }
  }

  return Response.json(
    { error: error?.message ?? 'Falha no convite' },
    { status: 400, headers }
  )
})
