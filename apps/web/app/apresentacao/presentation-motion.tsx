"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play } from "lucide-react";
import s from "./presentation.module.css";

const MotionContext = createContext({ paused: false, toggle: () => {} });

export function LandingMotion({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPaused(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = root.current;
    if (!element || paused || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    element.querySelectorAll("[data-reveal]").forEach((target) => {
      if (target.getBoundingClientRect().top > window.innerHeight)
        target.setAttribute("data-pending", "true");
      observer.observe(target);
    });
    return () => observer.disconnect();
  }, [paused]);
  return (
    <MotionContext.Provider
      value={{ paused, toggle: () => setPaused((value) => !value) }}
    >
      <div ref={root} className={className} data-paused={paused}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function RotatingWord() {
  const { paused } = useContext(MotionContext);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % 3);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [paused]);
  return (
    <>
      <span className={s.srOnly}>treino</span>
      <span className={s.word} aria-hidden="true">
        <span key={index}>{["treino", "ritmo", "foco"][index]}</span>
      </span>
    </>
  );
}

export function MotionToggle() {
  const { paused, toggle } = useContext(MotionContext);
  return (
    <button
      type="button"
      onClick={toggle}
      className={s.motionToggle}
      aria-label={paused ? "Ativar animações" : "Pausar animações"}
      title={paused ? "Ativar animações" : "Pausar animações"}
    >
      {paused ? <Play size={13} /> : <Pause size={13} />}
    </button>
  );
}
