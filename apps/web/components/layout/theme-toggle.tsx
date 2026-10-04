'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import s from './theme-toggle.module.css'

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const action = isDark ? 'Ativar modo claro' : 'Ativar modo escuro'
  const Icon = isDark ? Sun : Moon

  return (
    <div
      className={`${s.control} ${floating ? s.floating : ''}`}
      data-shapeos-theme-inline={floating ? undefined : ''}
    >
      <button
        type="button"
        className={s.button}
        disabled={!mounted}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={mounted ? action : 'Alternar tema'}
      >
        {mounted && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />}
      </button>
      <span className={s.tooltip} aria-hidden="true">{action}</span>
    </div>
  )
}
