import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/providers/query-provider'
import { RegisterSw } from '@/components/pwa/register-sw'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ShapeOS · Gestão de treinos para personal trainers',
    template: '%s · ShapeOS',
  },
  applicationName: 'ShapeOS',
  description:
    'Plataforma para personal trainers organizarem alunos, fichas de treino, exercícios e evolução em uma experiência rápida, acessível e offline-first.',
  keywords: [
    'software para personal trainer',
    'gestão de alunos',
    'ficha de treino',
    'treino online',
    'aplicativo para personal',
    'ShapeOS',
  ],
  category: 'fitness software',
  creator: 'Dream Vision',
  publisher: 'ShapeOS',
  manifest: '/manifest.json',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'ShapeOS · Gestão de treinos para personal trainers',
    description:
      'Organize alunos, fichas, exercícios e evolução com uma experiência feita para personal trainers.',
    siteName: 'ShapeOS',
  },
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
  themeColor: '#0E1116',
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ShapeOS',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Sistema para personal trainers gerenciarem alunos, fichas de treino, exercícios e evolução.',
  creator: {
    '@type': 'Organization',
    name: 'Dream Vision',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
          <RegisterSw />
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  )
}
