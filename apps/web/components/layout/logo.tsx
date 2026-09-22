'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'inverse'
  className?: string
  showTagline?: boolean
  stacked?: boolean
}

function Mark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="shapeos-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a8f96" />
          <stop offset="45%" stopColor="#d7dbe0" />
          <stop offset="55%" stopColor="#5b6067" />
          <stop offset="100%" stopColor="#20232a" />
        </linearGradient>
        <linearGradient id="shapeos-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa0a8" />
          <stop offset="50%" stopColor="#e2e6eb" />
          <stop offset="100%" stopColor="#3c4048" />
        </linearGradient>
        <radialGradient id="shapeos-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ffbfb" stopOpacity="1" />
          <stop offset="55%" stopColor="#00D2D2" stopOpacity=".85" />
          <stop offset="100%" stopColor="#003a3a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shapeos-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a9b0b8" />
          <stop offset="50%" stopColor="#3f434b" />
          <stop offset="100%" stopColor="#8f959d" />
        </linearGradient>
      </defs>

      <rect x="4" y="52" width="8" height="24" rx="2" fill="url(#shapeos-chrome)" />
      <rect x="14" y="46" width="10" height="36" rx="2.5" fill="url(#shapeos-chrome)" />
      <rect x="26" y="58" width="18" height="12" rx="2" fill="url(#shapeos-bar)" />
      <rect x="116" y="52" width="8" height="24" rx="2" fill="url(#shapeos-chrome)" />
      <rect x="104" y="46" width="10" height="36" rx="2.5" fill="url(#shapeos-chrome)" />
      <rect x="84" y="58" width="18" height="12" rx="2" fill="url(#shapeos-bar)" />

      <circle cx="64" cy="64" r="30" fill="#1a1a1a" stroke="url(#shapeos-ring)" strokeWidth="3.5" />
      <circle cx="64" cy="64" r="26" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      <circle cx="64" cy="64" r="22" fill="url(#shapeos-glow)" opacity=".9" />
      <circle cx="64" cy="64" r="19" fill="none" stroke="#00D2D2" strokeWidth="2" opacity=".85" />
      <path d="M 52 60 A 14 14 0 1 0 76 60" fill="none" stroke="#00F2F2" strokeWidth="4" strokeLinecap="round" />
      <rect x="61.5" y="49" width="5" height="14" rx="2.5" fill="#00F2F2" />
      <ellipse cx="60" cy="53" rx="10" ry="3" fill="rgba(255,255,255,.18)" />
    </svg>
  )
}

export function Logo({
  size = 'md',
  className,
  showTagline = true,
  stacked = false,
}: LogoProps) {
  const dimensions = { sm: 34, md: 46, lg: 58, xl: 92 }
  const textSizes = {
    sm: 'text-[15px]',
    md: 'text-[20px]',
    lg: 'text-[24px]',
    xl: 'text-[34px]',
  }

  const wordmark = (
    <div className="leading-none">
      <div className={cn('shapeos-display font-bold tracking-[-0.035em] text-[#F5F5F5]', textSizes[size])}>
        shape
        <span className="text-[#00D2D2]" style={{ textShadow: '0 0 18px rgba(0,210,210,.5)' }}>
          OS
        </span>
      </div>
      {showTagline ? (
        <div className={cn('mt-1 text-zinc-400 font-light lowercase tracking-[0.22em]', size === 'xl' ? 'text-xs' : 'text-[9px]')}>
          ficha fácil
        </div>
      ) : null}
    </div>
  )

  return (
    <div className={cn(stacked ? 'flex flex-col items-center gap-2.5' : 'flex items-center gap-2.5', 'select-none', className)}>
      <Mark size={dimensions[size]} />
      {wordmark}
    </div>
  )
}

export function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return <span className={cn('inline-flex shrink-0', className)}><Mark size={size} /></span>
}
