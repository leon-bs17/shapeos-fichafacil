'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, LayoutDashboard, Users, Dumbbell, ArrowLeft, LogOut, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

const links = [
  { href: '/admin', label: 'Dashboard', icone: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuarios', icone: Users },
  { href: '/admin/personais', label: 'Personais', icone: Users },
  { href: '/admin/exercicios', label: 'Exercicios', icone: Dumbbell },
  { href: '/admin/conta', label: 'Minha conta', icone: KeyRound },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const { data: user } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nao autenticado')
      const { data } = await supabase.from('usuarios').select('nome, email, tipo').eq('id', user.id).single()
      return data
    },
  })

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
            <Shield className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Admin</p>
            <p className="text-[10px] text-muted-foreground">Painel de gestao</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {links.map(({ href, label, icone: Icon }) => {
            const ativo = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  ativo
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {ativo && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao app
          </Link>
          <button
            onClick={sair}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        {user && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">
                {user.nome?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  )
}
