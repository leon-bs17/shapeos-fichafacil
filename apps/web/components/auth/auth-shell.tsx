import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, ClipboardList, Users } from 'lucide-react'
import Logo from '@/davi/components/Logo'

export function AuthShell({ children, compact = false, testId }: { children: ReactNode; compact?: boolean; testId?: string }) {
  return (
    <main data-testid={testId} className={`shapeos-auth min-h-svh bg-background text-foreground ${compact ? '' : 'lg:grid lg:grid-cols-2'}`}>
      <div className="flex min-h-svh flex-col px-5 py-6 sm:px-10">
        <header className={`flex items-center justify-between gap-4 ${compact ? 'mx-auto w-full max-w-md' : ''}`}>
          <Link href="/apresentacao" aria-label="ShapeOS — página de apresentação"><Logo size="sm" /></Link>
          <Link href="/apresentacao" className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Conhecer a ShapeOS</Link>
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10"><div className="w-full">{children}</div></div>
        <footer className="text-center text-xs text-muted-foreground">ShapeOS · Seu espaço para planejar e treinar</footer>
      </div>
      {!compact && <aside aria-label="Sobre a ShapeOS" className="hidden flex-col justify-center border-l border-border bg-card/40 p-12 lg:flex xl:p-20">
        <div className="mx-auto w-full max-w-lg">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sua rotina, em um só lugar</p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">Organize o trabalho.<br /><span className="text-primary">Concentre-se no treino.</span></h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">Um espaço para personal trainers e alunos conectarem planejamento e execução.</p>
          <div className="mt-10 space-y-3">{[{ icon: Users, title: 'Alunos e personal', text: 'Cada perfil com seu espaço na plataforma.' }, { icon: ClipboardList, title: 'Fichas organizadas', text: 'Exercícios e programação sempre à mão.' }, { icon: CalendarDays, title: 'Clareza para a semana', text: 'Uma rotina de treino fácil de consultar.' }].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4"><Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div></div>)}</div>
        </div>
      </aside>}
    </main>
  )
}
