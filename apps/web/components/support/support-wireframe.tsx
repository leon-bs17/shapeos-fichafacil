/** Fine technical linework, sharing the Admin's orbital illustration language. */
export function SupportWireframe() {
  return <svg data-support-wireframe viewBox="0 0 480 170" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round">
    <g opacity=".65">
      <ellipse cx="245" cy="86" rx="216" ry="63" />
      <ellipse cx="245" cy="86" rx="187" ry="46" transform="rotate(-11 245 86)" />
      <ellipse cx="245" cy="86" rx="169" ry="39" transform="rotate(11 245 86)" />
      <ellipse cx="245" cy="86" rx="134" ry="66" transform="rotate(-16 245 86)" />
      <path d="M245 12v145M33 86h421M96 35l299 100M100 138 391 35" opacity=".6" />
      <ellipse cx="245" cy="86" rx="203" ry="54" strokeDasharray="2 5" />
    </g>
    <g opacity="1">
      <circle cx="245" cy="86" r="48" /><circle cx="245" cy="86" r="39" opacity=".55" />
      <path d="M176 53h27m86 62h31M143 100l55-13m94-4 56-23M199 54l-29-17m124 69 41 26" />
      <path d="M232 90V78a13 13 0 0 1 26 0v12M229 81h4v17h-4a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4ZM258 81h4a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-4V81ZM263 98v4a7 7 0 0 1-7 7h-9" strokeWidth="1.5" />
      <rect x="240" y="106" width="9" height="5" rx="2.5" />
      <path d="M100 38 147 49a9 9 0 0 1 7 9v35a6 6 0 0 1-8 6l-19-5-13 7v-10l-17-4a9 9 0 0 1-7-9V44a7 7 0 0 1 10-6ZM103 56l37 9m-37 3 28 7m-28 5 18 5M345 103l43 10a9 9 0 0 1 7 9v27a6 6 0 0 1-8 6l-18-4-12 6v-9l-15-4a8 8 0 0 1-6-8v-27a6 6 0 0 1 9-6ZM347 120l35 8m-35 3 25 6" />
    </g>
    {[{x:245,y:23},{x:148,y:31},{x:81,y:119},{x:333,y:26},{x:417,y:78},{x:304,y:139}].map(({x,y},index)=><g key={index}><circle cx={x} cy={y} r={index===2?7:5} fill="var(--shapeos-banner-middle)" strokeWidth="1" opacity=".8"/><circle cx={x} cy={y} r="2" fill="currentColor" stroke="none" opacity=".8"/></g>)}
  </svg>
}
