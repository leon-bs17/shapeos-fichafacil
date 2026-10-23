'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ChevronDown, CircleCheck, Info, RefreshCw } from 'lucide-react'
import { buildStudentAttention, INACTIVITY_DAYS, studentReportHref, type AttentionKind } from '@/lib/fitness/personal-attention'
import { DEADLINE_WARNING_DAYS } from '@/lib/fitness/deadlines'
import { fetchPersonalAttention } from '@/services/personal-attention'
import styles from './personal-attention.module.css'

const FILTERS: { id: AttentionKind | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'inatividade', label: 'Sem treinar' },
  { id: 'ficha', label: 'Sem ficha ativa' },
  { id: 'vencimento', label: 'Validade das fichas' },
  { id: 'avaliacao', label: 'Avaliações' },
]

export function PersonalAttention() {
  const [filter, setFilter] = useState<AttentionKind | 'todos'>('todos')
  const [limit, setLimit] = useState(6)
  const query = useQuery({
    queryKey: ['personal-attention'],
    queryFn: ({ signal }) => fetchPersonalAttention(signal),
    gcTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  })
  const rows = buildStudentAttention(query.data ?? [])
  const filtered = filter === 'todos' ? rows : rows.filter(row => row.motivos.includes(filter))
  const unavailable = query.isPending || query.isError

  return <section className={styles.panel} aria-labelledby="personal-attention-title" aria-busy={query.isFetching}>
    <header className={styles.heading}>
      <div><h2 id="personal-attention-title">Precisam de atenção <span className={styles.count}>{unavailable ? '—' : rows.length}</span></h2><p>Pendências dos alunos com vínculo ativo.</p></div>
      <button type="button" className={styles.refresh} disabled={query.isFetching} onClick={() => void query.refetch()} aria-label="Atualizar pendências" data-shapeos-tooltip="Atualizar pendências"><RefreshCw size={15} aria-hidden="true" /></button>
    </header>
    <details className={styles.criteria}><summary><Info size={15} aria-hidden="true" /><span>Como funcionam os alertas?</span><ChevronDown size={15} aria-hidden="true" /></summary><p>Sem treinar: {INACTIVITY_DAYS} dias sem sessão concluída, a partir do vínculo. Fichas: até {DEADLINE_WARNING_DAYS} dias para vencer ou já vencidas. Avaliações: sem registro ou pendentes a partir da data marcada.</p></details>
    {query.isPending ? <p className={styles.empty} role="status">Verificando acompanhamento…</p> : query.isError ? <div className={styles.empty} role="alert"><p>Não foi possível verificar as pendências.</p><button type="button" className={styles.action} disabled={query.isFetching} onClick={() => void query.refetch()}>Tentar novamente</button></div> : <>
      <div className={styles.filters} role="group" aria-label="Filtrar pendências">{FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setLimit(6) }}>{item.label}<span>{item.id === 'todos' ? rows.length : rows.filter(row => row.motivos.includes(item.id as AttentionKind)).length}</span></button>)}</div>
      {!filtered.length ? <div className={styles.empty} role="status"><CircleCheck size={23} aria-hidden="true" /><p>{!query.data?.length ? 'Nenhum aluno com vínculo ativo para acompanhar.' : rows.length ? 'Nenhum aluno nesta categoria.' : 'Nenhuma pendência pelos critérios acima.'}</p></div> : <>
        <ul className={styles.list}>{filtered.slice(0, limit).map(row => <li key={row.aluno_id} className={styles.row}>
          <div className={styles.student}><span className="personal-avatar" aria-hidden="true">{row.nome.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><h3>{row.nome}</h3><div className={styles.reasons}>
            {row.motivos.includes('inatividade') && <span>{row.ultima_sessao ? `${row.dias_sem_sessao} dias sem sessão concluída` : `Sem sessão concluída desde o vínculo (${row.dias_sem_sessao} dias)`}</span>}
            {row.motivos.includes('ficha') && <span>Sem ficha ativa</span>}
            {row.motivos.includes('vencimento') && <span>{row.titulo_ficha ? `${row.titulo_ficha}: ` : ''}{row.prazo_ficha?.label}</span>}
            {row.motivos.includes('avaliacao') && <span>{row.prazo_avaliacao?.pending ? row.prazo_avaliacao.label : 'Sem avaliação registrada'}{row.prazo_avaliacao && row.prazo_avaliacao.days > 0 ? ` · ${row.prazo_avaliacao.label}` : ''}</span>}
          </div></div></div>
          <div className={styles.actions}>
            {row.motivos.includes('inatividade') && <Link className={styles.action} href={studentReportHref(row.aluno_id)} aria-label={`Ver acompanhamento de ${row.nome}`}>Ver acompanhamento <ArrowUpRight size={13} aria-hidden="true" /></Link>}
            {(row.motivos.includes('ficha') || row.motivos.includes('vencimento')) && <Link className={styles.action} href={`/treinos?${new URLSearchParams({ aluno: row.aluno_id })}`} aria-label={`Revisar ficha de ${row.nome}`}>Revisar ficha <ArrowUpRight size={13} aria-hidden="true" /></Link>}
            {row.motivos.includes('avaliacao') && <Link className={styles.action} href={studentReportHref(row.aluno_id, 'avaliacao')} aria-label={`Registrar avaliação de ${row.nome}`}>Registrar avaliação <ArrowUpRight size={13} aria-hidden="true" /></Link>}
          </div>
        </li>)}</ul>
        <footer className={styles.footer}><span>{Math.min(limit, filtered.length)} de {filtered.length} alunos</span>{limit < filtered.length && <button type="button" className={styles.action} onClick={() => setLimit(current => current + 6)}>Mostrar mais</button>}{limit > 6 && <button type="button" className={styles.action} onClick={() => setLimit(6)}>Mostrar menos</button>}</footer>
      </>}
    </>}
  </section>
}

