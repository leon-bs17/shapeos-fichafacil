import type { ReactNode } from 'react'
import s from './personal-banner-wireframe.module.css'

type PersonalArt = 'overview' | 'students' | 'workouts' | 'library' | 'reports' | 'agenda' | 'notices' | 'account' | 'assistant'

const symbols: Record<PersonalArt, ReactNode> = {
    overview: <g transform="rotate(-18 245 86)">
      <path d="M209 81h72v10h-72M199 60h10v52h-10zM186 68h13v36h-13zM281 60h10v52h-10zM291 68h13v36h-13z" />
      <path d="M215 84v4m7-4v4m7-4v4m7-4v4m7-4v4m7-4v4m7-4v4m7-4v4m7-4v4" opacity=".5" />
    </g>,
    students: <g>
      <circle cx="245" cy="73" r="11" /><path d="M225 105v-5a20 20 0 0 1 40 0v5M227 112h36" />
      <circle cx="112" cy="67" r="8" /><path d="M98 89v-3a14 14 0 0 1 28 0v3M213 82l-73-5M282 94l55 14" />
      <circle cx="356" cy="104" r="8" /><path d="M342 126v-3a14 14 0 0 1 28 0v3" />
    </g>,
    workouts: <g>
      <rect x="219" y="53" width="52" height="68" rx="5" />
      <path d="M234 53v-5h22v5M228 70l3 3 5-6m6 3h19M228 86l3 3 5-6m6 3h19M228 102l3 3 5-6m6 3h14" />
      <path d="M105 59v28m-6-23v18m18-23v28m-6-14h35m6-14v28m6-23v18" />
    </g>,
    library: <g>
      <rect x="214" y="59" width="56" height="51" rx="5" />
      <path d="M224 59v-8h56v51h-10M234 51v-8h56v51h-10m-43-20 14 9-14 9V74Z" />
      <path d="M109 55v34m-7-28v22m20-28v34m-7-17h30m7-17v34m7-28v22" />
    </g>,
    reports: <g>
      <path d="M218 57v58h59M229 105V91h9v14m9 0V78h9v27m9 0V65h9v40M223 82l17-13 15 4 23-22" />
      <path d="M99 93l15-10 15 5 20-22m-50 38h50" />
    </g>,
    agenda: <g>
      <rect x="214" y="55" width="62" height="65" rx="6" />
      <path d="M214 74h62M230 47v16m30-16v16M225 85h7m10 0h7m10 0h7M225 97h7m10 0h7m10 0h7M225 109h7m10 0h7" />
      <circle cx="354" cy="110" r="15" /><path d="M354 100v11l8 5" />
    </g>,
    notices: <g>
      <path d="m215 73 60-19-21 53-12-19-27-15Zm27 15 33-34M242 88l-3 20 15-10" />
      <path d="M100 56h49v32h-18l-10 9v-9h-21V56Zm9 11h31m-31 10h21" />
    </g>,
    account: <g>
      <rect x="215" y="53" width="60" height="68" rx="6" /><circle cx="245" cy="74" r="9" />
      <path d="M229 102v-3a16 16 0 0 1 32 0v3M230 111h30M349 96l19 7v14c0 12-10 20-19 24-9-4-19-12-19-24v-14l19-7Z" />
      <path d="m341 117 6 6 11-13" />
    </g>,
    assistant: <g opacity=".65">
      <path d="M104 63h44m-44 10h30M340 106h46m-46 10h30" />
      <circle cx="120" cy="88" r="3" /><circle cx="350" cy="85" r="3" />
    </g>,
}

/** Personal's shared technical illustration language; placement belongs to the banner. */
export function PersonalBannerWireframe({ variant, className }: { variant: PersonalArt; className?: string }) {
  return <svg data-personal-wireframe={variant} className={`${s.art} ${className ?? ''}`} viewBox="0 0 480 170" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round">
    <g opacity=".65">
      <ellipse cx="245" cy="86" rx="216" ry="63" />
      <ellipse cx="245" cy="86" rx="187" ry="46" transform="rotate(-11 245 86)" />
      <ellipse cx="245" cy="86" rx="169" ry="39" transform="rotate(11 245 86)" />
      <ellipse cx="245" cy="86" rx="134" ry="66" transform="rotate(-16 245 86)" />
      <path d="M245 12v145M33 86h421M96 35l299 100M100 138 391 35" opacity=".6" />
      <ellipse cx="245" cy="86" rx="203" ry="54" strokeDasharray="2 5" />
    </g>
    <g>
      <circle cx="245" cy="86" r="48" /><circle cx="245" cy="86" r="39" opacity=".55" />
      <path d="M176 53h27m86 62h31M143 100l55-13m94-4 56-23" opacity=".6" />
      <g strokeWidth="1.2">{symbols[variant]}</g>
    </g>
    {[{x:245,y:23},{x:148,y:31},{x:81,y:119},{x:333,y:26},{x:417,y:78},{x:304,y:139}].map(({x,y},index)=><g key={index}><circle cx={x} cy={y} r={index===2?7:5} fill="var(--shapeos-banner-middle)" strokeWidth="1" opacity=".8" /><circle cx={x} cy={y} r="2" fill="currentColor" stroke="none" opacity=".8" /></g>)}
  </svg>
}
