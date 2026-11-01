/**
 * stationLayout.ts: the ONE place where station placements live.
 *
 * Builders, walk mode, VR and tests all read from here. Nothing in this file overrides a
 * Verified / Provisional value in stationSpec.ts: levels and RLs are read from the spec,
 * everything else here is an ASSUMED architectural placement (see `confidence` / `source`).
 *
 * Coordinates: X across the 13.4 m box (-6.7..+6.7), Y = world Y (ground = 0, so depth is negative),
 * Z along the 200 m length (-100..+100).
 */
import { STATION_SPEC, depthToWorldY } from './stationSpec';

export type Confidence = 'Verified' | 'Provisional' | 'Assumed';

export interface Rect { x0: number; x1: number; z0: number; z1: number }
export interface Opening extends Rect { id: string; reason: string }

export const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
};

// ---------------------------------------------------------------------------------------------
// Levels (read from the spec, never retyped)
// ---------------------------------------------------------------------------------------------
const levelDepth = (id: string): number => STATION_SPEC.levels.find((l) => l.id === id)!.depthBelowGround;
export type LevelId = 'concourse' | 'upper_platform' | 'intermediate' | 'lower_platform';
export const LEVEL_Y: Record<LevelId, number> = {
  concourse: depthToWorldY(levelDepth('concourse')),
  upper_platform: depthToWorldY(levelDepth('upper_platform')),
  intermediate: depthToWorldY(levelDepth('intermediate')),
  lower_platform: depthToWorldY(levelDepth('lower_platform')),
};

export const BOX = {
  x0: -STATION_SPEC.stationBox.width.value / 2,
  x1: STATION_SPEC.stationBox.width.value / 2,
  z0: -STATION_SPEC.stationBox.length.value / 2,
  z1: STATION_SPEC.stationBox.length.value / 2,
};
/** Finished (walkable / clad) interior: the wall cladding stands 0.82 m inside the diaphragm wall face. */
export const FINISH = { x0: -5.9, x1: 5.9, zEnd: 98 };

// ---------------------------------------------------------------------------------------------
// Columns. DECISION (see PROJECT_TRACKING.md): the column line is X = -0.5, NOT grid line C at X = 0.
// No Sadar Bazar source drawing (WTC Fig 15 / GZ Fig 2) is available in the repo, so this stays ASSUMED.
// It keeps columns off the platform edge / PSD line (X = 0.2).
// ---------------------------------------------------------------------------------------------
export const COLUMNS = {
  x: -0.7,
  radius: 0.45,
  zs: range(-90, 90, 10), // 10 m grid
  confidence: 'Assumed' as Confidence,
  source: 'Column line assumed; 10 m longitudinal grid per station spec',
};

// ---------------------------------------------------------------------------------------------
// Clearances
// ---------------------------------------------------------------------------------------------
export const CLEARANCES = {
  minWalkWidth: 2.0,        // m, preferred clear walking width
  absMinWalkWidth: 1.5,     // m, flagged if below 2.0
  stairHeadroom: 2.2,       // m
  maxRiser: 0.18,           // m
  platformEdgeSafe: [0.5, 1.0] as [number, number],
  liftLobby: 1.5,           // m x m
  columnGap: 0.4,           // m column face to stair / lift
};

// ---------------------------------------------------------------------------------------------
// Platforms. ASSUMED width widened from 4.8 m to 6.1 m (see PROJECT_TRACKING.md): with a 2.2 m stair
// landing mid-platform and a 0.4 m column gap, a 4.8 m platform cannot keep a 2.0 m clear lane.
// The track-side edge (X = 0.2, PSD line) does not move.
// ---------------------------------------------------------------------------------------------
export const PLATFORM = {
  x0: FINISH.x0,
  x1: 0.2,
  halfLength: STATION_SPEC.assumedArchitectural.platformLength.value / 2, // 70 m
  deckThickness: 0.35,
  edgeTactile: { x0: -0.2, x1: 0.2, width: 0.4 },
  confidence: 'Assumed' as Confidence,
};
export const platformRect = (): Rect => ({ x0: PLATFORM.x0, x1: PLATFORM.x1, z0: -PLATFORM.halfLength, z1: PLATFORM.halfLength });

// ---------------------------------------------------------------------------------------------
// Stairs: vertical datum is Verified (level RLs), plan placement is ASSUMED.
// ---------------------------------------------------------------------------------------------
export const STAIR_WIDTH = STATION_SPEC.assumedArchitectural.staircaseWidth.value; // 2.20 (Assumed)
export const STAIR_X = { min: -3.8, max: -3.8 + STAIR_WIDTH }; // -3.8 .. -1.6 (0.45 m clear of the column face at -1.15)
/** Stair body thickness below the pitch line (folded-plate soffit). */
export const STAIR_SOFFIT = 0.3;

export interface StairLayout {
  id: string; name: string; fromLevel: LevelId; toLevel: LevelId;
  xMin: number; xMax: number; zTop: number; zBottom: number; yTop: number; yBottom: number;
  steps: number; riser: number; tread: number; slopeDeg: number;
}
function makeStair(id: string, name: string, fromLevel: LevelId, toLevel: LevelId, zTop: number, zBottom: number): StairLayout {
  const yTop = LEVEL_Y[fromLevel], yBottom = LEVEL_Y[toLevel];
  const rise = yTop - yBottom, run = Math.abs(zBottom - zTop);
  const steps = Math.ceil(rise / CLEARANCES.maxRiser - 1e-9);
  return { id, name, fromLevel, toLevel, xMin: STAIR_X.min, xMax: STAIR_X.max, zTop, zBottom, yTop, yBottom, steps,
    riser: rise / steps, tread: run / steps, slopeDeg: (Math.atan2(rise, run) * 180) / Math.PI };
}
export const STAIRS: StairLayout[] = [
  makeStair('stair-conc-to-uplat', 'Stairs: Concourse to Upper Platform', 'concourse', 'upper_platform', -8, 8),
  makeStair('stair-uplat-to-int', 'Stairs: Upper Platform to Intermediate Plant', 'upper_platform', 'intermediate', 18, 36),
  makeStair('stair-int-to-lplat', 'Stairs: Intermediate to Lower Platform', 'intermediate', 'lower_platform', -18, -34),
];

/** Per-step geometry: z-cell, tread top, soffit, and whether it must be solid down to the landing floor. */
export interface StepCell { i: number; zA: number; zB: number; top: number; bottom: number; solidToFloor: boolean }
export function stairCells(s: StairLayout): StepCell[] {
  const dir = Math.sign(s.zBottom - s.zTop);
  const out: StepCell[] = [];
  for (let i = 0; i < s.steps; i++) {
    const zA = s.zTop + dir * i * s.tread, zB = s.zTop + dir * (i + 1) * s.tread;
    const top = s.yTop - i * s.riser;
    const soffit = Math.max(s.yTop - (i + 1) * s.riser - STAIR_SOFFIT, s.yBottom);
    // Space under this step is unusable if the soffit is lower than 2.2 m above the landing floor.
    const solidToFloor = soffit - s.yBottom < CLEARANCES.stairHeadroom;
    out.push({ i, zA: Math.min(zA, zB), zB: Math.max(zA, zB), top, bottom: solidToFloor ? s.yBottom : soffit, solidToFloor });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Lift (ASSUMED): 2.4 x 2.4 m footprint (spec), doors facing +Z onto a 1.5 m lobby.
// ---------------------------------------------------------------------------------------------
const L = STATION_SPEC.assumedArchitectural.liftFootprint;
export const LIFT = {
  cx: -4.56, cz: 12.0, w: L.width, l: L.length,
  post: 0.12,
  /** Outer rectangle (corner posts included): this is exactly the hole cut in every slab it crosses. */
  outer: (): Rect => ({ x0: -4.56 - L.width / 2 - 0.06, x1: -4.56 + L.width / 2 + 0.06, z0: 12.0 - L.length / 2 - 0.06, z1: 12.0 + L.length / 2 + 0.06 }),
  /** Cabin interior clear limits for walk mode (inset 0.35 m from the shaft glass). */
  cabin: (): Rect => ({ x0: -4.56 - 0.95, x1: -4.56 + 0.95, z0: 12.0 - 0.95, z1: 12.0 + 0.95 }),
  doorZ: 12.0 + L.length / 2,
  doorHalfWidth: 0.6,
  lobby: (): Rect => ({ x0: -4.56 - 0.75, x1: -4.56 + 0.75, z0: 12.0 + L.length / 2 + 0.06, z1: 12.0 + L.length / 2 + 0.06 + CLEARANCES.liftLobby }),
  confidence: 'Assumed' as Confidence,
};

// ---------------------------------------------------------------------------------------------
// Concourse equipment (AFC line moved off the column row: gates at z = -20 sat on the column line)
// ---------------------------------------------------------------------------------------------
export const AFC_LINE = { z: -15, gateCount: 7, spacing: 0.9, halfSpan: 3.5, confidence: 'Assumed' as Confidence };
export const TVMS = { x: -5.3, zs: [-35, -31.5, -28, -24.5] };
export const SECURITY = { z: -45 };
export const NAME_SIGN_Z = [-55, 55];
export const BENCH_Z = [-55, 45, 55];
export const BENCH_X = -5.55; // against the west cladding, oriented along Z
export const PIDS = { x: -2.0, zs: [-40, 40] };
/** ESP is mounted on the WEST (waiting-side) face of the column at z = -10: box centre sits 0.06 m off the face. */
export const ESP = { z: -10, faceX: COLUMNS.x - COLUMNS.radius, boxX: COLUMNS.x - COLUMNS.radius - 0.06 };
export const EXIT_SIGN_Z = -15;
export const MAP_BOARD = { x: 0, z: -12 };

// ---------------------------------------------------------------------------------------------
// Slabs and openings. Openings are DERIVED from the stairs and the lift, never typed by hand.
// ---------------------------------------------------------------------------------------------
export type SlabId = 'concourse' | 'upper_platform_deck' | 'upper_undercroft' | 'intermediate' | 'lower_platform_deck';
export interface SlabSpec { id: SlabId; top: number; thickness: number; rect: Rect; openings: Opening[]; walkLevel: LevelId | null }

export const SLAB_DEFS: { id: SlabId; top: number; thickness: number; rect: Rect; walkLevel: LevelId | null }[] = [
  { id: 'concourse', top: LEVEL_Y.concourse, thickness: 0.4, rect: { x0: BOX.x0, x1: BOX.x1, z0: BOX.z0, z1: BOX.z1 }, walkLevel: 'concourse' },
  { id: 'upper_platform_deck', top: LEVEL_Y.upper_platform, thickness: PLATFORM.deckThickness, rect: platformRect(), walkLevel: 'upper_platform' },
  { id: 'upper_undercroft', top: -levelDepth('upper_undercroft'), thickness: 0.5, rect: { x0: BOX.x0, x1: BOX.x1, z0: BOX.z0, z1: BOX.z1 }, walkLevel: null },
  { id: 'intermediate', top: LEVEL_Y.intermediate, thickness: 0.45, rect: { x0: BOX.x0, x1: BOX.x1, z0: BOX.z0, z1: BOX.z1 }, walkLevel: 'intermediate' },
  { id: 'lower_platform_deck', top: LEVEL_Y.lower_platform, thickness: PLATFORM.deckThickness, rect: platformRect(), walkLevel: 'lower_platform' },
];

/** Cells of a stair that physically conflict with a slab (body overlaps it, or head clearance < 2.2 m above the tread). */
function stairOpening(s: StairLayout, slab: { top: number; thickness: number }): Opening | null {
  const bottom = slab.top - slab.thickness;
  const cells = stairCells(s).filter((c) => c.bottom < slab.top && bottom < c.top + CLEARANCES.stairHeadroom);
  if (!cells.length) return null;
  // The landing the stair starts from lies in the slab plane itself: the opening begins at the stair top edge.
  const z0 = Math.min(...cells.map((c) => c.zA)), z1 = Math.max(...cells.map((c) => c.zB));
  return { id: `${s.id}@${slab.top.toFixed(2)}`, x0: s.xMin, x1: s.xMax, z0, z1, reason: `stair ${s.id}` };
}
const inRectX = (r: Rect, s: Rect) => r.x1 > s.x0 + 1e-9 && r.x0 < s.x1 - 1e-9;

function openingsFor(def: { top: number; thickness: number; rect: Rect }): Opening[] {
  const out: Opening[] = [];
  for (const s of STAIRS) {
    const o = stairOpening(s, def);
    if (o && inRectX(o, def.rect) && o.z1 > def.rect.z0 && o.z0 < def.rect.z1) out.push(o);
  }
  // The lift shaft runs from the concourse to the lower platform floor: it crosses every slab above that floor
  const bottom = def.top - def.thickness;
  if (def.top <= LEVEL_Y.concourse + 1e-6 && def.top > LEVEL_Y.lower_platform + 1e-6 && bottom < LEVEL_Y.concourse + 3.0) {
    out.push({ id: 'lift-shaft', ...LIFT.outer(), reason: 'lift shaft' });
  }
  return out;
}

export const SLABS: SlabSpec[] = SLAB_DEFS.map((d) => ({ ...d, openings: openingsFor(d) }));
export const slabById = (id: SlabId): SlabSpec => SLABS.find((s) => s.id === id)!;
/** The slab/deck whose top is the walking surface of a level. */
export const slabForLevel = (l: LevelId): SlabSpec => SLABS.find((s) => s.walkLevel === l)!;

// ---------------------------------------------------------------------------------------------
// Rectangle subtraction (shared by slab meshes, floor finishes, ceilings and LED runs)
// ---------------------------------------------------------------------------------------------
/** Splits `rect` into axis-aligned pieces that cover rect minus the openings (guillotine sweep along Z, merged). */
export function subtractRects(rect: Rect, openings: Rect[]): Rect[] {
  const clipped = openings
    .map((o) => ({ x0: Math.max(o.x0, rect.x0), x1: Math.min(o.x1, rect.x1), z0: Math.max(o.z0, rect.z0), z1: Math.min(o.z1, rect.z1) }))
    .filter((o) => o.x1 > o.x0 + 1e-9 && o.z1 > o.z0 + 1e-9);
  const zs = [...new Set([rect.z0, rect.z1, ...clipped.flatMap((o) => [o.z0, o.z1])])].sort((a, b) => a - b);
  const strips: { z0: number; z1: number; xs: [number, number][] }[] = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const z0 = zs[i], z1 = zs[i + 1];
    if (z1 - z0 < 1e-9) continue;
    const zm = (z0 + z1) / 2;
    const cut = clipped.filter((o) => zm > o.z0 && zm < o.z1).map((o) => [o.x0, o.x1] as [number, number]).sort((a, b) => a[0] - b[0]);
    const xs: [number, number][] = [];
    let cursor = rect.x0;
    for (const [a, b] of cut) {
      if (a > cursor + 1e-9) xs.push([cursor, a]);
      cursor = Math.max(cursor, b);
    }
    if (rect.x1 > cursor + 1e-9) xs.push([cursor, rect.x1]);
    strips.push({ z0, z1, xs });
  }
  // merge consecutive strips with identical x intervals
  const merged: typeof strips = [];
  for (const s of strips) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.z1 - s.z0) < 1e-9 && JSON.stringify(last.xs) === JSON.stringify(s.xs)) last.z1 = s.z1;
    else merged.push({ ...s, xs: s.xs.map((v) => [...v] as [number, number]) });
  }
  return merged.flatMap((s) => s.xs.map(([x0, x1]) => ({ x0, x1, z0: s.z0, z1: s.z1 })));
}

/** Breaks a longitudinal run at x (from z0..z1) wherever it crosses an opening. */
export function splitRun(x: number, z0: number, z1: number, openings: Rect[], halfWidth = 0): [number, number][] {
  const r = subtractRects({ x0: x - halfWidth, x1: x + halfWidth, z0, z1 }, openings);
  return r.map((p) => [p.z0, p.z1] as [number, number]);
}

export const rectsOverlap = (a: Rect, b: Rect): boolean => a.x1 > b.x0 + 1e-9 && a.x0 < b.x1 - 1e-9 && a.z1 > b.z0 + 1e-9 && a.z0 < b.z1 - 1e-9;
export const rectCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
