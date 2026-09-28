import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(js|css|woff2?|png|jpg|jpeg|svg|gif|ico|webp)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options: import('@supabase/ssr').CookieOptions
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdminArea = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  const isAdminRecovery = pathname === '/admin/redefinir-senha'
  const isPainelAluno = pathname.startsWith('/painel')

  const isPublic =
    isAdminLogin ||
    isAdminRecovery ||
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname === '/recuperar-senha' ||
    pathname.startsWith('/auth/callback')

  if (!user) {
    if (isAdminArea && !isAdminLogin && !isAdminRecovery) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return response
  }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('tipo')
    .eq('id', user.id)
    .single()

  const tipo = perfil?.tipo as 'PERSONAL' | 'ALUNO' | 'ADMIN' | undefined

  if (!tipo) {
    if (pathname === '/login' || pathname === '/admin/login') {
      return response
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'perfil')
    return NextResponse.redirect(url)
  }

  if (tipo === 'ADMIN') {
    if ((!isAdminArea || isAdminLogin) && !isAdminRecovery) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return response
  }

  if (isAdminArea) {
    const url = request.nextUrl.clone()
    url.pathname = tipo === 'ALUNO' ? '/painel' : '/'
    return NextResponse.redirect(url)
  }

  if (tipo === 'ALUNO' && !isPainelAluno) {
    const url = request.nextUrl.clone()
    url.pathname = '/painel'
    return NextResponse.redirect(url)
  }

  if (tipo === 'PERSONAL' && isPainelAluno) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = tipo === 'ALUNO' ? '/painel' : '/'
    return NextResponse.redirect(url)
  }

  return response
}
