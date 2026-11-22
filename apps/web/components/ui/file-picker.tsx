'use client'

import { useId, useRef } from 'react'
import { FileUp, X, type LucideIcon } from 'lucide-react'
import { Button } from './button'
import styles from './file-picker.module.css'

export function FilePicker({
  label, optional, help, accept, fileName, disabled, onSelect, onRemove,
  icon: Icon = FileUp,
  labels = { choose: 'Selecionar arquivo', change: 'Trocar arquivo', remove: 'Remover arquivo' },
}: {
  label: string
  optional?: boolean
  help: string
  accept: string
  fileName?: string
  disabled?: boolean
  onSelect: (file: File) => void
  onRemove: () => void
  icon?: LucideIcon
  labels?: { choose: string; change: string; remove: string }
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  return (
    <div className={styles.field} role="group" aria-labelledby={id + '-title'}>
      <div id={id + '-title'} className={styles.title}>{label}{optional && <span>Opcional</span>}</div>
      <input
        ref={input}
        hidden
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={event => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) onSelect(file)
        }}
      />
      <div className={styles.actions}>
        <Button ref={trigger} type="button" variant="outline" disabled={disabled} aria-describedby={id + '-help'} onClick={() => input.current?.click()}>
          <Icon size={16} aria-hidden="true" />{fileName ? labels.change : labels.choose}
        </Button>
        <div className={styles.selection}>
          <span className={styles.fileName} aria-live="polite" title={fileName}>{fileName}</span>
          {fileName && <Button type="button" variant="outline" size="icon" aria-label={labels.remove} disabled={disabled} onClick={() => { onRemove(); trigger.current?.focus() }}>
            <X size={16} aria-hidden="true" />
          </Button>}
        </div>
      </div>
      <p id={id + '-help'} className={styles.help}>{help}</p>
    </div>
  )
}
