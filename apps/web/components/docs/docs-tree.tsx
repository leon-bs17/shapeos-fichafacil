'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type Node = {
  label: string
  href?: string
  children?: Node[]
}

const nodes: Node[] = [
  {
    label: 'Começando',
    children: [
      { label: 'Visão geral', href: '#visao-geral' },
      { label: 'Autenticação', href: '#autenticacao' },
    ],
  },
  {
    label: 'Dados',
    children: [
      { label: 'Ficha atômica', href: '#ficha-atomica' },
      { label: 'Registro de execução', href: '#registro-execucao' },
    ],
  },
  {
    label: 'Produto',
    children: [
      { label: 'Planos', href: '#planos' },
      { label: 'Broadcasts', href: '#broadcasts' },
    ],
  },
]

function TreeNode({ node, depth = 0 }: { node: Node; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)
  const hasChildren = Boolean(node.children?.length)

  if (!hasChildren) {
    return (
      <a href={node.href} className="flex items-center gap-2 rounded-lg py-1.5 pr-2 text-xs text-muted-foreground transition hover:bg-foreground/[0.035] hover:text-foreground" style={{ paddingLeft: 10 + depth * 14 }}>
        <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-65" />
        {node.label}
      </a>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-xs font-semibold text-foreground transition hover:bg-foreground/[0.035]"
        style={{ paddingLeft: 10 + depth * 14 }}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        {open ? <FolderOpen className="h-3.5 w-3.5 text-primary" /> : <Folder className="h-3.5 w-3.5 text-muted-foreground" />}
        {node.label}
      </button>
      <div className={cn('grid transition-[grid-template-rows,opacity] duration-200', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-50')}>
        <div className="overflow-hidden">
          {node.children?.map((child) => <TreeNode key={child.label} node={child} depth={depth + 1} />)}
        </div>
      </div>
    </div>
  )
}

export function DocsTree() {
  return (
    <nav aria-label="Árvore da documentação" className="rounded-2xl bg-card p-2 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]">
      {nodes.map((node) => <TreeNode key={node.label} node={node} />)}
    </nav>
  )
}
