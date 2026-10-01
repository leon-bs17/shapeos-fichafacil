import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  const next = requestedNext === '/admin/redefinir-senha' || requestedNext === '/recuperar-senha' ? requestedNext : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Fluxo de redefinicao de senha: respeita o destino do link
      if (next !== '/') {
        return NextResponse.redirect(`${origin}${next}${next === '/recuperar-senha' ? '?recovery=1' : ''}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('id', user.id)
          .single()

        if (perfil?.tipo === 'ALUNO') {
          return NextResponse.redirect(`${origin}/painel`)
        }
        if (perfil?.tipo === 'ADMIN') {
          return NextResponse.redirect(`${origin}/admin`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const failurePath = next === '/admin/redefinir-senha' ? '/admin/redefinir-senha' : next === '/recuperar-senha' ? '/recuperar-senha' : '/login'
  return NextResponse.redirect(`${origin}${failurePath}?error=auth`)
}
