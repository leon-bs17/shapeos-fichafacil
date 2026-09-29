import type { ReactNode } from 'react'
import { BotaoSairAluno } from '@/components/aluno/botao-sair'
import { NavPainelAluno } from '@/components/aluno/nav-painel'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Logo } from '@/components/layout/logo'

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen tech-bg tech-grid-subtle">
      <header className="glass sticky top-0 z-40 border-b border-border/30">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Logo size="md" />
            <span className="text-sm text-muted-foreground">· Painel do Aluno</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BotaoSairAluno />
          </div>
        </div>
        <NavPainelAluno />
      </header>
      <main className="mx-auto max-w-5xl p-6 scrollbar-thin">{children}</main>
    </div>
  )
}
