import type { ReactNode } from 'react'
import { BotaoSairAluno } from '@/components/aluno/botao-sair'
import { Logo } from '@/components/layout/logo'

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1A1A1A] text-[#F5F5F5] tech-bg">
      <div className="fixed inset-0 tech-grid-subtle pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 tech-noise pointer-events-none" aria-hidden="true" />
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#1A1A1A]/75 backdrop-blur-xl">
        <div className="relative mx-auto flex h-20 max-w-5xl items-center justify-between px-5 md:px-6">
          <Logo size="md" />
          <BotaoSairAluno />
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-5 py-8 md:px-6 md:py-10 scrollbar-thin">{children}</main>
    </div>
  )
}
