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

  const { email, nome } = payload
  if (!email) {
    return Response.json({ error: 'E-mail obrigatório' }, { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${Deno.env.get('WEB_APP_URL') ?? ''}/login`,
    data: { nome, tipo: 'ALUNO' },
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ data }, { status: 200 })
})
