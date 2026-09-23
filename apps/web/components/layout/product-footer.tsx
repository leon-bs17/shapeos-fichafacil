'use client'

import Link from 'next/link'
import { Bot, Copy, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

const prompt = 'O que é o ShapeOS, para quem ele foi criado e como ele ajuda personal trainers a gerenciar alunos, fichas e evolução de treino?'

export function ProductFooter() {
  const { toast } = useToast()

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt)
    toast({ tone: 'success', title: 'Pergunta copiada', description: 'Cole em sua IA favorita para conhecer o ShapeOS.' })
  }

  return (
    <footer className="mt-12 border-t border-border/60 py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            ShapeOS <span className="text-muted-foreground">×</span> <span className="tracking-tight">Dream Vision®</span>
          </div>
          <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">
            Sistema de operação para personal trainers e alunos, com fichas, acompanhamento e experiência offline-first.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/docs" className="transition hover:text-foreground">Documentação</Link>
            <span>© {new Date().getFullYear()} ShapeOS</span>
          </div>
        </div>

        <button
          type="button"
          onClick={copyPrompt}
          className="group flex max-w-md items-center gap-3 rounded-2xl bg-foreground/[0.035] px-4 py-3 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] transition hover:bg-foreground/[0.055]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="h-3 w-3 text-primary" /> Pergunte à IA sobre o ShapeOS</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">Copie uma pergunta contextualizada para descobrir o produto.</span>
          </span>
          <Copy className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-foreground" />
        </button>
      </div>
    </footer>
  )
}
