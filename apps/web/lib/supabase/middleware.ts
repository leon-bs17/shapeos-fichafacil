import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    // API handlers authenticate and authorize requests themselves. Page-role
    // redirects must never turn an API response into an HTML dashboard.
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/apresentacao' ||
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

  // Recovery and OAuth callbacks must finish before profile routing or sign-out.
  // These pages only update the authenticated user's password; app access remains gated below.
  if (pathname === '/auth/callback' || pathname === '/recuperar-senha' || pathname === '/admin/redefinir-senha' || pathname === '/aceitar-convite') {
    return response
  }

  function redirectWithSession(url: URL) {
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie.name, cookie.value, cookie))
    return redirect
  }

  const isAdminArea = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  const isAdminRecovery = pathname === '/admin/redefinir-senha'
  const isPainelAluno = pathname.startsWith('/painel')

  const isPublic =
    isAdminLogin ||
    isAdminRecovery ||
    pathname === '/login' ||
    pathname.startsWith('/cadastro') ||
    pathname === '/recuperar-senha' ||
    pathname.startsWith('/auth/callback')

  if (!user) {
    if (isAdminArea && !isAdminLogin && !isAdminRecovery) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return redirectWithSession(url)
    }
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return redirectWithSession(url)
    }
    return response
  }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('tipo, status_conta')
    .eq('id', user.id)
    .single()

  const tipo = perfil?.tipo as 'PERSONAL' | 'ALUNO' | 'ADMIN' | undefined
  const status = perfil?.status_conta as 'ATIVO' | 'PENDENTE' | 'BLOQUEADO' | undefined

  if (!tipo) {
    if (pathname === '/login' || pathname === '/admin/login') {
      return response
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'perfil')
    return redirectWithSession(url)
  }

  if (status && status !== 'ATIVO') {
    // Revoga a sessão no navegador assim que uma conta pendente/bloqueada
    // tenta acessar qualquer rota. O banco continua sendo a fonte da verdade.
    await supabase.auth.signOut()

    if (pathname === '/login') {
      return response
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('error', status === 'PENDENTE' ? 'pendente' : 'bloqueado')

    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  if (tipo === 'ADMIN') {
    if ((!isAdminArea || isAdminLogin) && !isAdminRecovery) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return redirectWithSession(url)
    }
    return response
  }

  if (isAdminArea) {
    const url = request.nextUrl.clone()
    url.pathname = tipo === 'ALUNO' ? '/painel' : '/'
    return redirectWithSession(url)
  }

  if (tipo === 'ALUNO' && !isPainelAluno) {
    const url = request.nextUrl.clone()
    url.pathname = '/painel'
    return redirectWithSession(url)
  }

  if (tipo === 'PERSONAL' && isPainelAluno) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return redirectWithSession(url)
  }

  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = tipo === 'ALUNO' ? '/painel' : '/'
    return redirectWithSession(url)
  }

  return response
}

