import type { ReactNode } from 'react'
import { Dumbbell } from 'lucide-react'
import { BotaoSairAluno } from '@/components/aluno/botao-sair'

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">
              Shape<span className="text-primary">OS</span>
            </span>
            <span className="text-muted-foreground text-sm">· Painel do Aluno</span>
          </div>
          <BotaoSairAluno />
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  )
}
