'use client'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PersonalPageHeader, PersonalWorkspace } from '@/components/layout/personal-workspace'
import { HelpDesk } from '@/components/support/help-desk'
export default function HelpPage(){return <DashboardShell><PersonalWorkspace page="ajuda"><PersonalPageHeader icon="ajuda" title="Ajuda e suporte" description="Responda aos alunos e acompanhe seu suporte técnico."/><HelpDesk/></PersonalWorkspace></DashboardShell>}
