'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { PersonalAgenda } from '@/components/fitness/personal-agenda'

export default function AgendaPage() {
  return <DashboardShell><PersonalWorkspace page="agenda">
    <PersonalPageHeader icon="agenda" title="Agenda" description="Treinos e avaliações dos seus alunos, semana a semana." />
    <PersonalAgenda />
  </PersonalWorkspace></DashboardShell>
}
