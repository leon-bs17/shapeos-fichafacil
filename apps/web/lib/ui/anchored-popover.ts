type Rect = { left: number; right: number; top: number; bottom: number };
type Viewport = { left: number; top: number; width: number; height: number };

/** Keep anchored panels inside the visible viewport, including mobile keyboards/zoom. */
export function positionAnchoredPopover(anchor: Rect, panel: { width: number; height: number }, viewport: Viewport, align: "start" | "end" = "end") {
  const inset = 8, gap = 8;
  const leftEdge = viewport.left + inset, topEdge = viewport.top + inset;
  const rightEdge = viewport.left + viewport.width - inset, bottomEdge = viewport.top + viewport.height - inset;
  const maxWidth = Math.max(0, rightEdge - leftEdge);
  const width = Math.min(panel.width, maxWidth);
  const below = Math.max(0, bottomEdge - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - gap - topEdge);
  const side = panel.height <= below || below >= above ? "bottom" : "top";
  const maxHeight = Math.min(side === "bottom" ? below : above, Math.max(0, bottomEdge - topEdge));
  const height = Math.min(panel.height, maxHeight);
  const desiredLeft = align === "start" ? anchor.left : anchor.right - width;
  const left = Math.max(leftEdge, Math.min(desiredLeft, rightEdge - width));
  const desiredTop = side === "bottom" ? anchor.bottom + gap : anchor.top - gap - height;
  const top = Math.max(topEdge, Math.min(desiredTop, bottomEdge - height));
  return { left, top, maxWidth, maxHeight, side };
}
