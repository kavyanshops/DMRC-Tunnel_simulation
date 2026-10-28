import type { ZoneColour } from '../data/types';

export const ZONE_COLOURS: Record<ZoneColour, string> = {
  investigation: '#38bdf8', utilities: '#f59e0b', coordination: '#a78bfa', ground: '#14b8a6',
  instrument: '#22d3ee', excavation: '#fb923c', tbm: '#f43f5e', lining: '#e2e8f0',
  grout: '#84cc16', breakthrough: '#f472b6', natm: '#facc15', fitout: '#60a5fa',
};

const GY = 70;          // ground surface y
const S = 7;            // px per metre (schematic scale, NOT to scale overall)
const d = (m: number) => GY + m * S;

/**
 * Long-section schematic. Low-poly, NOT TO SCALE. Depth reference marks come from the verified
 * spec (groundwater 5-6 m, strata 4.5 / 21.5 m). Visual state depends on the stage order (1-12).
 */
export function stageSchematic(order: number, zone: ZoneColour): string {
  const c = ZONE_COLOURS[zone];
  const boxX = 90, boxW = 120, boxBottom = d(34);
  const upperY = d(14), lowerY = d(29), tunH = 6.35 * S;
  const rightEnd = 700;
  const tbmX = order === 7 ? boxX + boxW + 40 : order === 8 ? 380 : order >= 10 ? rightEnd - 20 : 0;
  const lined = order >= 8;
  const parts: string[] = [];

  // strata
  parts.push(`<rect x="0" y="${GY}" width="800" height="${4.5 * S}" fill="#5b4b3a" opacity=".55"/>`);
  parts.push(`<rect x="0" y="${d(4.5)}" width="800" height="${17 * S}" fill="#475569" opacity=".5"/>`);
  parts.push(`<rect x="0" y="${d(21.5)}" width="800" height="${d(40) - d(21.5)}" fill="#334155" opacity=".7"/>`);
  parts.push(`<text x="708" y="${d(2.5)}" class="sch-lbl">Sandy silt</text><text x="708" y="${d(13)}" class="sch-lbl">Weathered quartzite</text><text x="708" y="${d(31)}" class="sch-lbl">Fresh quartzite</text>`);
  // water table
  parts.push(`<line x1="0" x2="800" y1="${d(5.5)}" y2="${d(5.5)}" stroke="#38bdf8" stroke-dasharray="6 4" opacity=".8"/><text x="8" y="${d(5.5) - 4}" class="sch-lbl" fill="#7dd3fc">Water table ~5-6 m</text>`);
  // road + buildings
  const roadHi = order === 3 ? `fill="${c}" opacity=".8"` : `fill="#1e293b"`;
  parts.push(`<rect x="0" y="${GY - 6}" width="800" height="6" ${roadHi}/>`);
  [[250, 40], [330, 34], [560, 44]].forEach(([x, hgt]) => parts.push(`<rect x="${x}" y="${GY - 6 - hgt}" width="40" height="${hgt}" fill="#64748b" stroke="#94a3b8"/>`));
  // borehole logs
  if (order === 1) [150, 300, 480, 640].forEach((x) => parts.push(`<line x1="${x}" x2="${x}" y1="${GY}" y2="${d(30)}" stroke="${c}" stroke-width="3"/>`));
  // sewer (provisional)
  if (order >= 2) parts.push(`<circle cx="${boxX + boxW + 22}" cy="${d(10)}" r="9" fill="none" stroke="${order === 2 ? c : '#f59e0b'}" stroke-width="${order === 2 ? 4 : 2}" stroke-dasharray="4 3"/><text x="${boxX + boxW + 36}" y="${d(10) + 4}" class="sch-lbl">Sewer (provisional)</text>`);
  // grout zone
  if (order >= 4) parts.push(`<ellipse cx="290" cy="${d(11)}" rx="70" ry="${5 * S}" fill="${ZONE_COLOURS.ground}" opacity="${order === 4 ? 0.55 : 0.18}" stroke="${ZONE_COLOURS.ground}" stroke-dasharray="5 3"/>`);
  // instruments
  if (order >= 5) [[270, 1], [350, 1], [580, 1], [450, 1]].forEach(([x]) => parts.push(`<polygon points="${x},${GY - 2} ${x - 5},${GY + 7} ${x + 5},${GY + 7}" fill="${ZONE_COLOURS.instrument}" opacity="${order === 5 ? 1 : 0.7}"/>`));
  // station box
  if (order >= 6) {
    const fill = order === 6 ? c : '#0b1220';
    parts.push(`<rect x="${boxX}" y="${GY}" width="${boxW}" height="${boxBottom - GY}" fill="${fill}" fill-opacity="${order === 6 ? 0.35 : 0.9}" stroke="${order === 6 ? c : '#7dd3fc'}" stroke-width="2"/>`);
    parts.push(`<text x="${boxX + 8}" y="${GY + 18}" class="sch-lbl">Station box</text>`);
  }
  // tunnels
  if (order >= 7) {
    const tunnel = (y: number, tag: string, cut: number) => {
      const x2 = lined ? rightEnd : Math.min(rightEnd, boxX + boxW + 40);
      parts.push(`<rect x="${boxX + boxW}" y="${y}" width="${Math.max(0, Math.min(x2, cut) - (boxX + boxW))}" height="${tunH}" fill="#0b1220" stroke="${lined ? '#e2e8f0' : c}" stroke-width="${order === 8 ? 3 : 2}"/>`);
      parts.push(`<text x="${rightEnd - 80}" y="${y - 4}" class="sch-lbl">${tag}</text>`);
    };
    const reach = order === 7 ? boxX + boxW + 40 : order === 8 ? 380 : rightEnd;
    tunnel(upperY, 'Upper tunnel', reach);
    if (order >= 10 || order === 8) tunnel(lowerY, 'Lower tunnel', order === 8 ? 300 : rightEnd);
  }
  // lining ring ticks
  if (order === 8 || order === 9) for (let x = boxX + boxW + 10; x < 360; x += 14) parts.push(`<line x1="${x}" x2="${x}" y1="${upperY}" y2="${upperY + tunH}" stroke="#e2e8f0" opacity=".7"/>`);
  // annular grout
  if (order === 9) parts.push(`<rect x="${boxX + boxW}" y="${upperY - 5}" width="${380 - (boxX + boxW)}" height="${tunH + 10}" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="3 2"/>`);
  // TBM
  if (tbmX && order <= 10) parts.push(`<rect x="${tbmX - 26}" y="${upperY - 2}" width="30" height="${tunH + 4}" rx="4" fill="${ZONE_COLOURS.tbm}"/><text x="${tbmX - 26}" y="${upperY - 8}" class="sch-lbl" fill="${ZONE_COLOURS.tbm}">TBM</text>`);
  // breakthrough shaft
  if (order >= 10) parts.push(`<rect x="${rightEnd}" y="${upperY - 20}" width="40" height="${tunH + 40}" fill="${order === 10 ? c : '#0b1220'}" fill-opacity="${order === 10 ? 0.45 : 0.9}" stroke="${c}"/>`);
  // cross passage (assumed)
  if (order >= 11) parts.push(`<rect x="${boxX + boxW + 120}" y="${upperY + tunH}" width="22" height="${lowerY - upperY - tunH}" fill="#0b1220" stroke="${order === 11 ? c : '#facc15'}" stroke-width="${order === 11 ? 4 : 2}" stroke-dasharray="4 3"/><text x="${boxX + boxW + 148}" y="${(upperY + lowerY) / 2 + 22}" class="sch-lbl">Cross-passage (ASSUMED)</text>`);
  // fit-out
  if (order === 12) {
    parts.push(`<line x1="${boxX + boxW}" x2="${rightEnd}" y1="${upperY + tunH - 6}" y2="${upperY + tunH - 6}" stroke="${c}" stroke-width="3"/><line x1="${boxX + boxW}" x2="${rightEnd}" y1="${lowerY + tunH - 6}" y2="${lowerY + tunH - 6}" stroke="${c}" stroke-width="3"/>`);
    parts.push(`<rect x="${boxX + 10}" y="${boxBottom - 20}" width="16" height="12" fill="${c}"/><text x="${boxX + 30}" y="${boxBottom - 10}" class="sch-lbl">Sump / pumps</text><circle cx="${boxX + 90}" cy="${GY + 40}" r="9" fill="none" stroke="${c}" stroke-width="3"/><text x="${boxX + 54}" y="${GY + 64}" class="sch-lbl">Fan</text>`);
  }
  return `<svg viewBox="0 0 800 ${d(40) + 10}" role="img" aria-label="Schematic long section for this construction stage, not to scale" class="sch-svg">${parts.join('')}<text x="8" y="${d(40)}" class="sch-lbl">Schematic long section — NOT TO SCALE. Colour = stage zone. Cross-passage and sewer position are not final.</text></svg>`;
}
