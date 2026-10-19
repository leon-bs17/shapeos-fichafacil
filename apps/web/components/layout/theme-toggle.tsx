'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { SunMoon } from 'lucide-react'
import s from './theme-toggle.module.css'

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const admin = pathname === '/admin' || pathname?.startsWith('/admin/')
  const [mounted, setMounted] = useState(false)
  const themeFrame = useRef(0)

  useEffect(() => {
    setMounted(true)
    return () => {
      cancelAnimationFrame(themeFrame.current)
      document.documentElement.removeAttribute('data-shapeos-theme-changing')
    }
  }, [])

  function changeTheme() {
    const html = document.documentElement
    cancelAnimationFrame(themeFrame.current)
    html.setAttribute('data-shapeos-theme-changing', '')
    // Commit the transition lock before next-themes changes the palette.
    window.getComputedStyle(html).transitionDuration
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    html.classList.remove('light', 'dark')
    html.classList.add(nextTheme)
    html.style.colorScheme = nextTheme
    setTheme(nextTheme)
    themeFrame.current = requestAnimationFrame(() => {
      themeFrame.current = requestAnimationFrame(() => {
        html.removeAttribute('data-shapeos-theme-changing')
      })
    })
  }

  const isDark = mounted && resolvedTheme === 'dark'
  const action = isDark ? 'Ativar modo claro' : 'Ativar modo escuro'
  const Icon = SunMoon

  return (
    <div
      className={`${s.control} ${floating ? s.floating : ''}`}
      data-shapeos-theme-inline={floating ? undefined : ''}
    >
      <button
        type="button"
        data-shapeos-theme-switch
        data-shapeos-tooltip={admin && mounted ? action : undefined}
        className={s.button}
        disabled={!mounted}
        onClick={changeTheme}
        aria-label={mounted ? action : 'Alternar tema'}
      >
        {mounted && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />}
      </button>
      {!admin && <span className={s.tooltip} aria-hidden="true">{action}</span>}
    </div>
  )
}
