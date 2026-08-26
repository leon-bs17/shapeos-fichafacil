import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/providers/query-provider'
import { RegisterSw } from '@/components/pwa/register-sw'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

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
  themeColor: '#10b981',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={spaceGrotesk.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
          <RegisterSw />
        </ThemeProvider>
      </body>
    </html>
  )
}
