'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolveLinkedStudent } from '@/lib/fitness/personal-attention'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAlunos } from '@/hooks/use-alunos'
import { useRegistrosDoAluno } from '@/hooks/use-registros'
import { formatarData } from '@/lib/utils'
import { StudentReport } from '@/components/fitness/student-report'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function RelatoriosPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<p role="status">Carregando acompanhamento…</p>}><RelatoriosConteudo /></Suspense>
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
  const { data: alunos, isLoading: carregandoAlunos, error: erroAlunos, refetch: recarregarAlunos } = useAlunos()
  const params = useSearchParams()
  const router = useRouter()
  const alunoId = resolveLinkedStudent(params.get('aluno'), alunos ?? [])
  const initialTab = params.get('aba') === 'avaliacao' ? 'avaliacao' : params.get('aba') === 'agenda' ? 'agenda' : 'evolucao'
  function selecionarAluno(id: string) {
    router.replace(id ? `/relatorios?${new URLSearchParams({ aluno: id })}` : '/relatorios', { scroll: false })
  }
  const { data: registros, isLoading } = useRegistrosDoAluno(alunoId || undefined)

  const agrupados = agruparPorExercicio(registros ?? [])

  const heading = <PersonalPageHeader icon="relatorios" title="Relatórios" description="Sessões, evolução e avaliações dos seus alunos." />
  if (carregandoAlunos) return <PersonalWorkspace page="relatorios">{heading}<div className="h-40 skeleton" role="status" aria-label="Carregando alunos" /></PersonalWorkspace>
  if (erroAlunos) return <PersonalWorkspace page="relatorios">{heading}<div className="personal-load-error" role="alert"><p>Não foi possível carregar seus alunos.</p><button type="button" onClick={() => void recarregarAlunos()}>Tentar novamente</button></div></PersonalWorkspace>
  if (!alunos?.length) return <PersonalWorkspace page="relatorios">{heading}<Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Vincule um aluno e registre treinos para acompanhar sua evolução.</CardContent></Card></PersonalWorkspace>

  return (
    <PersonalWorkspace page="relatorios">
      {heading}
      <div className="personal-toolbar"><div className="personal-toolbar-field max-w-sm"><label htmlFor="personal-report-student">Aluno</label><select id="personal-report-student" value={alunoId} onChange={(event) => selecionarAluno(event.target.value)} className="w-full" aria-label="Selecionar aluno"><option value="">Selecione o aluno…</option>{alunos.map(aluno => <option key={aluno.vinculo_id} value={aluno.aluno_id}>{aluno.nome}</option>)}</select></div><p className="personal-results-note">Escolha um aluno para consultar seu acompanhamento.</p></div>
      <div className="personal-report-body">
      {alunoId && <StudentReport key={`${alunoId}:${initialTab}`} alunoId={alunoId} initialTab={initialTab} />}
      {alunoId && <h2 className="text-lg font-semibold">Histórico de cargas (registros anteriores e atuais)</h2>}
      {!alunoId ? (
        <p className="text-muted-foreground text-sm">
          Escolha um aluno para ver o progresso dos treinos registrados no app.
        </p>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : agrupados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Este aluno ainda não registrou execuções no app.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agrupados.map((grupo) => (
            <EvolucaoExercicio key={grupo.nome} grupo={grupo} />
          ))}
        </div>
      )}
      </div>
    </PersonalWorkspace>
  )
}

function EvolucaoExercicio({ grupo }: { grupo: Agrupado }) {
  const cargas = grupo.registros.map((r) => r.carga ?? 0)
  const melhor = Math.max(...cargas)
  const primeiro = cargas[0]
  const ultimo = cargas[cargas.length - 1]
  const evoluiu = ultimo > primeiro

  return (
    <Card className="personal-history-card">
      <CardHeader className="pb-2">
        <CardTitle className="personal-history-title flex items-center justify-between text-base">
          <span className="">{grupo.nome}</span>
          <span className="text-muted-foreground shrink-0 text-xs font-normal">
            melhor: {melhor} kg
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="personal-history-chart flex h-20 items-end gap-1" aria-hidden="true">
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
        <div className="personal-history-meta">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className={evoluiu ? 'h-3.5 w-3.5 text-primary' : 'h-3.5 w-3.5 rotate-180'} />
            {ultimo === primeiro ? 'sem variação' : `${ultimo > primeiro ? '+' : ''}${Math.round((ultimo - primeiro) * 100) / 100} kg desde o início`}
          </span>
          <span>último: {formatarData(grupo.registros[grupo.registros.length - 1].data)}</span>
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


