'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Dumbbell, Maximize2, Play, X } from "lucide-react";

/**
 * ExerciseGif — animated exercise demo with graceful fallback and fullscreen preview.
 *
 * `src` can be:
 * - a GIF/WebP/image/video URL, or
 * - an array of frame URLs. Frame arrays are cycled to demonstrate the movement.
 */
export const ExerciseGif = ({ src, alt, size = 112, frameDuration = 700 }) => {
  const frames = useMemo(() => {
    if (Array.isArray(src)) return src.filter(Boolean);
    return src ? [src] : [];
  }, [src]);

  const [frameIndex, setFrameIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setFrameIndex(0);
    setFailed(false);
    setExpanded(false);
  }, [src]);

  const currentSrc = frames[frameIndex];
  const isVideo =
    typeof currentSrc === 'string' && /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(currentSrc);

  useEffect(() => {
    if (frames.length <= 1 || failed) return undefined;

    frames.forEach((frame) => {
      if (!/\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(frame)) {
        const image = new Image();
        image.src = frame;
      }
    });

    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, frameDuration);

    return () => window.clearInterval(timer);
  }, [frames, frameDuration, failed]);

  useEffect(() => {
    if (!expanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setExpanded(false);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  if (failed || !currentSrc) {
    return (
      <div
        className="relative rounded-xl flex flex-col items-center justify-center overflow-hidden flex-shrink-0"
        style={{
          width: size,
          height: size,
          background:
            "var(--shapeos-surface)",
          border: "1px solid rgba(34,199,199,0.25)",
        }}
        data-testid="exercise-gif-fallback"
        aria-label={`Demonstração indisponível: ${alt}`}
      >
        <Dumbbell className="w-8 h-8 text-[var(--shapeos-brand)] opacity-80" strokeWidth={1.5} />
        <span
          className="mt-1.5 px-1.5 text-[8px] uppercase tracking-widest text-foreground text-center leading-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {alt}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="group relative rounded-xl overflow-hidden flex-shrink-0 bg-black cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shapeos-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shapeos-bg)]"
        style={{ width: size, height: size }}
        data-testid="exercise-gif"
        aria-label={`Ampliar demonstração da execução: ${alt}`}
      >
        {isVideo ? (
          <video
            key={currentSrc}
            src={currentSrc}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(100%) contrast(1.15) brightness(0.95)" }}
          />
        ) : (
          <img
            key={currentSrc}
            src={currentSrc}
            alt={`Execução de ${alt}`}
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(100%) contrast(1.15) brightness(0.95)" }}
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="absolute inset-0 ring-1 ring-white/5 rounded-xl pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25 pointer-events-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-foreground opacity-0 scale-90 transition-all group-hover:opacity-100 group-hover:scale-100">
            <Maximize2 className="h-4 w-4" />
          </div>
        </div>
        <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur pointer-events-none">
          <Play className="w-2.5 h-2.5 text-[var(--shapeos-brand)]" fill="var(--shapeos-brand)" />
          <span
            className="text-[9px] uppercase tracking-widest text-[var(--shapeos-text)]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Execução
          </span>
        </div>
      </button>

      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Execução ampliada de ${alt}`}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm"
          onMouseDown={() => setExpanded(false)}
        >
          <div
            className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--shapeos-bg)] shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--shapeos-brand)]">Execução do exercício</p>
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">{alt}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shapeos-brand)]"
                aria-label="Fechar demonstração ampliada"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-4">
              {isVideo ? (
                <video
                  src={currentSrc}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[82vh] max-w-full object-contain"
                  onError={() => setFailed(true)}
                />
              ) : (
                <img
                  src={currentSrc}
                  alt={`Execução ampliada de ${alt}`}
                  className="max-h-[82vh] max-w-full object-contain"
                  onError={() => setFailed(true)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ExerciseGif;
