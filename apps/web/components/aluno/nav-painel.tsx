'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, History, LifeBuoy } from 'lucide-react'

const itens = [
  { href: '/painel', rotulo: 'Treino', icone: Dumbbell },
  { href: '/painel/historico', rotulo: 'Histórico', icone: History },
  { href: '/painel/suporte', rotulo: 'Suporte', icone: LifeBuoy },
]

export function NavPainelAluno() {
  const pathname = usePathname()

  return (
    <nav className="border-t border-border/20" aria-label="Navegação do painel do aluno">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-6 py-2 scrollbar-thin">
        {itens.map(({ href, rotulo, icone: Icone }) => {
          const ativo = href === '/painel' ? pathname === href : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                ativo
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
              aria-current={ativo ? 'page' : undefined}
            >
              <Icone className="h-4 w-4" />
              {rotulo}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
