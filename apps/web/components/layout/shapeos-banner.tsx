import type { ReactNode } from 'react'

/** Shared visual contract. Colors and responsive geometry come from shapeos-banner-theme.css. */
export function ShapeosBanner({ title, description, eyebrow, art, className, titleId }: {
  title: ReactNode
  description: string
  eyebrow?: string
  art?: ReactNode
  className?: string
  titleId?: string
}) {
  return <section data-shapeos-banner className={className} aria-labelledby={titleId}>
    <div data-shapeos-banner-copy>
      {eyebrow && <p data-shapeos-banner-label>{eyebrow}</p>}
      <h2 id={titleId}>{title}</h2>
      <p data-shapeos-banner-description>{description}</p>
    </div>
    {art && <div data-shapeos-banner-art aria-hidden="true">{art}</div>}
  </section>
}
