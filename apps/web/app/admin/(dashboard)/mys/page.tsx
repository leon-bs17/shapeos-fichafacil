import { redirect } from 'next/navigation'
import { MysChat } from '@/components/mys/mys-chat'
import { getMysAccess } from '@/lib/mys/access'

export const metadata = { title: 'Mys · Administração ShapeOS' }
export default async function AdminMysPage() {
  const access = await getMysAccess()
  if (!access) redirect('/admin/login')
  if (access.role !== 'ADMIN') redirect('/mys')
  return <MysChat role={access.role} name={access.name} configured={Boolean(process.env.DEEPSEEK_API_KEY?.trim())} />
}
