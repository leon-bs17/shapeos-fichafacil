import s from './student-training-wireframe.module.css'

/** A dedicated training illustration: machined weights and a completion marker. */
export function StudentTrainingWireframe() {
  return <svg data-student-training-art className={s.art} viewBox="0 0 480 180" fill="none" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <g opacity=".35">
      <path d="m43 127 172 34 222-70-172-34L43 127Zm57 11L322 68m-166 82L379 80M97 110l173 34m-116-52 174 34m-115-53 173 34" />
      <path d="M65 42h56m-56 6h31M408 36v16m-8-8h16M378 148h34" />
      <path d="m90 151 114 22m8 2 84-26" strokeDasharray="2 4" />
    </g>
    <g transform="translate(0 3) rotate(-16 224 81)">
      <g opacity=".65"><path d="M137 74h173v14H137m0-7h173" />
        {Array.from({length:13},(_,i)=><ellipse key={i} cx={147+i*12.5} cy="81" rx="3" ry="7" />)}
      </g>
      {[{x:94,r:28},{x:105,r:39},{x:118,r:46},{x:131,r:46},{x:310,r:46},{x:323,r:46},{x:336,r:39},{x:347,r:28}].map(({x,r})=><g key={x}>
        <ellipse cx={x} cy="81" rx="14" ry={r} /><ellipse cx={x} cy="81" rx="4" ry="8" opacity=".65" />
      </g>)}
      {[-.85,-.6,-.3,0,.3,.6,.85].map(t=>{const dx=Math.sqrt(1-t*t)*14,y=81+t*46;return <path key={t} opacity=".5" d={`M${118-dx} ${y}h13M${118+dx} ${y}h13M${310-dx} ${y}h13M${310+dx} ${y}h13`} />})}
      <path d="M81 77h13m-13 8h13m253-8h13m-13 8h13M118 35h13m-13 92h13m179-92h13m-13 92h13" />
      <path d="M105 40h231m-231-5v10m231-10v10M76 47v68m-5-68h10m-10 68h10" opacity=".4" strokeDasharray="2 4" />
    </g>
    <g>
      <path d="m338 94 47-14 28 15v42l-47 15-28-16V94Zm0 0 28 15 47-14m-47 14v43" fill="var(--shapeos-banner-middle)" />
      <path d="m374 120 8 5 17-20" strokeWidth="1.4" />
      <path d="m347 105 10 6m-10 2 10 6m-10 2 10 6m17 11 25-8" opacity=".5" />
      <path d="m286 132 51-18" strokeDasharray="2 4" opacity=".65" /><circle cx="286" cy="132" r="3" />
    </g>
  </svg>
}
