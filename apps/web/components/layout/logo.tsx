'use client'

import { Dumbbell } from 'lucide-react'
import { Space_Grotesk } from 'next/font/google'
import { cn } from '@/lib/utils'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'inverse'
  className?: string
}

export function Logo({ size = 'md', variant = 'default', className }: LogoProps) {
  const baseStyles = 'flex items-center gap-1.5 font-space-grotesk select-none'
  const sizeStyles = {
    sm: 'text-base gap-1',
    md: 'text-lg gap-1.5',
    lg: 'text-xl gap-2',
    xl: 'text-2xl gap-2.5',
  }
  const colorStyles = variant === 'inverse'
    ? 'text-white'
    : 'text-foreground'

  return (
    <span className={cn(baseStyles, sizeStyles[size], colorStyles, className)}>
      <Dumbbell
        className={cn(
          'text-primary shrink-0',
          size === 'sm' && 'h-4 w-4',
          size === 'md' && 'h-5 w-5',
          size === 'lg' && 'h-6 w-6',
          size === 'xl' && 'h-7 w-7',
        )}
        aria-hidden="true"
      />
      <span className="font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01" 1' }}>
        Shape
      </span>
      <span
        className="font-medium tracking-tight"
        style={{
          fontFeatureSettings: '"ss01" 1, "calt" 1',
          letterSpacing: '-0.02em',
        }}
      >
        OS
      </span>
    </span>
  )
}

export function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Dumbbell
      className={cn('text-primary shrink-0', className)}
      size={size}
      strokeWidth={2.5}
      aria-hidden="true"
    />
  )
}