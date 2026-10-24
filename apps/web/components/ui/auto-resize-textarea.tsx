'use client'

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

function fitContent(field: HTMLTextAreaElement | null) {
  if (!field) return
  const computed = window.getComputedStyle(field)
  const border = (parseFloat(computed.borderTopWidth) || 0) + (parseFloat(computed.borderBottomWidth) || 0)
  field.style.height = 'auto'
  field.style.height = `${Math.ceil(Math.max(parseFloat(computed.minHeight) || 0, field.scrollHeight + border))}px`
}

/** Shared rule: compact initially, automatic content height, no manual resize handle. */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function AutoResizeTextarea({ value, defaultValue, rows = 2, style, onInput, ...props }, forwardedRef) {
  const field = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(forwardedRef, () => field.current!, [])
  useLayoutEffect(() => { fitContent(field.current) }, [value, defaultValue])
  useLayoutEffect(() => {
    const element = field.current
    if (!element) return
    let width = element.getBoundingClientRect().width
    const resize = () => {
      const next = element.getBoundingClientRect().width
      if (next !== width) { width = next; fitContent(element) }
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(element)
    window.addEventListener('resize', resize)
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize) }
  }, [])
  return <textarea {...props} ref={field} value={value} defaultValue={defaultValue} rows={rows}
    style={{ ...style, boxSizing: 'border-box', minHeight: style?.minHeight ?? 72, maxHeight: 'none', resize: 'none', overflowY: 'hidden' }}
    onInput={event => { fitContent(event.currentTarget); onInput?.(event) }} />
})
