'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CodeBlock({ code, language = 'bash', title, className }: { code: string; language?: string; title?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <figure className={cn('overflow-hidden rounded-2xl bg-[#0b0e12] shadow-[0_20px_60px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(255,255,255,0.07)]', className)}>
      <figcaption className="flex items-center justify-between px-4 py-3 text-xs text-zinc-400">
        <span>{title ?? language}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Copiar código">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </figcaption>
      <pre className="overflow-x-auto px-4 pb-4 text-[13px] leading-6 text-zinc-200"><code>{code}</code></pre>
    </figure>
  )
}
