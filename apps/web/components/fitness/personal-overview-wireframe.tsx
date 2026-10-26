/** Decorative training wireframe: a static dumbbell, distinct from Admin's globe. */
export function PersonalOverviewWireframe({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 300 190" fill="none" aria-hidden="true" focusable="false">
    <g transform="rotate(-23 150 95)" stroke="currentColor" strokeWidth=".65">
      <g opacity=".65">
        {Array.from({ length: 9 }, (_, index) => <ellipse key={index} cx={104 + index * 11.5} cy="95" rx="4" ry="8" />)}
        <path d="M104 87H196M104 103H196M104 95H196" />
      </g>
      {[58, 68, 78, 88, 212, 222, 232, 242].map((x, index) => <g key={x} opacity={index === 3 || index === 4 ? 1 : .65}>
        <ellipse cx={x} cy="95" rx="15" ry={index === 0 || index === 7 ? 34 : 46} />
        <ellipse cx={x} cy="95" rx="5" ry="10" />
      </g>)}
      {[-.8, -.55, -.28, 0, .28, .55, .8].map(offset => {
        const y = 95 + offset * 46
        const dx = Math.sqrt(1 - offset * offset) * 15
        return <g key={offset} opacity=".5"><path d={`M${68 - dx} ${y}H${88 - dx}M${68 + dx} ${y}H${88 + dx}M${212 - dx} ${y}H${232 - dx}M${212 + dx} ${y}H${232 + dx}`} /></g>
      })}
      <path d="M50 91H58M50 99H58M242 91H250M242 99H250M68 49H88M68 141H88M212 49H232M212 141H232" opacity=".6" />
    </g>
    <path d="M23 159L78 150L126 157L180 143L229 148L278 127" stroke="currentColor" strokeWidth=".7" strokeDasharray="2 5" opacity=".3" />
  </svg>
}
