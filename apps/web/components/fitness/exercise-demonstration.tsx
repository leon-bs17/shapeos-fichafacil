'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Expand, Pause, Play, X } from 'lucide-react'
import { findExerciseMotion, type Motion, type Point, type Pose } from '@/lib/fitness/exercise-motions'
import s from './exercise-demonstration.module.css'
import { resolveExerciseMedia, safeExerciseUrl } from '@/lib/fitness/exercise-media'
import { ExerciseMediaPlayer } from './exercise-media'

type Props = { name: string; exerciseId?: string; videoUrl?: string | null }
const limbPairs = [['hip','rightKnee'],['rightKnee','rightFoot'],['shoulder','rightElbow'],['rightElbow','rightHand'],['hip','leftKnee'],['leftKnee','leftFoot'],['shoulder','leftElbow'],['leftElbow','leftHand']] as const
function NativeMotion({attribute,values,hold}:{attribute:string;values:(string|number)[];hold?:boolean}) {
  if(hold) return null
  return <animate attributeName={attribute} values={[...values,values[0]].join(';')} dur="3.6s" calcMode="spline" keySplines={values.map(()=>'.42 0 .58 1').join(';')} repeatCount="indefinite" />
}
function Scene({motion}:{motion:Motion}) {
  const scene=motion.scene
  return <g stroke="#64748b" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".7">
    {scene==='bench' && (motion.id==='elevacao-pelvica' ? <><path d="M68 193H135M82 195V269M126 195V269"/><path d="M69 185H133" strokeWidth="14"/></> : <><path d="M68 193H204M90 195V269M188 195V269"/><path d="M69 185H202" strokeWidth="14"/></>)}
    {scene==='incline' && <><path d="M93 148L174 197H222M173 199V269M215 200V269"/><path d="M96 142L176 191H220" strokeWidth="13"/></>}
    {(scene==='seat'||scene==='cable') && <><path d="M111 115V192H187M126 193V269M177 193V269"/><path d="M120 185H185" strokeWidth="13"/></>}
    {scene==='prone' && <><path d="M64 193H264M90 195V269M243 195V269"/><path d="M65 186H261" strokeWidth="13"/></>}
    {scene==='pullup' && <path d="M86 269V53H250V269M111 53H227"/>}
    {scene==='dip' && <path d="M142 270V181H122M192 270V181H212"/>}
    {scene==='cable' && <path d="M276 270V23H225M225 23H76"/>}
    {scene==='legpress' && <><path d="M92 148L151 202H189M102 175L98 268M188 202L242 116"/><path d="M89 149L148 202" strokeWidth="13"/></>}
    {scene==='treadmill' && <path d="M72 262H263M263 262V141H235M74 270H275"/>}
    {scene==='bike' && <><circle cx="196" cy="230" r="27"/><path d="M113 174L161 243H235M205 245L226 118H208M95 171H131M96 263H259"/></>}
  </g>
}
function Mannequin({motion,svgRef}:{motion:Motion;svgRef:React.RefObject<SVGSVGElement|null>}) {
  const id=useId().replace(/:/g,'')
  const frames=motion.frames,first=frames[0]
  const motionAttr=(attribute:string,read:(pose:Pose)=>string|number)=><NativeMotion attribute={attribute} values={frames.map(read)} hold={motion.hold}/>
  const torso=(p:Pose)=>{const [sx,sy]=p.shoulder,[hx,hy]=p.hip,dx=hx-sx,dy=hy-sy,len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len;return `M${sx+nx*18},${sy+ny*18} Q${sx+dx*.5+nx*14},${sy+dy*.5+ny*14} ${hx+nx*11},${hy+ny*11} L${hx-nx*11},${hy-ny*11} Q${sx+dx*.5-nx*14},${sy+dy*.5-ny*14} ${sx-nx*18},${sy-ny*18} Z`}
  const mid=(p:Pose):Point=>[(p.leftHand[0]+p.rightHand[0])/2,(p.leftHand[1]+p.rightHand[1])/2]
  const feet=(p:Pose):Point=>[(p.leftFoot[0]+p.rightFoot[0])/2,(p.leftFoot[1]+p.rightFoot[1])/2]
  const floor=motion.id==='prancha'?236:270
  return <svg ref={svgRef} viewBox="0 0 340 300" role="img" aria-label={`Boneco demonstrando ${motion.name}`} className={s.figure}>
    <defs><linearGradient id={`${id}-body`} x1="0" x2="1"><stop stopColor="#9cabae"/><stop offset=".45" stopColor="#e7eeed"/><stop offset="1" stopColor="#a8b8b8"/></linearGradient><linearGradient id={`${id}-shirt`}><stop stopColor="#138e85"/><stop offset="1" stopColor="#47c3ac"/></linearGradient></defs>
    <ellipse cx="172" cy={floor+5} rx="102" ry="6" fill="currentColor" opacity=".06"/><path d={`M45 ${floor}H295`} stroke="currentColor" strokeOpacity=".1"/>
    <Scene motion={motion}/>
    {motion.scene==='legpress' && <line x1={feet(first)[0]-18} y1={feet(first)[1]-24} x2={feet(first)[0]+18} y2={feet(first)[1]+24} stroke="#64748b" strokeWidth="7" strokeLinecap="round">{motionAttr('x1',p=>feet(p)[0]-18)}{motionAttr('y1',p=>feet(p)[1]-24)}{motionAttr('x2',p=>feet(p)[0]+18)}{motionAttr('y2',p=>feet(p)[1]+24)}</line>}
    {motion.scene==='cable' && <line x1="225" y1="25" x2={mid(first)[0]} y2={mid(first)[1]} stroke="#94a3b8" strokeWidth="2">{motionAttr('x2',p=>mid(p)[0])}{motionAttr('y2',p=>mid(p)[1])}</line>}
    {limbPairs.map(([a,b],i)=><g key={`${a}-${b}`}>
      <line x1={first[a][0]} y1={first[a][1]} x2={first[b][0]} y2={first[b][1]} stroke={i<4?'#8da3a5':`url(#${id}-body)`} strokeWidth={i%4<2?17:12} strokeLinecap="round">{motionAttr('x1',p=>p[a][0])}{motionAttr('y1',p=>p[a][1])}{motionAttr('x2',p=>p[b][0])}{motionAttr('y2',p=>p[b][1])}</line>
      <circle cx={first[b][0]} cy={first[b][1]} r={i%4<2?7:5} fill={i<4?'#7c9396':'#aabdbd'}>{motionAttr('cx',p=>p[b][0])}{motionAttr('cy',p=>p[b][1])}</circle>
    </g>)}
    <path d={torso(first)} fill={`url(#${id}-shirt)`}>{motionAttr('d',torso)}</path>
    <line x1={first.head[0]} y1={first.head[1]} x2={first.shoulder[0]} y2={first.shoulder[1]} stroke="#b3c4c4" strokeWidth="12" strokeLinecap="round">{motionAttr('x1',p=>p.head[0])}{motionAttr('y1',p=>p.head[1])}{motionAttr('x2',p=>p.shoulder[0])}{motionAttr('y2',p=>p.shoulder[1])}</line>
    <circle cx={first.head[0]} cy={first.head[1]} r="15" fill={`url(#${id}-body)`}>{motionAttr('cx',p=>p.head[0])}{motionAttr('cy',p=>p.head[1])}</circle>
    {(['leftFoot','rightFoot'] as const).map(joint=><line key={joint} x1={first[joint][0]-6} y1={first[joint][1]+3} x2={first[joint][0]+12} y2={first[joint][1]+3} stroke="#284a50" strokeWidth="9" strokeLinecap="round">{motionAttr('x1',p=>p[joint][0]-6)}{motionAttr('x2',p=>p[joint][0]+12)}{motionAttr('y1',p=>p[joint][1]+3)}{motionAttr('y2',p=>p[joint][1]+3)}</line>)}
    {motion.weight==='bar' && <g stroke="#334b54" strokeLinecap="round"><line x1={mid(first)[0]-50} y1={mid(first)[1]} x2={mid(first)[0]+50} y2={mid(first)[1]} strokeWidth="5">{motionAttr('x1',p=>mid(p)[0]-50)}{motionAttr('x2',p=>mid(p)[0]+50)}{motionAttr('y1',p=>mid(p)[1])}{motionAttr('y2',p=>mid(p)[1])}</line>{[-40,40].map(offset=><line key={offset} x1={mid(first)[0]+offset} x2={mid(first)[0]+offset} y1={mid(first)[1]-12} y2={mid(first)[1]+12} strokeWidth="10">{motionAttr('x1',p=>mid(p)[0]+offset)}{motionAttr('x2',p=>mid(p)[0]+offset)}{motionAttr('y1',p=>mid(p)[1]-12)}{motionAttr('y2',p=>mid(p)[1]+12)}</line>)}</g>}
    {motion.weight==='dumbbells' && (['leftHand','rightHand'] as const).map(joint=><g key={joint} stroke="#334b54" strokeLinecap="round"><line x1={first[joint][0]-12} x2={first[joint][0]+12} y1={first[joint][1]} y2={first[joint][1]} strokeWidth="4">{motionAttr('x1',p=>p[joint][0]-12)}{motionAttr('x2',p=>p[joint][0]+12)}{motionAttr('y1',p=>p[joint][1])}{motionAttr('y2',p=>p[joint][1])}</line>{[-10,10].map(offset=><line key={offset} x1={first[joint][0]+offset} x2={first[joint][0]+offset} y1={first[joint][1]-7} y2={first[joint][1]+7} strokeWidth="6">{motionAttr('x1',p=>p[joint][0]+offset)}{motionAttr('x2',p=>p[joint][0]+offset)}{motionAttr('y1',p=>p[joint][1]-7)}{motionAttr('y2',p=>p[joint][1]+7)}</line>)}</g>)}
    {motion.weight==='rope' && <path d={`M${first.leftHand.join(',')} L170,82 L${first.rightHand.join(',')}`} fill="none" stroke="#334b54" strokeWidth="5" strokeLinecap="round">{motionAttr('d',p=>`M${p.leftHand.join(',')} L170,82 L${p.rightHand.join(',')}`)}</path>}
  </svg>
}
export function ExerciseDemonstration({name,exerciseId,videoUrl}:Props) {
  const motion=findExerciseMotion(name,exerciseId)
  const resolvedMedia=resolveExerciseMedia(name,videoUrl,exerciseId)
  const [failedSource,setFailedSource]=useState<string|null>(null)
  const media=resolvedMedia?.src===failedSource?null:resolvedMedia
  const canPlay=!!media || (!!motion && !motion.hold)
  const [playing,setPlaying]=useState(true),[expanded,setExpanded]=useState(false)
  const svgRef=useRef<SVGSVGElement>(null),dialogRef=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    if(media.matches)setPlaying(false)
    const change=()=>{if(media.matches)setPlaying(false)}
    media.addEventListener('change',change);return()=>media.removeEventListener('change',change)
  },[])
  useEffect(()=>{
    const svg=svgRef.current;if(!svg)return
    playing?svg.unpauseAnimations():svg.pauseAnimations()
    const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting&&playing)svg.unpauseAnimations();else svg.pauseAnimations()})
    observer.observe(svg);return()=>observer.disconnect()
  },[playing,motion,expanded,media?.src])
  useEffect(()=>{if(expanded)dialogRef.current?.showModal();else dialogRef.current?.close()},[expanded])
  const safeVideo=safeExerciseUrl(videoUrl)
  const content=<><div className={s.stage}>{media ? <ExerciseMediaPlayer key={media.src} media={media} name={name} playing={playing} onError={()=>setFailedSource(media.src)}/> : motion ? <Mannequin motion={motion} svgRef={svgRef}/> : <p className={s.pending}>Este exercício precisa de uma demonstração cadastrada pelo personal.</p>}</div>{motion && <p className={s.cue}>{motion.cue}</p>}<div className={s.controls}><span>{media?'Demonstração do exercício':motion?.hold?'Posição isométrica':motion?'Movimento ilustrativo':'Demonstração pendente'}</span><div>{canPlay && <button type="button" onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pausar demonstração':'Reproduzir demonstração'}>{playing?<Pause size={15}/>:<Play size={15}/>}</button>}{(media || motion) && !expanded && <button type="button" onClick={()=>setExpanded(true)} aria-label="Ampliar demonstração"><Expand size={15}/></button>}</div></div>{media?.credit && <span className={s.sourceCredit}>{media.source ? <a href={media.source} target="_blank" rel="noopener noreferrer">Fonte: {media.credit}</a> : media.credit}</span>}{safeVideo && safeVideo !== media?.src && <a className={s.videoLink} href={safeVideo} target="_blank" rel="noopener noreferrer">Ver vídeo do personal</a>}</>
  return <section className={s.demo} aria-label={`Demonstração de ${name}`} data-exercise-motion={motion?.id ?? 'pending'} data-exercise-media={media?.kind ?? 'illustration'}>
    {!expanded && content}
    <dialog ref={dialogRef} className={s.dialog} onCancel={()=>setExpanded(false)} onClose={()=>setExpanded(false)} onClick={event=>{if(event.target===event.currentTarget)setExpanded(false)}}><header><h3>{name}</h3><button type="button" onClick={()=>setExpanded(false)} aria-label="Fechar demonstração"><X size={20}/></button></header>{expanded && content}</dialog>
  </section>
}
export function ExercisePreview(props:Props){
  const [open,setOpen]=useState(false),dialogRef=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(open)dialogRef.current?.showModal();else dialogRef.current?.close()},[open])
  return <><button type="button" className={s.previewButton} onClick={()=>setOpen(true)} aria-label={`Ver movimento de ${props.name}`}><Play size={13}/>Ver movimento</button><dialog className={s.dialog} ref={dialogRef} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><header><h3>{props.name}</h3><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar demonstração"><X size={20}/></button></header>{open && <ExerciseDemonstration {...props}/>}</dialog></>
}

export function ExerciseThumbnail({name,exerciseId,videoUrl}:Props) {
  const motion = findExerciseMotion(name,exerciseId)
  const resolvedMedia = resolveExerciseMedia(name,videoUrl,exerciseId)
  const [failedSource,setFailedSource] = useState<string | null>(null)
  const media = resolvedMedia?.src === failedSource ? null : resolvedMedia
  const [playing,setPlaying] = useState(false)
  const [visible,setVisible] = useState(false)
  const [ready,setReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    setPlaying(!media.matches)
    const change = () => setPlaying(!media.matches)
    media.addEventListener('change',change)
    return () => media.removeEventListener('change',change)
  },[])
  useEffect(() => {
    const container = containerRef.current
    if(!container) return
    const observer = new IntersectionObserver(entries => {
      const inView = entries[0]?.isIntersecting ?? false
      setVisible(inView)
      if(inView) setReady(true)
    })
    observer.observe(container)
    return () => observer.disconnect()
  },[])
  useEffect(() => {
    const svg = svgRef.current
    if(!svg) return
    if(playing && visible) svg.unpauseAnimations()
    else svg.pauseAnimations()
  },[playing,visible,ready,motion,media?.src])
  return (
    <div ref={containerRef} className={s.thumbnail} data-exercise-motion={motion?.id ?? 'pending'} data-exercise-media={media?.kind ?? 'illustration'} aria-label={`Prévia de ${name}`}>
      {media && ready ? <ExerciseMediaPlayer key={media.src} media={media} name={name} playing={playing && visible} onError={() => setFailedSource(media.src)} /> : motion ? (ready ? <Mannequin motion={motion} svgRef={svgRef} /> : <span className={s.thumbnailPlaceholder}>Movimento</span>) : <span className={s.thumbnailPlaceholder}>Prévia indisponível</span>}
      {(media || (motion && !motion.hold)) && ready ? <button type="button" className={s.thumbnailPause} onClick={() => setPlaying(value => !value)} aria-label={playing ? `Pausar prévia de ${name}` : `Reproduzir prévia de ${name}`}>{playing ? <Pause size={12} /> : <Play size={12} />}</button> : null}
    </div>
  )
}
