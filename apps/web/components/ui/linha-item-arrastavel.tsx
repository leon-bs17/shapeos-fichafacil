'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LinhaItem {
  exercicio_id: string
  series: string
  repeticoes: string
  descanso_segundos: string
}

interface LinhaItemArrastavelProps {
  id: string
  indice: number
  item: LinhaItem
  grupos: Map<string, { id: string; nome: string; grupo_muscular: string }[] | undefined>
  totalItens: number
  onAtualizar: (indice: number, campo: keyof LinhaItem, valor: string) => void
  onRemover: (indice: number) => void
}

export function LinhaItemArrastavel({
  id,
  indice,
  item,
  grupos,
  totalItens,
  onAtualizar,
  onRemover,
}: LinhaItemArrastavelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-end gap-2 ${isDragging ? 'relative rounded-lg bg-card shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="flex h-10 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`Arrastar exercício ${indice + 1}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <select
        value={item.exercicio_id}
        onChange={(e) => onAtualizar(indice, 'exercicio_id', e.target.value)}
        className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Exercício...</option>
        {[...grupos.entries()].map(([grupo, lista]) => (
          <optgroup key={grupo} label={grupo}>
            {(lista ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <Input
        className="w-16"
        type="number"
        min={1}
        max={30}
        aria-label={`Séries do exercício ${indice + 1}`}
        value={item.series}
        onChange={(e) => onAtualizar(indice, 'series', e.target.value)}
      />
      <Input
        className="w-20"
        placeholder="Reps"
        aria-label={`Repetições do exercício ${indice + 1}`}
        value={item.repeticoes}
        onChange={(e) => onAtualizar(indice, 'repeticoes', e.target.value)}
      />
      <Input
        className="w-20"
        type="number"
        min={0}
        max={900}
        aria-label={`Descanso do exercício ${indice + 1}`}
        value={item.descanso_segundos}
        onChange={(e) => onAtualizar(indice, 'descanso_segundos', e.target.value)}
      />
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Remover exercício ${indice + 1}`}
        onClick={() => onRemover(indice)}
        disabled={totalItens === 1}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
