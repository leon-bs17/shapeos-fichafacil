import { updateSession } from '@/lib/supabase/middleware'

const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export { config }

export default updateSession
