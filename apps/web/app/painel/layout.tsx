import type { ReactNode } from 'react'
import { BotaoSairAluno } from '@/components/aluno/botao-sair'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Logo } from '@/components/layout/logo'

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen tech-bg tech-grid-subtle">
      <header className="glass border-b border-border/30 sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Logo size="md" />
            <span className="text-muted-foreground text-sm">· Painel do Aluno</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BotaoSairAluno />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6 scrollbar-thin">{children}</main>
    </div>
  )
}
