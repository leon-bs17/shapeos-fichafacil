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

  const isPublic =
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  let tipo: 'PERSONAL' | 'ALUNO' | 'ADMIN' | null = null
  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', user.id)
      .single()
    tipo = (perfil?.tipo as 'PERSONAL' | 'ALUNO' | 'ADMIN') ?? null
  }

  const isAdmin = pathname.startsWith('/admin')
  const isPainelAluno = pathname.startsWith('/painel')

  if (user && tipo === 'ADMIN' && !isAdmin && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (user && tipo === 'ADMIN' && !isAdmin && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (user && tipo !== 'ADMIN' && isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = tipo === 'ALUNO' ? '/painel' : '/'
    return NextResponse.redirect(url)
  }

  if (user && tipo === 'ALUNO' && !isPainelAluno && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/painel'
    return NextResponse.redirect(url)
  }

  if (user && tipo === 'PERSONAL' && isPainelAluno) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    if (tipo === 'ADMIN') url.pathname = '/admin'
    else if (tipo === 'ALUNO') url.pathname = '/painel'
    else url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
