import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ConvitePayload {
  email: string
  nome?: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método não permitido' }, { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let payload: ConvitePayload
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const email = payload.email?.trim().toLowerCase()
  if (!email) {
    return Response.json({ error: 'E-mail obrigatório' }, { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: chamador } = await admin.auth.getUser(token)
  if (!chamador.user) {
    return Response.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const { data: perfilChamador } = await admin
    .from('usuarios')
    .select('tipo')
    .eq('id', chamador.user.id)
    .maybeSingle()

  if (perfilChamador?.tipo !== 'PERSONAL') {
    return Response.json(
      { error: 'Apenas personal trainers podem convidar alunos.' },
      { status: 403 }
    )
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${Deno.env.get('WEB_APP_URL') ?? ''}/login`,
    data: { nome: payload.nome, tipo: 'ALUNO' },
  })

  if (!error && data.user) {
    return Response.json(
      { data: { user: { id: data.user.id, novo: true } } },
      { status: 200 }
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
        { status: 200 }
      )
    }
  }

  return Response.json(
    { error: error?.message ?? 'Falha no convite' },
    { status: 400 }
  )
})
