'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen tech-bg">
      <div className="fixed inset-0 tech-grid-subtle pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 tech-noise pointer-events-none" aria-hidden="true" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8 scrollbar-thin">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
