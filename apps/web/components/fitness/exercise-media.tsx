'use client'

import { useEffect, useRef, useState } from 'react'
import type { ExerciseMedia } from '@/lib/fitness/exercise-media'
import s from './exercise-demonstration.module.css'

export function ExerciseMediaPlayer({ media, name, playing, onError }: {
  media: ExerciseMedia; name: string; playing: boolean; onError: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const active = playing && visible

  useEffect(() => {
    // Cached images can finish loading before hydration attaches onLoad.
    const img = imageRef.current
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      if (active) void video.play().catch(() => {})
      else video.pause()
    }
    const img = imageRef.current, canvas = canvasRef.current
    if (!active && loaded && img && canvas) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')?.drawImage(img, 0, 0)
    }
  }, [active, loaded])

  return <div className={s.mediaStage} ref={containerRef}>
    {media.kind === 'video' ? <video ref={videoRef} src={media.src} poster={media.poster} className={s.media}
      muted loop playsInline preload="metadata" aria-label={`Demonstração de ${name}`} onError={onError}/>
      : <>
        {/* Native img preserves animated GIF playback and supports frame freezing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imageRef} src={media.src} width={360} height={360} alt={`Demonstração de ${name}`}
        loading="lazy" decoding="async" className={s.media} onLoad={() => setLoaded(true)} onError={onError}
        style={{ visibility: !active && loaded ? 'hidden' : 'visible' }}/>
        <canvas ref={canvasRef} className={s.frozenMedia} role="img" aria-label={`Demonstração pausada de ${name}`}
          hidden={active || !loaded}/></>}
  </div>
}
