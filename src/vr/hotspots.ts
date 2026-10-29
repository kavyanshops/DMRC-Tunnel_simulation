import rawComponents from '../data/components.json';

export interface Hotspot {
  id: string;
  name: string;
  nameHindi?: string;
  confidence: string;
  source: string;
  description: string;
  safetyNotice?: string;
  protocol: string[];
  position: [number, number, number];
}

/** Read-only view over the existing component library data. */
export function loadHotspots(): Hotspot[] {
  return (rawComponents as any[])
    .filter((c) => c.coordinates && Number.isFinite(c.coordinates.x) && Number.isFinite(c.coordinates.y) && Number.isFinite(c.coordinates.z))
    .map((c) => ({
      id: c.id,
      name: c.name,
      nameHindi: c.nameHindi,
      confidence: c.confidence ?? 'Assumed',
      source: c.source ?? 'unspecified',
      description: c.description ?? '',
      safetyNotice: c.safetyNotice,
      protocol: Array.isArray(c.inspectionProtocol) ? c.inspectionProtocol : [],
      position: [c.coordinates.x, c.coordinates.y, c.coordinates.z] as [number, number, number]
    }));
}

/** Word-wrap text for canvas drawing. */
export function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if ((line + ' ' + w).trim().length > maxChars) { if (line) out.push(line); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}
