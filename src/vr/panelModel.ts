export interface PanelButton { id: string; x: number; y: number; w: number; h: number; label: string }

/** Hit test in canvas pixels. u,v are texture UVs (v up); canvas y grows downward. */
export function hitTest(buttons: PanelButton[], u: number, v: number, cw: number, ch: number): PanelButton | null {
  const px = u * cw, py = (1 - v) * ch;
  return buttons.find((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) ?? null;
}

export function layoutLevelButtons(labels: { id: string; label: string }[], cw: number, top: number, rowH: number, pad: number): PanelButton[] {
  return labels.map((l, i) => ({ id: l.id, label: l.label, x: pad, y: top + i * (rowH + pad), w: cw - 2 * pad, h: rowH }));
}
