/**
 * walkable.ts: where a person can actually stand.
 *
 * Everything here is GENERATED from stationLayout.ts: floor rectangles per level, minus the slab openings,
 * minus solid under-stair mass, minus the lift shaft and benches; plus the stair ramps. Walk mode, VR teleport,
 * the minimap and the tests all use the same data, so walkability can no longer drift from what is drawn.
 */
import {
  BENCH_X, BENCH_Z, FINISH, LEVEL_Y, LIFT, STAIRS, SLABS, platformRect, slabForLevel, stairCells, subtractRects,
  type LevelId, type Rect, type StairLayout,
} from '../data/stationLayout';

export const LEVEL_IDS: LevelId[] = ['concourse', 'upper_platform', 'intermediate', 'lower_platform'];

/** Walk-mode limits along the box (the headwalls sit at +/-100). */
export const WALK_Z = 95;
/** Keep-out margin around slab openings, solid stair mass and the lift (the guard rails sit on the edge). */
const OPENING_MARGIN = 0.15;
const SOLID_MARGIN = 0.2;
/** A surface counts only if the person's feet are within this vertical distance of it. */
export const SURFACE_TOLERANCE = 0.9;

export interface FloorZone { id: string; level: LevelId; y: number; rect: Rect }
export interface StairRamp { id: string; stair: StairLayout; rect: Rect; yAt: (z: number) => number }
export interface Surface { kind: 'floor' | 'stair'; y: number; level?: LevelId; zoneId?: string; stairId?: string }

const inflate = (r: Rect, m: number): Rect => ({ x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m });
const isPlatform = (l: LevelId) => l === 'upper_platform' || l === 'lower_platform';

/** Rectangles that are NOT floor on a level: openings, solid under-stair mass, lift, benches. */
export function obstaclesFor(level: LevelId): Rect[] {
  const slab = slabForLevel(level);
  const out: Rect[] = slab.openings.map((o) => inflate(o, OPENING_MARGIN));
  const lift = inflate(LIFT.outer(), OPENING_MARGIN);
  if (!out.some((o) => Math.abs(o.x0 - lift.x0) < 1e-6 && Math.abs(o.z0 - lift.z0) < 1e-6)) out.push(lift); // lower platform: shaft ends on the deck
  for (const st of STAIRS) {
    if (st.toLevel !== level) continue;
    for (const c of stairCells(st)) if (c.solidToFloor) out.push(inflate({ x0: st.xMin, x1: st.xMax, z0: c.zA, z1: c.zB }, SOLID_MARGIN));
  }
  if (isPlatform(level)) for (const z of BENCH_Z) out.push(inflate({ x0: BENCH_X - 0.3, x1: BENCH_X + 0.3, z0: z - 1.1, z1: z + 1.1 }, 0.1));
  return out;
}

function baseRect(level: LevelId): Rect {
  return isPlatform(level) ? platformRect() : { x0: FINISH.x0, x1: FINISH.x1, z0: -WALK_Z, z1: WALK_Z };
}

/** Step-through strip in front of the lift doors (between the shaft keep-out and the lobby floor). */
const DOOR_THRESHOLD: Rect = { x0: LIFT.cx - 0.45, x1: LIFT.cx + 0.45, z0: LIFT.cz + 1.1, z1: LIFT.cz + 1.45 };

export const FLOOR_ZONES: FloorZone[] = LEVEL_IDS.flatMap((level) => {
  const zones = subtractRects(baseRect(level), obstaclesFor(level)).map((rect, i) => ({ id: `${level}#${i}`, level, y: LEVEL_Y[level], rect }));
  zones.push({ id: `${level}#lift-door`, level, y: LEVEL_Y[level], rect: DOOR_THRESHOLD });
  return zones;
});

/** The ramp reaches 0.2 m past each stair end so it meets the floor zone across the keep-out margins. */
const RAMP_OVERLAP = Math.max(OPENING_MARGIN, SOLID_MARGIN);
export const STAIR_RAMPS: StairRamp[] = STAIRS.map((st) => ({
  id: st.id, stair: st,
  rect: { x0: st.xMin, x1: st.xMax, z0: Math.min(st.zTop, st.zBottom) - RAMP_OVERLAP, z1: Math.max(st.zTop, st.zBottom) + RAMP_OVERLAP },
  yAt: (z: number) => {
    const t = Math.max(0, Math.min(1, (z - st.zTop) / (st.zBottom - st.zTop)));
    return st.yTop - t * (st.yTop - st.yBottom);
  },
}));

const EPS = 1e-6;
const inRect = (r: Rect, x: number, z: number) => x >= r.x0 - EPS && x <= r.x1 + EPS && z >= r.z0 - EPS && z <= r.z1 + EPS;

/** True when (x, z) is on finished floor of this level (stairs are separate: see `surfaceAt`). */
export function isWalkable(level: LevelId, x: number, z: number): boolean {
  return FLOOR_ZONES.some((zn) => zn.level === level && inRect(zn.rect, x, z));
}

/** The surface a person with feet at height y would stand on at (x, z), or null when nothing is there. */
export function surfaceAt(x: number, z: number, y: number): Surface | null {
  let best: Surface | null = null;
  let bestD = SURFACE_TOLERANCE + EPS;
  for (const r of STAIR_RAMPS) {
    if (!inRect(r.rect, x, z)) continue;
    const sy = r.yAt(z);
    const d = Math.abs(sy - y);
    if (d < bestD) { bestD = d; best = { kind: 'stair', y: sy, stairId: r.id }; }
  }
  for (const zn of FLOOR_ZONES) {
    if (!inRect(zn.rect, x, z)) continue;
    const d = Math.abs(zn.y - y);
    if (d < bestD) { bestD = d; best = { kind: 'floor', y: zn.y, level: zn.level, zoneId: zn.id }; }
  }
  return best;
}

/** The level whose floor is closest to world height y. */
export function levelAtY(y: number): LevelId {
  return LEVEL_IDS.reduce((a, b) => (Math.abs(LEVEL_Y[a] - y) <= Math.abs(LEVEL_Y[b] - y) ? a : b));
}

/** Closest point on this level's floor to (x, z); `inset` keeps the point that far inside the zone where possible. */
export function nearestWalkable(level: LevelId, x: number, z: number, inset = 0): { x: number; z: number; y: number; dist: number } {
  let best = { x, z, y: LEVEL_Y[level], dist: Infinity };
  for (const zn of FLOOR_ZONES) {
    if (zn.level !== level) continue;
    const r = zn.rect;
    const ix = Math.min(inset, (r.x1 - r.x0) / 2), iz = Math.min(inset, (r.z1 - r.z0) / 2);
    const cx = Math.max(r.x0 + ix, Math.min(r.x1 - ix, x));
    const cz = Math.max(r.z0 + iz, Math.min(r.z1 - iz, z));
    const d = Math.hypot(cx - x, cz - z);
    if (d < best.dist) best = { x: cx, z: cz, y: zn.y, dist: d };
  }
  return best;
}

/**
 * A valid standing point IN FRONT of a target (not on top of it): the best floor point roughly `distance`
 * metres away, preferring the north (-Z) side as walk mode always has. Returns the yaw that faces the target.
 */
export function standInFrontOf(level: LevelId, tx: number, tz: number, distance = 2.0): { x: number; z: number; y: number; yaw: number } {
  let best: { x: number; z: number; y: number; score: number } | null = null;
  for (let k = 0; k < 16; k++) {
    const ang = (k / 16) * Math.PI * 2; // 0 = north (-Z)
    const px = tx + Math.sin(ang) * distance, pz = tz - Math.cos(ang) * distance;
    const n = nearestWalkable(level, px, pz, 0.4);
    const d = Math.hypot(n.x - tx, n.z - tz);
    const score = Math.abs(d - distance) * 2 + n.dist + Math.min(ang, Math.PI * 2 - ang) * 0.05;
    if (d >= 1.0 && (!best || score < best.score)) best = { x: n.x, z: n.z, y: n.y, score };
  }
  const b = best ?? { ...nearestWalkable(level, tx, tz - distance, 0.4), score: 0 };
  // Walk mode yaw 0 looks toward -Z; forward = (-sin yaw, -cos yaw)
  const yaw = Math.atan2(-(tx - b.x), -(tz - b.z));
  return { x: b.x, z: b.z, y: b.y, yaw };
}

/**
 * Move from (fx, fz) toward (tx, tz) at height y, staying on walkable surface. Slides along an edge when only
 * one axis is blocked. If the start itself is not walkable the move is allowed only toward walkable ground.
 */
export function constrainMove(fx: number, fz: number, tx: number, tz: number, y: number): { x: number; z: number } {
  if (surfaceAt(tx, tz, y)) return { x: tx, z: tz };
  if (surfaceAt(tx, fz, y)) return { x: tx, z: fz };
  if (surfaceAt(fx, tz, y)) return { x: fx, z: tz };
  return { x: fx, z: fz };
}

export const slabIds = SLABS.map((s) => s.id);
