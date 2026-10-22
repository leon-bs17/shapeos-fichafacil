'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

type Tip = { anchor: Element; text: string }
type ManagedTitle = { text: string; addedLabel: boolean }

/**
 * Shared dashboard tooltip standard. Existing and future title attributes are adapted
 * automatically; new components can also use data-shapeos-tooltip directly.
 * Keep an explicit accessible name on icon-only controls.
 */
export function AdminTooltipProvider() {
  const pathname = usePathname()
  const id = useId()
  const [tip, setTip] = useState<Tip | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTip(null)
    const personalRoutes = ['/', '/alunos', '/treinos', '/exercicios', '/relatorios', '/mys', '/conta']
    const personal = personalRoutes.some(route => pathname === route || (route !== '/' && pathname?.startsWith(route + '/')))
    if (!(personal || pathname === '/admin' || pathname?.startsWith('/admin/'))) return

    const managed = new Map<Element, ManagedTitle>()
    let active: Element | null = null
    let activeText = ''
    let showTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let inputMode = 'keyboard'

    const describe = (element: Element, add: boolean) => {
      const tokens = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(token => token && token !== id)
      if (add) tokens.push(id)
      if (tokens.length) element.setAttribute('aria-describedby', tokens.join(' '))
      else element.removeAttribute('aria-describedby')
    }
    const clearTimers = () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
    const hide = () => {
      clearTimers()
      if (active) describe(active, false)
      active = null
      activeText = ''
      setTip(null)
    }
    const captureTitle = (element: Element) => {
      const text = element.getAttribute('title')?.trim()
      if (!text) return
      const previous = managed.get(element)
      const needsName = element.matches('button,a,input,select,textarea,[role="button"]') &&
        !element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby') &&
        !element.textContent?.trim()
      const addedLabel = previous?.addedLabel ?? needsName
      if (needsName || (previous?.addedLabel && element.getAttribute('aria-label') === previous.text)) {
        element.setAttribute('aria-label', text)
      }
      managed.set(element, { text, addedLabel })
      element.setAttribute('data-shapeos-tooltip', text)
      // An empty title prevents the browser tooltip, including inherited titles.
      // Keeping the attribute lets React remove it normally when props change.
      element.setAttribute('title', '')
    }
    const releaseTitle = (element: Element) => {
      const previous = managed.get(element)
      if (!previous) return
      element.removeAttribute('data-shapeos-tooltip')
      if (previous.addedLabel && element.getAttribute('aria-label') === previous.text) element.removeAttribute('aria-label')
      managed.delete(element)
    }
    const scan = (node: ParentNode) => {
      if (node instanceof Element && node.hasAttribute('title')) captureTitle(node)
      node.querySelectorAll('[title]').forEach(captureTitle)
    }
    const observe = () => observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['title', 'data-shapeos-tooltip', 'disabled', 'aria-disabled'],
    })
    const observer = new MutationObserver(records => {
      // Pause only while adapting attributes, so our own changes cannot loop.
      observer.disconnect()
      for (const record of records) {
        if (record.type === 'attributes' && record.attributeName === 'title' && record.target instanceof Element) {
          if (record.target.getAttribute('title')?.trim()) captureTitle(record.target)
          else releaseTitle(record.target)
        }
      }
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(node => {
          if (node instanceof Element) scan(node)
        })
      }
      observe()
      if (active && (!active.isConnected || active.matches(':disabled,[aria-disabled="true"]') ||
        active.getAttribute('data-shapeos-tooltip') !== activeText)) hide()
      // Detached nodes must not be retained for the lifetime of the Admin shell.
      for (const element of managed.keys()) if (!element.isConnected) managed.delete(element)
    })
    const find = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null
      const element = target.closest('[data-shapeos-tooltip]')
      if (!element?.getAttribute('data-shapeos-tooltip')?.trim() ||
        element.closest(':disabled,[aria-disabled="true"]')) return null
      return element
    }
    const show = (element: Element, delay: number) => {
      if (active === element) { clearTimeout(hideTimer); return }
      clearTimers()
      if (active) describe(active, false)
      active = element
      activeText = element.getAttribute('data-shapeos-tooltip')?.trim() ?? ''
      setTip(null)
      showTimer = setTimeout(() => {
        if (active !== element || !element.isConnected) return
        const text = element.getAttribute('data-shapeos-tooltip')?.trim()
        if (!text) return hide()
        describe(element, true)
        setTip({ anchor: element, text })
      }, delay)
    }
    const leaveSoon = () => {
      clearTimeout(hideTimer)
      if (inputMode === 'keyboard' && active?.contains(document.activeElement)) return
      hideTimer = setTimeout(hide, 120)
    }
    const pointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (popupRef.current?.contains(event.target as Node)) {
        clearTimeout(hideTimer)
        return
      }
      const element = find(event.target)
      if (element) show(element, 300)
    }
    const pointerOut = (event: PointerEvent) => {
      const related = event.relatedTarget as Node | null
      if (related && (active?.contains(related) || popupRef.current?.contains(related))) return
      if (active) leaveSoon()
    }
    const pointerDown = (event: PointerEvent) => {
      inputMode = event.pointerType === 'touch' ? 'touch' : 'pointer'
      hide()
    }
    const focusIn = (event: FocusEvent) => {
      const element = find(event.target)
      if (element && inputMode !== 'touch') show(element, 0)
    }
    const focusOut = (event: FocusEvent) => {
      if (active && !active.contains(event.relatedTarget as Node | null)) hide()
    }
    const keyDown = (event: KeyboardEvent) => {
      inputMode = 'keyboard'
      if (event.key === 'Escape') hide()
    }
    const scroll = (event: Event) => {
      if (!popupRef.current?.contains(event.target as Node)) hide()
    }
    scan(document.body)
    observe()
    document.addEventListener('pointerover', pointerOver, true)
    document.addEventListener('pointerout', pointerOut, true)
    document.addEventListener('pointerdown', pointerDown, true)
    document.addEventListener('click', hide, true)
    document.addEventListener('focusin', focusIn, true)
    document.addEventListener('focusout', focusOut, true)
    document.addEventListener('keydown', keyDown, true)
    document.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', hide)
    window.addEventListener('blur', hide)
    return () => {
      observer.disconnect()
      clearTimers()
      if (active) describe(active, false)
      document.removeEventListener('pointerover', pointerOver, true)
      document.removeEventListener('pointerout', pointerOut, true)
      document.removeEventListener('pointerdown', pointerDown, true)
      document.removeEventListener('click', hide, true)
      document.removeEventListener('focusin', focusIn, true)
      document.removeEventListener('focusout', focusOut, true)
      document.removeEventListener('keydown', keyDown, true)
      document.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
      for (const [element, saved] of managed) {
        if (element.getAttribute('title') === '') element.setAttribute('title', saved.text)
        if (element.getAttribute('data-shapeos-tooltip') === saved.text) element.removeAttribute('data-shapeos-tooltip')
        if (saved.addedLabel && element.getAttribute('aria-label') === saved.text) element.removeAttribute('aria-label')
      }
    }
  }, [pathname, id])

  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!tip || !popup) return
    // Popover uses the top layer, so tooltips also appear over native dialogs.
    // It remains non-modal and never moves keyboard focus.
    if ('showPopover' in popup) {
      popup.setAttribute('popover', 'manual')
      try { popup.showPopover() } catch { popup.removeAttribute('popover') }
    }
    const viewport = window.visualViewport
    const leftEdge = (viewport?.offsetLeft ?? 0) + 12
    const topEdge = (viewport?.offsetTop ?? 0) + 12
    const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 24
    const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 24
    popup.style.maxWidth = Math.max(0, Math.min(280, rightEdge - leftEdge)) + 'px'
    popup.style.maxHeight = Math.max(0, bottomEdge - topEdge) + 'px'
    const anchor = tip.anchor.getBoundingClientRect()
    const box = popup.getBoundingClientRect()
    const left = Math.max(leftEdge, Math.min(anchor.left + (anchor.width - box.width) / 2, rightEdge - box.width))
    const preferredTop = anchor.top - box.height - 8
    const top = preferredTop >= topEdge ? preferredTop : anchor.bottom + 8
    popup.style.left = left + 'px'
    popup.style.top = Math.max(topEdge, Math.min(top, bottomEdge - box.height)) + 'px'
    popup.style.visibility = 'visible'
    return () => {
      if ('hidePopover' in popup && popup.matches(':popover-open')) popup.hidePopover()
    }
  }, [tip])

  return <>
    {tip && createPortal(
      <div ref={popupRef} id={id} role="tooltip" data-shapeos-tooltip-popup
        style={{ visibility: 'hidden' }}>{tip.text}</div>,
      document.body
    )}
    <style jsx global>{`
      html body [data-shapeos-tooltip-popup] {
        position:fixed!important;inset:auto;margin:0!important;
        box-sizing:border-box!important;width:max-content!important;
        padding:8px 10px!important;border:1px solid #d7ded3!important;
        border-radius:13px!important;background:#fcfdf9!important;color:#162623!important;
        font-family:inherit!important;font-size:12px!important;font-weight:400!important;
        line-height:1.45!important;letter-spacing:normal!important;text-align:left!important;
        white-space:normal!important;overflow-wrap:anywhere!important;overflow:auto!important;
        box-shadow:0 4px 16px rgba(0,0,0,.1)!important;
        z-index:2147483647!important;pointer-events:auto!important;
        transform:none!important;animation:none!important;transition:none!important;
      }
      html.dark body [data-shapeos-tooltip-popup] {
        background:#091c18!important;border-color:#1c4037!important;color:#f5faf9!important;
      }
    `}</style>
  </>
}


