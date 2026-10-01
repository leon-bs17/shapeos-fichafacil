import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/providers/query-provider'
import { RegisterSw } from '@/components/pwa/register-sw'
import './globals.css'

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
  themeColor: '#121719',
  colorScheme: 'dark',
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
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </QueryProvider>
          <RegisterSw />
        </ThemeProvider>
      </body>
    </html>
  )
}
