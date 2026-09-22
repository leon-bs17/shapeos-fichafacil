'use client'

import { Sidebar } from '@/components/layout/sidebar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#1A1A1A] text-[#F5F5F5] tech-bg">
      <div className="fixed inset-0 tech-grid-subtle pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 tech-noise pointer-events-none" aria-hidden="true" />
      <div
        className="fixed -top-48 -left-48 h-[480px] w-[480px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00D2D2 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="fixed -bottom-52 -right-44 h-[520px] w-[520px] rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF7043 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-5 py-7 md:px-8 md:py-9 lg:px-10 scrollbar-thin">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
