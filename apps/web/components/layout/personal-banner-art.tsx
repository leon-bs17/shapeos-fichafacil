import type { ReactNode } from 'react'
import s from './personal-banner-art.module.css'

type BannerArt = 'overview' | 'students' | 'workouts' | 'library' | 'reports' | 'agenda' | 'notices' | 'account'

/** Each area keeps its own illustration. Only the fine technical finish is shared. */
const illustrations: Record<BannerArt, ReactNode> = {
  overview: <>
    <g opacity=".4">
      <path d="M50 139 205 160 430 108 277 87 50 139Zm52 7L327 94m-1 49L171 121m-13 33L382 102M75 130l155 21m-99-34 154 21m-98-34 155 21" />
      <path d="m63 30 8-14m-14 3 15 9M413 133l12 2m-6-7-2 12" />
    </g>
    <g transform="rotate(-14 245 83)">
      <g opacity=".65">
        <path d="M148 74h194v17H148M148 82h194" />
        {Array.from({length:15},(_,i)=><ellipse key={i} cx={157+i*12} cy="82" rx="3" ry="8"/>)}
      </g>
      {[{x:104,r:34},{x:116,r:45},{x:130,r:51},{x:144,r:51},{x:346,r:51},{x:360,r:51},{x:374,r:45},{x:386,r:34}].map(({x,r})=><g key={x}>
        <ellipse cx={x} cy="82" rx="15" ry={r}/><ellipse cx={x} cy="82" rx="4" ry="9" opacity=".6"/>
      </g>)}
      {[-.85,-.6,-.3,0,.3,.6,.85].map(t=>{const dx=Math.sqrt(1-t*t)*15,y=82+t*51;return <path key={t} opacity=".5" d={`M${130-dx} ${y}h14M${130+dx} ${y}h14M${346-dx} ${y}h14M${346+dx} ${y}h14`}/>})}
      <path d="M91 78h13m-13 8h13m282-8h13m-13 8h13M130 31h14m-14 102h14m202-102h14m-14 102h14" />
      <path d="M116 18h258m-258-5v10m258-10v10M89 42v80m-5-80h10m-10 80h10" opacity=".5" strokeDasharray="2 4" />
    </g>
  </>,
  students: <>
    <g opacity=".45">
      <path d="m53 118 167 38 204-70-164-38L53 118Zm41 9L298 57m-153 82 205-70m-151 83 204-70M103 102l167 39M155 84l166 38M208 66l164 39" />
      <path d="m107 108 125-47 125 53M107 108l121 28 129-22M232 61l-4 75" strokeDasharray="3 5" />
    </g>
    <g>
      <path d="m83 58 44 10v52l-44-10V58Zm44 10 8-5v52l-8 5M83 58l8-5 44 10" />
      <ellipse cx="105" cy="83" rx="7" ry="9" transform="rotate(-11 105 83)" /><path d="M93 106v-4c0-15 25-10 25 5v5M94 68l22 5" />
      <path d="m206 24 56 12v67l-56-12V24Zm56 12 11-6v67l-11 6M206 24l11-6 56 12" />
      <ellipse cx="235" cy="56" rx="9" ry="11" transform="rotate(-11 235 56)" /><path d="M219 84v-5c0-19 32-12 32 7v5M219 36l31 7" />
      <path d="m332 62 46 10v54l-46-10V62Zm46 10 8-5v54l-8 5M332 62l8-5 46 10" />
      <ellipse cx="355" cy="88" rx="7" ry="9" transform="rotate(-11 355 88)" /><path d="M342 110v-4c0-15 25-10 25 5v5M343 73l23 5" />
      <path d="m135 88 71-26m67 7 59 24M135 111l93 25 104-20" opacity=".7" />
      <circle cx="170" cy="75" r="3"/><circle cx="303" cy="82" r="3"/><circle cx="228" cy="136" r="4"/>
    </g>
  </>,
  workouts: <>
    <g opacity=".4">
      <path d="m67 125 153 31 194-65-154-31L67 125Zm38 8L299 68m-154 73 194-65m-153 74 194-65M115 109l153 31m-104-47 153 31m-104-48 153 31" />
      <path d="M74 41h73m-73 7h45M365 36h43m-21-7v14" strokeDasharray="2 4" />
    </g>
    <g>
      <path d="m202 33 104-20v109l-104 21V33Zm104-20 12 7v109l-12-7M202 143l12 7 104-21" />
      <path d="m229 28 4-10 36-7 7 8v8l-47 9v-8Z" fill="var(--shapeos-banner-middle)" />
      {[0,1,2,3].map(i=><g key={i} transform={`translate(0 ${i*22})`}><path d="m215 51 6 5 10-15m10 4 51-10m-51 17 38-7" /></g>)}
      <g transform="translate(72 71) rotate(-12)"><ellipse cx="14" cy="18" rx="6" ry="25"/><ellipse cx="24" cy="18" rx="6" ry="30"/><ellipse cx="98" cy="18" rx="6" ry="30"/><ellipse cx="108" cy="18" rx="6" ry="25"/><path d="M24 13h74M24 23h74M14-7h10m-10 50h10m74-50h10m-10 50h10"/><path d="M38 13v10m9-10v10m9-10v10m9-10v10m9-10v10m9-10v10" opacity=".5"/></g>
      <path d="m338 54 38-8v66l-38 8V54Zm9 12 20-4m-20 16 20-4m-20 16 13-3m-13 16 20-4M327 64l11-3m-20 38 20-5" opacity=".65"/>
    </g>
  </>,
  library: <>
    <g opacity=".4">
      <path d="m56 126 169 32 200-67-169-32L56 126Zm56 11L312 70m-144 78 200-67M106 109l170 32m-117-50 168 32m-116-49 169 32" />
      <path d="M64 40h65m-65 7h34M395 42v17m-8-8h17" />
    </g>
    <g opacity=".55"><path d="m112 48 120-24 85 18-120 24-85-18Zm0 0v63l85 18 120-24V42M197 66v63m-85-71 85 18 120-24" /></g>
    <g>
      <path d="m181 51 140-29v91l-140 29V51Zm140-29 12 7v91l-12-7M181 142l12 7 140-29" fill="var(--shapeos-banner-middle)" />
      <path d="m181 69 140-29M192 58l3-1m7-1 3-1m7-1 3-1M194 127l63-13m-63 19 36-7" opacity=".6" />
      <path d="m245 78 26 10-26 21V78Z" />
      <path d="m351 61 49-10v63l-49 10V61Zm0 14 49-10m-39 25 29-6m-29 17 29-6m-29 17 18-4" opacity=".7" />
      <circle cx="110" cy="133" r="3" /><path d="m110 133 49-16m174-24 18-4" strokeDasharray="2 4" />
    </g>
  </>,
  reports: <>
    <g opacity=".45">
      <path d="m62 126 146 31 216-72-146-31L62 126Zm42 9L320 63m-172 81 216-72m-170 81 216-72M116 108l146 31m-91-49 146 31m-90-49 146 31" />
      <path d="M78 116V37m-5 0h10m-10 79h10M356 137l52-17" strokeDasharray="2 4" />
    </g>
    <g>
      {[{x:126,y:100,h:27},{x:181,y:75,h:41},{x:236,y:47,h:58},{x:291,y:17,h:77}].map(({x,y,h})=><g key={x}><path d={`m${x} ${y} 22-7 20 5-22 7-20-5Zm0 0v${h}l20 5 22-7v-${h}m-22 7v${h}`} /><path d={`m${x+4} ${y+h-7} 12 3m-12-10 12 3`} opacity=".4"/></g>)}
      <path d="m111 88 58-27 55 1 63-41 60 8" strokeWidth="1.2" />
      {[{x:111,y:88},{x:169,y:61},{x:224,y:62},{x:287,y:21},{x:347,y:29}].map(({x,y})=><circle key={x} cx={x} cy={y} r="3" fill="var(--shapeos-banner-middle)"/>)}
      <path d="m352 72 48-16v40l-48 16V72Zm9 7 29-10m-29 22 29-10m-29 22 18-6" opacity=".6" />
    </g>
  </>,
  agenda: <>
    <g opacity=".4">
      <path d="m62 126 155 30 202-65-155-30L62 126Zm52 10L316 71m-151 75 202-65M111 110l155 30m-104-47 155 30m-104-47 155 30" />
      <path d="m89 61 30-10m-30 18 20-7M368 34v18m-9-9h18" />
    </g>
    <g>
      <path d="m159 48 141-29v106l-141 29V48Zm141-29 13 8v106l-13-8M159 154l13 7 141-28M159 76l141-29" />
      <path d="m188 56 0-21c0-7 9-9 9-2v21m60-12V21c0-7 9-9 9-2v21" />
      {[0,1,2].map(row=>[0,1,2,3].map(col=><path key={`${row}-${col}`} opacity={row===1&&col===2?1:.55} d={`m${174+col*29} ${86+row*19-col*6} 17-3v10l-17 3V${86+row*19-col*6}Z`}/>))}
      <path d="m234 102 4 3 8-10" strokeWidth="1.3" />
      <g transform="translate(354 101)"><ellipse rx="28" ry="33"/><ellipse cx="5" cy="-2" rx="28" ry="33" opacity=".5"/><path d="M0-23v23l13 7M-20 0h4M20 0h4M0 23v4"/><circle r="2" fill="currentColor" stroke="none"/></g>
      <path d="m314 103 11-3m-191 32 25-8" strokeDasharray="2 4" opacity=".6" />
    </g>
  </>,
  notices: <>
    <g opacity=".4">
      <path d="m57 128 155 29 211-68-156-29L57 128Zm52 10L320 70m-159 78 211-68M109 111l154 29m-100-47 154 29m-101-46 155 29" />
      <path d="M66 47h56m-56 7h30M390 32v16m-8-8h16" />
    </g>
    <g>
      <path d="m228 44 79-26v105l-79 26V44Zm79-26 11 7v105l-11-7M228 149l11 6 79-25" />
      <path d="m241 57 52-17m-52 30 52-17m-52 30 52-17m-52 30 35-11m-35 25 52-17m-52 31 26-9" opacity=".65" />
      <path d="m91 60 110-32-39 83-18-31-53-20Zm53 20 57-52m-57 52-5 31 23-16M91 60l5 8 43 16" fill="var(--shapeos-banner-middle)" />
      <path d="M112 102c-15 10-5 27 24 22 31-5 41-26 65-18" strokeDasharray="3 4" opacity=".7" />
      <path d="m347 68 44-14v45l-16 5-12 15v-11l-16 5V68Zm9 12 25-8m-25 20 17-6M332 84l15-5" opacity=".7" />
      <circle cx="201" cy="106" r="3"/><circle cx="332" cy="84" r="2"/>
    </g>
  </>,
  account: <>
    <g opacity=".4">
      <path d="m68 127 153 30 201-65-153-30L68 127Zm51 10L320 72m-151 75 201-65M118 111l153 30m-101-47 153 30m-101-47 153 30" />
      <path d="M79 48h45m-45 7h26M385 35v16m-8-8h16" />
    </g>
    <g>
      <path d="m153 48 125-26v109l-125 26V48Zm125-26 12 7v109l-12-7M153 157l12 7 125-26" />
      <ellipse cx="211" cy="70" rx="15" ry="18" transform="rotate(-11 211 70)" />
      <path d="M184 119v-9c0-30 54-41 54-11v9M168 58l18-4m-18 78 51-11m-51 21 27-6M259 45v16m-6-7 12-3" />
      <path d="m315 68 25-19 38 7v37c0 28-25 52-38 59-13-2-25-8-25-30V68Zm25-19 8-5 38 7v37c0 28-25 52-38 59l-8 5M378 56l8-5" fill="var(--shapeos-banner-middle)" />
      <path d="m326 76 16-13 25 5v26c0 18-15 35-25 42-10-2-16-8-16-23V76Zm6 26 10 6 16-23" />
      <path d="m108 93 24-8m-24 15 16-5m168-18 22-7" opacity=".6" strokeDasharray="2 4" />
    </g>
  </>,
}

export function PersonalBannerArt({ variant, className }: { variant: BannerArt; className?: string }) {
  return <svg data-personal-banner-art={variant} className={`${s.art} ${className ?? ''}`} viewBox="0 0 480 180" fill="none" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{illustrations[variant]}</svg>
}
