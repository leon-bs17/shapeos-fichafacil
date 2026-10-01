import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ConvitePayload {
  email: string
  nome?: string
}

const ALLOWED_ORIGINS = [
  'https://shapeos-fichafacil.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGINS.includes(origin ?? '')
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Metodo não permitido' },
      { status: 405, headers }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Não autenticado' },
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
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')
  if (!emailValido) {
    return Response.json(
      { error: 'E-mail invalido' },
      { status: 400, headers }
    )
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const token = authHeader.slice('Bearer '.length)
  const { data: chamador, error: erroUsuario } = await admin.auth.getUser(token)
  if (erroUsuario || !chamador.user) {
    return Response.json(
      { error: 'Sessao invalida' },
      { status: 401, headers }
    )
  }

  const { data: perfilChamador, error: erroPerfil } = await admin
    .from('usuarios')
    .select('tipo')
    .eq('id', chamador.user.id)
    .maybeSingle()

  if (erroPerfil || perfilChamador?.tipo !== 'PERSONAL') {
    return Response.json(
      { error: 'Apenas personal trainers podem convidar alunos.' },
      { status: 403, headers }
    )
  }

  const { data: permitido, error: erroLimite } = await admin.rpc(
    'consumir_limite_convite',
    {
      p_usuario_id: chamador.user.id,
      p_limite: 10,
      p_janela_segundos: 60,
    }
  )

  if (erroLimite) {
    console.error('Falha ao verificar rate limit', erroLimite)
    return Response.json(
      { error: 'Não foi possivel validar o limite de convites.' },
      { status: 503, headers }
    )
  }

  if (!permitido) {
    return Response.json(
      { error: 'Rate limit excedido' },
      { status: 429, headers }
    )
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email!, {
    redirectTo: \`\${Deno.env.get('WEB_APP_URL') ?? ''}/login\`,
    data: { nome: payload.nome?.trim() || undefined, tipo: 'ALUNO' },
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
    const { data: perfil, error: erroBusca } = await admin
      .from('usuarios')
      .select('id, tipo')
      .eq('email', email)
      .maybeSingle()

    if (erroBusca) {
      return Response.json(
        { error: 'Falha ao consultar usuario existente.' },
        { status: 500, headers }
      )
    }

    if (perfil?.id && perfil.tipo === 'ALUNO') {
      return Response.json(
        { data: { user: { id: perfil.id, novo: false } } },
        { status: 200, headers }
      )
    }

    if (perfil?.id) {
      return Response.json(
        { error: 'Este e-mail pertence a uma conta que não e de aluno.' },
        { status: 409, headers }
      )
    }
  }

  return Response.json(
    { error: error?.message ?? 'Falha no convite' },
    { status: 400, headers }
  )
})
