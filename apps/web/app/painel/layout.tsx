import type { ReactNode } from 'react'
import { Dumbbell } from 'lucide-react'
import { BotaoSairAluno } from '@/components/aluno/botao-sair'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen tech-bg tech-grid-subtle">
      <header className="glass border-b border-border/30 sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-primary-subtle">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight">
              Shape<span className="text-primary">OS</span>
            </span>
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
