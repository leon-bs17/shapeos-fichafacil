'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Dumbbell, KeyRound, LayoutDashboard, LogOut, Megaphone, Shield, UserCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProductTopbar } from '@/components/layout/product-topbar'
import { ProductFooter } from '@/components/layout/product-footer'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/personais', label: 'Personais', icon: UserCheck },
  { href: '/admin/exercicios', label: 'Exercícios', icon: Dumbbell },
  { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { href: '/admin/conta', label: 'Minha conta', icon: KeyRound },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card shadow-[inset_-1px_0_0_hsl(var(--border)/0.72)]">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">ShapeOS Admin</p>
            <p className="text-[10px] text-muted-foreground">Operação e produto</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 p-3">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-foreground/[0.035] hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao produto
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/8 hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="ml-64 min-h-screen">
        <ProductTopbar label="Admin · Gestão da plataforma" maxWidth="max-w-none" onLogout={sair} />
        <main className="px-8 py-7">
          {children}
          <ProductFooter />
        </main>
      </div>
    </div>
  )
}
