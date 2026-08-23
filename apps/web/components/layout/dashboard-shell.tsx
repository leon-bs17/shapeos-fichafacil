import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/sidebar'

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/20 p-8">{children}</main>
    </div>
  )
}
