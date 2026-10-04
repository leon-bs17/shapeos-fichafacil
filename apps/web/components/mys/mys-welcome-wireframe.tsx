import { useId } from 'react'

// A fine, flattened annulus: the same orbit scales with the welcome monogram.
const rings = Array.from({ length: 9 }, (_, index) => ({
  rx: 98 + index * 5.75,
  ry: 28 + index * 1.875,
}))
const spokes = Array.from({ length: 36 }, (_, index) => {
  const angle = index * Math.PI * 2 / 36
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return `M${(150 + 98 * cos).toFixed(2)} ${(60 + 28 * sin).toFixed(2)}L${(150 + 144 * cos).toFixed(2)} ${(60 + 43 * sin).toFixed(2)}`
})

export function MysWelcomeWireframe({ className }: { className?: string }) {
  const fadeId = useId()

  return (
    <svg className={className} viewBox="0 0 300 120" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fadeId} x1="150" y1="10" x2="150" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity=".35" />
          <stop offset=".45" stopColor="currentColor" stopOpacity=".65" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <g transform="rotate(-6 150 60)" stroke={`url(#${fadeId})`} strokeWidth=".8" strokeLinecap="round">
        {rings.map(({ rx, ry }, index) => <ellipse key={index} cx="150" cy="60" rx={rx} ry={ry} />)}
        {spokes.map((path, index) => <path key={index} d={path} />)}
      </g>
    </svg>
  )
}
