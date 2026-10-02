import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { RegisterSw } from '@/components/pwa/register-sw'
import './globals.css'
import './admin-light-approvals.css'
import './admin-light-approvals-hq.css'
import './admin-light-approvals-inline.css'

export const metadata: Metadata = {
  title: 'ShapeOS · Ficha Fácil',
  description:
    'Gestão de treinos e consultoria para personal trainers e alunos.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'ShapeOS',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#f2f7f8',
  colorScheme: 'light dark',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          storageKey="shapeos-theme-v2"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </QueryProvider>
          <div className="fixed bottom-24 right-4 z-[60] md:bottom-5"><ThemeToggle /></div>
          <RegisterSw />
        </ThemeProvider>
      </body>
    </html>
  )
}
