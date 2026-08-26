'use client'

import { Sidebar } from '@/components/layout/sidebar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen tech-bg">
      <div className="fixed inset-0 tech-grid-subtle pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 tech-noise pointer-events-none" aria-hidden="true" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">{children}</main>
    </div>
  )
}
