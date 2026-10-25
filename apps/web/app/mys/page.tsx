import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { MysChat } from '@/components/mys/mys-chat'
import { getMysAccess } from '@/lib/mys/access'

export const metadata = { title: 'Mys · Assistente ShapeOS' }
export default async function MysPage() {
  const access = await getMysAccess()
  if (!access) redirect('/login')
  if (access.role === 'ALUNO') redirect('/painel')
  if (access.role === 'ADMIN') redirect('/admin/mys')
  return <DashboardShell><MysChat role={access.role} name={access.name} configured={Boolean(process.env.DEEPSEEK_API_KEY?.trim())} /></DashboardShell>
}
