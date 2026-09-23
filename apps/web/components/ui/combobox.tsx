'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  className,
}: {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) =>
      [option.label, option.description].filter(Boolean).some((text) => text!.toLowerCase().includes(normalized))
    )
  }, [options, query])

  function toggle() {
    setOpen((current) => {
      const next = !current
      if (next) {
        window.setTimeout(() => searchRef.current?.focus(), 0)
      } else {
        setQuery('')
      }
      return next
    })
  }

  function select(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl bg-field px-3.5 text-left text-sm shadow-[inset_0_0_0_1px_hsl(var(--border)/0.72)] outline-none transition hover:shadow-[inset_0_0_0_1px_hsl(var(--border))] focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.7),0_0_0_3px_hsl(var(--primary)/0.12)]"
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar seleção"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => { setOpen(false); setQuery('') }}
          />
          <div className="absolute z-50 mt-2 w-full min-w-64 overflow-hidden rounded-2xl bg-popover shadow-[0_22px_70px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(255,255,255,0.07)]">
            <div className="relative border-b border-border/60 p-2.5">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-xl bg-foreground/[0.035] pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/65 focus:ring-3 focus:ring-primary/12"
              />
            </div>
            <div role="listbox" className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length ? filtered.map((option) => {
                const active = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => select(option.value)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-foreground/[0.04]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{option.label}</span>
                      {option.description ? <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{option.description}</span> : null}
                    </span>
                    {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                  </button>
                )
              }) : (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
