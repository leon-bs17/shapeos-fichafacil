'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import Logo from '@/davi/components/Logo'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-shapeos-app-shell="dashboard" className="flex min-h-screen tech-bg">
      <div className="fixed inset-0 tech-grid-subtle pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 tech-noise pointer-events-none" aria-hidden="true" />
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8 scrollbar-thin">
        <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between gap-4 border-b border-border pb-4">
          <div className="md:hidden"><Logo size="sm" /></div>
          <span className="hidden text-xs text-muted-foreground md:inline">ShapeOS</span>
          <ThemeToggle />
        </header>
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
