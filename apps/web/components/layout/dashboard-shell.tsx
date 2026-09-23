'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { ProductTopbar } from '@/components/layout/product-topbar'
import { ProductFooter } from '@/components/layout/product-footer'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen tech-bg">
      <div className="fixed inset-0 tech-grid-subtle pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 tech-noise pointer-events-none" aria-hidden="true" />
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <ProductTopbar label="Painel do Personal" maxWidth="max-w-none" />
        <main className="flex-1 overflow-y-auto px-6 py-7 lg:px-8 scrollbar-thin">
          {children}
          <ProductFooter />
        </main>
      </div>
    </div>
  )
}
