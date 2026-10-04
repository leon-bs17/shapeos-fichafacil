import { useId } from 'react'

// A spherical surface patch. Geometry is shared by both themes and all sizes.
function project(latitude: number, longitude: number): [number, number] {
  const x = Math.cos(latitude) * Math.sin(longitude)
  const y = -Math.sin(latitude) * Math.cos(.35) + Math.cos(latitude) * Math.cos(longitude) * Math.sin(.35)
  const tilt = .12
  return [34 + 140 * (x * Math.cos(tilt) - y * Math.sin(tilt)), 136 + 140 * (x * Math.sin(tilt) + y * Math.cos(tilt))]
}

function curve(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

const steps = Array.from({ length: 41 }, (_, index) => index / 40)
const paths = [
  ...Array.from({ length: 11 }, (_, index) => curve(steps.map(step => project(.07 + index * .135, .12 + step * 1.45)))),
  ...Array.from({ length: 12 }, (_, index) => curve(steps.map(step => project(.07 + step * 1.4, .12 + index * .132)))),
]

export function MysWelcomeWireframe({ className }: { className?: string }) {
  const fadeId = useId()
  const bottomId = `${fadeId}-bottom`
  const maskId = `${fadeId}-mask`

  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fadeId} x1="20" y1="0" x2="190" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset=".2" stopColor="currentColor" stopOpacity="0" />
          <stop offset=".55" stopColor="currentColor" stopOpacity="1" />
          <stop offset=".9" stopColor="currentColor" stopOpacity=".5" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={bottomId} x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset=".6" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="180">
          <rect width="240" height="180" fill={`url(#${bottomId})`} />
        </mask>
      </defs>
      <g stroke={`url(#${fadeId})`} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" mask={`url(#${maskId})`}>
        {paths.map((path, index) => <path key={index} d={path} />)}
      </g>
    </svg>
  )
}
