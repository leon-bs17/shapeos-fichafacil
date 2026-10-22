'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { assessmentDeadline, calendarDaysUntil } from '@/lib/fitness/deadlines'
import { getAssessmentSchedule, saveAssessmentSchedule } from '@/services/assessment-schedule'

export function AssessmentSchedule({ alunoId, latestAssessment }: { alunoId: string; latestAssessment?: string | null }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['personal-assessment-schedule', alunoId], queryFn: () => getAssessmentSchedule(alunoId), gcTime: 0 })
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const value = draft ?? query.data ?? ''
  const status = assessmentDeadline(query.data, latestAssessment)
  const dirty = value !== (query.data ?? '')
  async function save() {
    setError(''); setSuccess('')
    if (value && calendarDaysUntil(value) == null) { setError('Informe uma data válida.'); return }
    setBusy(true)
    try {
      await saveAssessmentSchedule(alunoId, value || null)
      queryClient.setQueryData(['personal-assessment-schedule', alunoId], value || null)
      void queryClient.invalidateQueries({ queryKey: ['personal-attention'] })
      setDraft(null)
      setSuccess(value ? 'Próxima avaliação salva.' : 'Agendamento removido.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a data.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-2xl border bg-card p-5 space-y-4" aria-labelledby="assessment-schedule-title" aria-busy={query.isFetching || busy}>
    <div><h2 id="assessment-schedule-title" className="text-lg font-semibold">Próxima avaliação</h2><p className="mt-1 text-xs text-muted-foreground">Defina uma data para este aluno. O aviso aparece na Visão Geral a partir do dia marcado.</p></div>
    {query.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando agendamento…</p> : query.isError ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Não foi possível carregar a data.</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : <>
      <div className="space-y-1.5 max-w-sm"><Label htmlFor="next-assessment-date">Data prevista (opcional)</Label><Input id="next-assessment-date" type="date" min="0001-01-01" max="9999-12-31" value={value} disabled={busy} onChange={event => { setDraft(event.target.value); setSuccess(''); setError('') }} aria-describedby="next-assessment-status" /></div>
      <p id="next-assessment-status" className="text-xs text-muted-foreground">{dirty ? 'Data alterada. Salve para confirmar.' : <>{status?.label ?? 'Nenhuma data definida.'}{status?.completed ? ' Defina a próxima data para continuar o acompanhamento.' : ' Uma avaliação registrada na data marcada ou depois dela conclui este aviso.'}</>}</p>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar data'}</Button><Button variant="outline" disabled={busy || !value} onClick={() => { setDraft(''); setSuccess(''); setError('') }}>Limpar data</Button></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{success && <p role="status" className="text-sm text-muted-foreground">{success}</p>}
    </>}
  </section>
}
