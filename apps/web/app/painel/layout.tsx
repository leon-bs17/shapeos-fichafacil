import type { ReactNode } from 'react'
import { ProductTopbar } from '@/components/layout/product-topbar'
import { ProductFooter } from '@/components/layout/product-footer'

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen tech-bg">
      <ProductTopbar label="Painel do Aluno" maxWidth="max-w-5xl" />
      <main>{children}</main>
      <div className="mx-auto max-w-5xl px-5 pb-8">
        <ProductFooter />
      </div>
    </div>
  )
}
