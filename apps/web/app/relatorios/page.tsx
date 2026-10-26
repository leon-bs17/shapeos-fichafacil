'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolveLinkedStudent } from '@/lib/fitness/personal-attention'
import { TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAlunos } from '@/hooks/use-alunos'
import { useRegistrosDoAluno } from '@/hooks/use-registros'
import { formatarData } from '@/lib/utils'
import { StudentReport } from '@/components/fitness/student-report'
import { PersonalReportOverview } from '@/components/fitness/personal-report-overview'
import { PersonalReportIndicators } from '@/components/fitness/personal-report-indicators'
import { ReportStudentPicker } from '@/components/fitness/report-student-picker'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { groupLoadHistory, summarizeLoadHistory, type LoadHistoryGroup } from '@/lib/fitness/load-history'
import { comparisonWindows, type PeriodDays } from '@/lib/fitness/period-comparison'
import styles from '@/components/fitness/personal-report.module.css'

export default function RelatoriosPage() {
  return <DashboardShell><Suspense fallback={<p role="status">Carregando acompanhamento…</p>}><RelatoriosConteudo /></Suspense></DashboardShell>
}
function RelatoriosConteudo() {
  const { data: alunos, isLoading: carregandoAlunos, error: erroAlunos, refetch: recarregarAlunos } = useAlunos()
  const params = useSearchParams()
  const router = useRouter()
  const students = alunos?.filter(aluno => aluno.status === 'ATIVO') ?? []
  const alunoId = resolveLinkedStudent(params.get('aluno'), students)
  const student = students.find(aluno => aluno.aluno_id === alunoId)
  const tab = ['agenda', 'avaliacao', 'analise'].includes(params.get('aba') ?? '') ? params.get('aba')! : 'evolucao'
  const days: PeriodDays = params.get('dias') === '7' ? 7 : params.get('dias') === '90' ? 90 : 30
  function navigate(id: string, aba: string, period: PeriodDays = days) {
    const query = new URLSearchParams()
    if (id) query.set('aluno', id)
    if (aba !== 'evolucao') query.set('aba', aba)
    if (period !== 30) query.set('dias', String(period))
    router.replace('/relatorios' + (query.size ? '?' + query.toString() : ''), { scroll: false })
  }
  const { data: registros, isLoading, error: erroRegistros, refetch: recarregarRegistros } = useRegistrosDoAluno(tab === 'analise' ? alunoId || undefined : undefined, days)
  const analysisWindow = comparisonWindows(days)
  const agrupados = groupLoadHistory((registros ?? []).filter(registro => {
    const date = Date.parse(registro.data_registro)
    return Number.isFinite(date) && date >= Date.parse(analysisWindow.start) && date <= Date.parse(analysisWindow.end)
  }))
  const heading = <PersonalPageHeader icon="relatorios" title="Relatórios" description="Sessões, evolução e avaliações dos seus alunos." />
  return <PersonalWorkspace page="relatorios">{heading}<div className={styles.page}>
    <section className={styles.banner} data-shapeos-banner>
      <div><p data-shapeos-banner-label>Relatórios do Personal</p><h2>Acompanhamento dos <span>alunos</span></h2><p>Veja a evolução dos treinos, frequência e avaliações em um só lugar.</p></div>
      <svg className={styles.wireframe} viewBox="0 0 360 140" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth=".8">
          {[0, 1, 2, 3, 4].map(index => <path key={index} d={`M10 ${105 + index * 5} C70 ${80 + index * 5},100 ${120 + index * 5},160 ${65 + index * 5} S240 ${90 + index * 5},350 ${22 + index * 5}`} />)}
          {[0, 1, 2, 3].map(index => <rect key={index} x={220 + index * 25} y={95 - index * 17} width="12" height={20 + index * 17} rx="2" />)}
        </g>
      </svg>
    </section>
    {carregandoAlunos ? <div className={styles.state} role="status">Carregando alunos…</div> :
      erroAlunos ? <div className={styles.state} role="alert"><p>Não foi possível carregar seus alunos.</p><button type="button" onClick={() => void recarregarAlunos()}>Tentar novamente</button></div> :
      !students.length ? <div className={styles.state}><p>Vincule um aluno para acompanhar sessões e avaliações nesta página.</p></div> :
      <>
        <section className={styles.filters} aria-label="Filtros do relatório">
          <ReportStudentPicker students={students} value={alunoId} onChange={id => navigate(id, 'evolucao')} />
          <div className={styles.periodGroup}><span className={styles.label}>Período da análise</span><div className={styles.periods} role="group" aria-label="Período da análise">
            {([7, 30, 90] as const).map(period => <button type="button" key={period} aria-pressed={days === period} onClick={() => navigate(alunoId, tab, period)}>{period} dias</button>)}
          </div></div>
        </section>
        {!student ? <div className={styles.state}><Users size={26} aria-hidden="true" /><h2>Escolha um aluno para começar</h2><p>Selecione o aluno acima para consultar sessões, frequência e avaliações.</p></div> : <>
          <PersonalReportIndicators key={'indicators:' + alunoId + ':' + days} alunoId={alunoId} studentName={student.nome} days={days} />
          <nav className={styles.tabs} aria-label="Seções do relatório">
            {[['evolucao', 'Resumo'], ['analise', 'Cargas e medidas'], ['agenda', 'Agenda e adesão'], ['avaliacao', 'Avaliações físicas']].map(([id, label]) =>
              <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(alunoId, id)}>{label}</button>)}
          </nav>
          {tab === 'evolucao' ? <PersonalReportOverview key={alunoId + ':' + days} alunoId={alunoId} studentName={student.nome} days={days} hideSessionMetric onAssessments={() => navigate(alunoId, 'avaliacao')} /> :
            <div className="personal-report-body">
              <StudentReport key={alunoId + ':' + tab} alunoId={alunoId} initialTab={tab === 'agenda' ? 'agenda' : tab === 'avaliacao' ? 'avaliacao' : 'evolucao'} hideNavigation periodDays={days} hideProgressMetrics />
              {tab === 'analise' && <><h2>Histórico de cargas</h2>
                {isLoading ? <p role="status">Carregando registros de exercícios…</p> :
                  erroRegistros ? <div className={styles.state} role="alert"><p>Não foi possível carregar o histórico de cargas.</p><button type="button" onClick={() => void recarregarRegistros()}>Tentar novamente</button></div> :
                  !agrupados.length ? <div className={styles.state}>Nenhuma execução registrada no período selecionado.</div> :
                  <div className="grid gap-4 md:grid-cols-2">{agrupados.map(grupo => <EvolucaoExercicio key={grupo.id} grupo={grupo} />)}</div>}
              </>}
            </div>}
        </>}
      </>}
  </div></PersonalWorkspace>
}

function EvolucaoExercicio({ grupo }: { grupo: LoadHistoryGroup }) {
  const { points, best, difference, missing, latest } = summarizeLoadHistory(grupo)
  return <Card className="personal-history-card">
    <CardHeader className="pb-2"><CardTitle className="personal-history-title flex items-center justify-between text-base">
      <span>{grupo.nome}</span><span className="text-muted-foreground shrink-0 text-xs font-normal">melhor: {best == null ? '—' : `${best} kg`}</span>
    </CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <div className="personal-history-chart flex h-20 items-end gap-1 overflow-x-auto" aria-hidden="true">{points.map(point => <div key={point.id}
        className={point.carga == null ? 'min-w-[8px] flex-1 rounded-t bg-muted' : point.carga === best ? 'min-w-[8px] flex-1 rounded-t bg-primary' : 'bg-primary/30 min-w-[8px] flex-1 rounded-t'}
        style={{ height: `${point.carga != null && best != null && best > 0 ? Math.max(point.carga / best * 100, 4) : 4}%` }}
        data-shapeos-tooltip={point.carga == null ? 'Carga não informada' : `${point.carga} kg`} />)}</div>
      <div className="personal-history-meta"><span className="inline-flex items-center gap-1">
        {difference != null && <TrendingUp className={difference >= 0 ? 'h-3.5 w-3.5 text-primary' : 'h-3.5 w-3.5 rotate-180'} />}
        {difference == null ? 'Dados insuficientes para comparar' : difference === 0 ? 'Sem variação entre cargas informadas' : `${difference > 0 ? '+' : ''}${Math.round(difference * 100) / 100} kg entre cargas informadas`}
      </span>{latest && <span>último registro: {formatarData(latest)}</span>}</div>
      {missing > 0 && <p className="text-xs text-muted-foreground">{missing} {missing === 1 ? 'registro sem carga informada' : 'registros sem carga informada'}. Esses valores não são considerados zero.</p>}
    </CardContent>
  </Card>
}
