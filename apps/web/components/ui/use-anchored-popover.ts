"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { positionAnchoredPopover } from "@/lib/ui/anchored-popover";

/** Pair with popover="manual": preserve theme/focus scope and escape clipped ancestors. */
export function useAnchoredPopover({ open, trigger, panel, onHidden, align = "start", matchWidth = false, heightLimit = Infinity, preferBelow = false }: {
  open: boolean;
  trigger: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
  onHidden: () => void;
  align?: "start" | "end";
  matchWidth?: boolean;
  heightLimit?: number;
  preferBelow?: boolean;
}) {
  const hiddenHandler = useRef(onHidden);
  useLayoutEffect(() => { hiddenHandler.current = onHidden; }, [onHidden]);
  useLayoutEffect(() => {
    if (!open) return;
    const element = panel.current, button = trigger.current;
    if (!element || !button) return;
    if (typeof element.showPopover === "function") element.showPopover();
    let frame = 0;
    const update = () => {
      const rect = button.getBoundingClientRect(), visual = window.visualViewport;
      const viewport = { left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0, width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight };
      if (rect.bottom < viewport.top || rect.top > viewport.top + viewport.height || rect.right < viewport.left || rect.left > viewport.left + viewport.width) { hiddenHandler.current(); return; }
      Object.assign(element.style, { position: "fixed", boxSizing: "border-box", inset: "auto", margin: "0", maxWidth: `${Math.max(0, viewport.width - 16)}px`, maxHeight: "none" });
      if (matchWidth) element.style.width = `${Math.min(rect.width, Math.max(0, viewport.width - 16))}px`;
      const box = element.getBoundingClientRect();
      const naturalHeight = Math.min(heightLimit, Math.max(element.scrollHeight + 2, box.height));
      const below = viewport.top + viewport.height - rect.bottom - 16;
      const height = preferBelow && below >= 80 ? Math.min(naturalHeight, below) : naturalHeight;
      const placement = positionAnchoredPopover(rect, { width: box.width, height }, viewport, align);
      Object.assign(element.style, { left: `${placement.left}px`, top: `${placement.top}px`, maxHeight: `${Math.min(heightLimit, placement.maxHeight)}px`, overflowY: "auto", overscrollBehavior: "contain", visibility: "visible" });
      element.dataset.side = placement.side;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(element); observer?.observe(button);
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      if (typeof element.hidePopover === "function" && element.matches(":popover-open")) element.hidePopover();
    };
  }, [open, trigger, panel, align, matchWidth, heightLimit, preferBelow]);
}
