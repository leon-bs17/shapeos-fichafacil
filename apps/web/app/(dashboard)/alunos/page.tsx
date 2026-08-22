'use client'

import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAlunos } from '@/hooks/use-alunos'

export default function AlunosPage() {
  const { data: alunos, isLoading } = useAlunos()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
        <p className="text-muted-foreground text-sm">
          Convide alunos por e-mail e gerencie vínculos.
        </p>
      </header>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : alunos?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum aluno vinculado</p>
            <p className="text-muted-foreground text-sm max-w-md">
              Use a Edge Function `convite-aluno` ou insira o vínculo em
              personal_alunos após o cadastro do aluno.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {alunos?.map((a) => (
            <li
              key={a.vinculo_id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{a.nome}</p>
                <p className="text-muted-foreground text-sm">{a.email}</p>
              </div>
              <span
                className={
                  a.status === 'ATIVO'
                    ? 'rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
                    : 'rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                }
              >
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
