'use client'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { PersonalNotices } from '@/components/fitness/personal-notices'
export default function PersonalNoticesPage() {
  return <DashboardShell><PersonalWorkspace page="comunicados"><PersonalPageHeader icon="comunicados" title="Comunicados" description="Orientações para seus alunos e acompanhamento de leitura." /><PersonalNotices /></PersonalWorkspace></DashboardShell>
}
