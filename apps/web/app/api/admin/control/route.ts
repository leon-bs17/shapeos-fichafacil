import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
const actions = new Set(['EDITAR_USUARIO', 'VINCULAR', 'DESATIVAR_VINCULO', 'EDITAR_TREINO', 'CONFIGURAR'])
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Origem inválida' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
  const { data: profile } = await supabase.from('usuarios').select('tipo,status_conta').eq('id', user.id).single()
  if (profile?.tipo !== 'ADMIN' || profile.status_conta !== 'ATIVO') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 }) }
  if (!body || !actions.has(body.acao) || (body.id != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) || !body.dados || typeof body.dados !== 'object' || Array.isArray(body.dados)) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  const { data, error } = await supabase.rpc('admin_control', { p_acao: body.acao, p_id: body.id ?? null, p_dados: body.dados })
  if (error) return NextResponse.json({ error: error.code === 'PGRST202' ? 'Instale a migração 0013 no Supabase para ativar estes controles.' : error.message }, { status: error.code === '42501' ? 403 : 400 })
  return NextResponse.json({ data })
}
