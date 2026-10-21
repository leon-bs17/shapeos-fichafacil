'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleCheck, ClipboardList, Dumbbell, LayoutGrid, Library, TrendingUp, Users } from 'lucide-react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { useAlunos, useMetricasGerais } from '@/hooks/use-alunos'
import { createClient } from '@/lib/supabase/client'
import { completion, type Session } from '@/services/fitness'

export default function PersonalPage() {
  const students = useAlunos()
  const metrics = useMetricasGerais(students.data)
  const recent = useQuery({
    queryKey: ['fitness-personal-recent'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('sessoes_treino')
        .select('*')
        .order('inicio', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return data as Session[]
    },
  })
  const retrying = students.isFetching || recent.isFetching
  return <DashboardShell>
    <div className="personal-overview">
      <header className="personal-page-heading">
        <span className="personal-heading-icon"><LayoutGrid size={21} strokeWidth={1.75} aria-hidden="true" /></span>
        <div><h1>Visão Geral</h1><p>Acompanhe cada aluno. Fichas, sessões e evolução em um só lugar.</p></div>
      </header>

      {(students.error || recent.error) && <div className="personal-load-error" role="alert">
        <p>Não foi possível carregar todos os dados. Tente novamente.</p>
        <button type="button" disabled={retrying} onClick={() => { void students.refetch(); void recent.refetch() }}>{retrying ? 'Carregando…' : 'Tentar novamente'}</button>
      </div>}

      <section className="personal-summary" aria-label="Resumo dos alunos e fichas" aria-busy={students.isLoading}>
        {[
          { name: 'Alunos vinculados', value: metrics.totalAlunos, href: '/alunos', Icon: Users },
          { name: 'Alunos ativos', value: metrics.alunosAtivos, href: '/alunos', Icon: CircleCheck },
          { name: 'Fichas ativas', value: metrics.fichasAtivas, href: '/treinos', Icon: Dumbbell },
        ].map(({ name, value, href, Icon }) => <Link key={name} href={href} className="personal-metric" aria-label={name + ': ' + (students.isLoading ? 'carregando' : students.error ? 'indisponível' : value)}>
          <Icon size={21} strokeWidth={1.75} aria-hidden="true" />
          <div><p>{name}</p><strong>{students.isLoading ? '…' : students.error && !students.data ? '—' : value}</strong></div>
        </Link>)}
      </section>

      <section aria-labelledby="personal-quick-title">
        <div className="personal-section-title"><div><h2 id="personal-quick-title">Acesso rápido</h2><p>Continue o acompanhamento dos seus alunos.</p></div></div>
        <div className="personal-quick-grid">
          {[
            { href: '/alunos', label: 'Gerenciar alunos', Icon: Users },
            { href: '/treinos', label: 'Fichas e prescrição', Icon: Dumbbell },
            { href: '/relatorios', label: 'Evolução e agenda', Icon: TrendingUp },
            { href: '/exercicios', label: 'Biblioteca de exercícios', Icon: Library },
          ].map(({ href, label, Icon }) => <Link key={href} href={href} className="personal-quick-link"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /><span>{label}</span><ArrowRight size={14} aria-hidden="true" /></Link>)}
        </div>
      </section>

      <section className="personal-sessions" aria-labelledby="personal-sessions-title" aria-busy={recent.isLoading}>
        <div className="personal-section-title"><div><h2 id="personal-sessions-title">Sessões recentes</h2><p>Últimos treinos realizados pelos seus alunos.</p></div><Link href="/relatorios" className="personal-text-link">Ver relatórios <ArrowRight size={13} aria-hidden="true" /></Link></div>
        {recent.isLoading ? <div className="personal-empty" role="status"><ClipboardList size={25} strokeWidth={1.5} aria-hidden="true" /><p>Carregando sessões…</p></div> : recent.error && !recent.data ? <div className="personal-empty"><p>As sessões não puderam ser carregadas. Use “Tentar novamente” acima.</p></div> : !recent.data?.length ? <div className="personal-empty"><ClipboardList size={28} strokeWidth={1.5} aria-hidden="true" /><h3>Nenhuma sessão por enquanto</h3><p>As sessões dos seus alunos aparecerão aqui quando eles utilizarem o treino guiado.</p></div> :
          <ul className="personal-session-list">{recent.data.slice(0, 12).map(session => {
            const name = students.data?.find(student => student.aluno_id === session.aluno_id)?.nome ?? 'Aluno'
            const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
            const complete = session.status === 'CONCLUIDO'
            return <li key={session.id}><Link href="/relatorios" className="personal-session-row">
              <div className="personal-session-person"><span className="personal-avatar" aria-hidden="true">{initials}</span><div><p>{name}</p><small>{session.titulo}</small></div></div>
              <time className="personal-session-date" dateTime={session.inicio}>{new Date(session.inicio).toLocaleDateString('pt-BR')}</time>
              <span className="personal-session-status" data-complete={complete}>{complete ? 'Finalizado' : 'Em andamento'}</span>
              <span className="personal-session-progress">{completion(session)}% realizado</span>
            </Link></li>
          })}</ul>}
      </section>
    </div>
  </DashboardShell>
}
