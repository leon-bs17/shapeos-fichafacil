'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAlunos } from '@/hooks/use-alunos'
import { useRegistrosDoAluno } from '@/hooks/use-registros'
import { formatarData } from '@/lib/utils'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Combobox } from '@/components/ui/combobox'
import { EmptyState } from '@/components/ui/empty-state'

export default function RelatoriosPage() {
  return (
    <DashboardShell>
      <RelatoriosConteudo />
    </DashboardShell>
  )
}


interface Agrupado {
  nome: string
  registros: {
    carga: number | null
    reps: number | null
    data: string
  }[]
}

function RelatoriosConteudo() {
  const { data: alunos, isLoading: carregandoAlunos } = useAlunos()
  const [alunoId, setAlunoId] = useState('')
  const { data: registros, isLoading } = useRegistrosDoAluno(alunoId || undefined)

  const agrupados = agruparPorExercicio(registros ?? [])

  if (carregandoAlunos) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />
  }

  if (alunos?.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <Card>
          <EmptyState
            icon={Users}
            title="Nenhum aluno para analisar"
            description="Vincule um aluno e, quando ele registrar execuções, a evolução aparecerá aqui."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Evolução de carga por exercício.
        </p>
      </header>

      <div className="max-w-sm">
        <Combobox
          value={alunoId}
          onChange={setAlunoId}
          placeholder="Selecionar aluno..."
          searchPlaceholder="Buscar aluno..."
          emptyText="Nenhum aluno encontrado."
          options={(alunos ?? []).map((a) => ({ value: a.aluno_id, label: a.nome }))}
        />
      </div>

      {!alunoId ? (
        <Card>
          <EmptyState icon={BarChart3} title="Escolha um aluno" description="Selecione acima quem você quer analisar para abrir o histórico de evolução." compact />
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : agrupados.length === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="Ainda sem histórico" description="Este aluno ainda não registrou execuções no app." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agrupados.map((grupo) => (
            <EvolucaoExercicio key={grupo.nome} grupo={grupo} />
          ))}
        </div>
      )}
    </div>
  )
}

function EvolucaoExercicio({ grupo }: { grupo: Agrupado }) {
  const cargas = grupo.registros.map((r) => r.carga ?? 0)
  const melhor = Math.max(...cargas)
  const primeiro = cargas[0]
  const ultimo = cargas[cargas.length - 1]
  const evoluiu = ultimo > primeiro

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{grupo.nome}</span>
          <span className="text-muted-foreground shrink-0 text-xs font-normal">
            melhor: {melhor} kg
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-20 items-end gap-1" aria-hidden="true">
          {cargas.map((carga, i) => (
            <div
              key={i}
              className={
                carga === melhor
                  ? 'min-w-[8px] flex-1 rounded-t bg-primary'
                  : 'bg-primary/30 min-w-[8px] flex-1 rounded-t'
              }
              style={{ height: `${melhor > 0 ? Math.max((carga / melhor) * 100, 4) : 4}%` }}
              title={`${carga} kg`}
            />
          ))}
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className={evoluiu ? 'h-3.5 w-3.5 text-primary' : 'h-3.5 w-3.5 rotate-180'} />
            {evoluiu ? `+${ultimo - primeiro} kg desde o início` : 'sem variação'}
          </span>
          <span>último: {formatarData(grupo.registros[0].data)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function agruparPorExercicio(
  registros: { carga_utilizada: number | null; repeticoes_feitas: number | null; data_registro: string; exercicio_nome: string }[]
): Agrupado[] {
  const mapa = new Map<string, Agrupado>()

  for (const r of registros) {
    let grupo = mapa.get(r.exercicio_nome)
    if (!grupo) {
      grupo = { nome: r.exercicio_nome, registros: [] }
      mapa.set(r.exercicio_nome, grupo)
    }
    grupo.registros.push({
      carga: r.carga_utilizada,
      reps: r.repeticoes_feitas,
      data: r.data_registro,
    })
  }

  for (const grupo of mapa.values()) {
    grupo.registros.sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    )
  }

  return [...mapa.values()]
}
