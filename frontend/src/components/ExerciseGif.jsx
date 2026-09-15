import React, { useState } from "react";
import { Dumbbell, Play } from "lucide-react";

/**
 * ExerciseGif — image with graceful fallback.
 * If the remote image fails to load, renders a branded SVG placeholder
 * with the exercise name so the card never breaks.
 */
export const ExerciseGif = ({ src, alt, size = 112 }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className="relative rounded-xl flex flex-col items-center justify-center overflow-hidden flex-shrink-0"
        style={{
          width: size,
          height: size,
          background:
            "linear-gradient(135deg, rgba(0,210,210,0.1), rgba(0,0,0,0.5))",
          border: "1px solid rgba(0,210,210,0.25)",
        }}
        data-testid="exercise-gif-fallback"
      >
        <Dumbbell className="w-8 h-8 text-[#00D2D2] opacity-80" strokeWidth={1.5} />
        <span
          className="mt-1.5 px-1.5 text-[8px] uppercase tracking-widest text-zinc-300 text-center leading-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0 bg-black"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
        style={{ filter: "grayscale(100%) contrast(1.15) brightness(0.95)" }}
        loading="lazy"
      />
      <div className="absolute inset-0 ring-1 ring-white/5 rounded-xl pointer-events-none" />
      <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur">
        <Play className="w-2.5 h-2.5 text-[#00D2D2]" fill="#00D2D2" />
        <span
          className="text-[9px] uppercase tracking-widest text-[#F5F5F5]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Demo
        </span>
      </div>
    </div>
  );
};

export default ExerciseGif;
