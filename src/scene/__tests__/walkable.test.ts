import { describe, expect, it } from 'vitest';
import rawComponents from '../../data/components.json';
import { LEVEL_Y, LIFT, STAIRS, STAIR_X, subtractRects, slabForLevel } from '../../data/stationLayout';
import { FLOOR_ZONES, STAIR_RAMPS, isWalkable, levelAtY, nearestWalkable, obstaclesFor, standInFrontOf, surfaceAt, LEVEL_IDS } from '../walkable';

const xs = (STAIR_X.min + STAIR_X.max) / 2;

describe('walkable zones (generated from the layout manifest)', () => {
  it('stair voids are not walkable on the level they cut through', () => {
    expect(isWalkable('concourse', xs, -5)).toBe(false);          // stair 1 void in the concourse slab
    expect(isWalkable('upper_platform', xs, 20)).toBe(false);     // stair 2 void in the upper deck
    expect(isWalkable('intermediate', xs, -21)).toBe(false);      // stair 3 void in the intermediate slab
    expect(isWalkable('concourse', LIFT.cx, LIFT.cz)).toBe(false); // lift shaft
    expect(isWalkable('lower_platform', LIFT.cx, LIFT.cz)).toBe(false);
  });

  it('under a low stair (headroom < 2.2 m) is not walkable, but high enough under the flight is', () => {
    expect(isWalkable('upper_platform', xs, 6)).toBe(false);      // under the foot of stair 1
    expect(isWalkable('intermediate', xs, 34)).toBe(false);       // under the foot of stair 2
    expect(isWalkable('lower_platform', xs, -32)).toBe(false);    // under the foot of stair 3
    expect(isWalkable('upper_platform', xs, -4)).toBe(true);      // 3+ m under stair 1: fine
  });

  it('past the platform ends and outside the finished walls is not walkable', () => {
    expect(isWalkable('upper_platform', -2, 72)).toBe(false);
    expect(isWalkable('lower_platform', -2, -72)).toBe(false);
    expect(isWalkable('upper_platform', 3.0, 0)).toBe(false);     // track bed
    expect(isWalkable('concourse', -6.4, 0)).toBe(false);         // behind the cladding
  });

  it('ordinary floor is walkable on all four levels', () => {
    expect(isWalkable('concourse', 0, -40)).toBe(true);
    expect(isWalkable('upper_platform', -4.8, 40)).toBe(true);
    expect(isWalkable('intermediate', 0, 10)).toBe(true);
    expect(isWalkable('lower_platform', -4.8, -50)).toBe(true);
  });

  it('every floor zone has real floor: it lies on its slab and outside every opening / solid', () => {
    for (const lv of LEVEL_IDS) {
      const slab = slabForLevel(lv);
      const solidPieces = subtractRects({ x0: -7, x1: 7, z0: -101, z1: 101 }, slab.openings); // slab material
      const obstacles = obstaclesFor(lv);
      for (const z of FLOOR_ZONES.filter((q) => q.level === lv)) {
        if (z.id.endsWith('lift-door')) continue;
        const cx = (z.rect.x0 + z.rect.x1) / 2, cz = (z.rect.z0 + z.rect.z1) / 2;
        expect(solidPieces.some((p) => cx >= p.x0 && cx <= p.x1 && cz >= p.z0 && cz <= p.z1), `${z.id} is over a slab opening`).toBe(true);
        expect(obstacles.some((o) => cx > o.x0 && cx < o.x1 && cz > o.z0 && cz < o.z1), `${z.id} centre is inside an obstacle`).toBe(false);
      }
    }
  });

  it('stair ramps meet the floor at both ends (no gap between ramp and zone)', () => {
    for (const r of STAIR_RAMPS) {
      const st = r.stair;
      const top = surfaceAt(xs, st.zTop + Math.sign(st.zBottom - st.zTop) * 0.01, st.yTop);
      const bottom = surfaceAt(xs, st.zBottom - Math.sign(st.zBottom - st.zTop) * 0.01, st.yBottom);
      expect(top?.y).toBeCloseTo(st.yTop, 1);
      expect(bottom?.y).toBeCloseTo(st.yBottom, 1);
      // a step past each end is floor of the right level
      const before = surfaceAt(xs, st.zTop - Math.sign(st.zBottom - st.zTop) * 0.5, st.yTop);
      const after = surfaceAt(xs, st.zBottom + Math.sign(st.zBottom - st.zTop) * 0.5, st.yBottom);
      expect(before?.kind, `${st.id} top landing`).toBe('floor');
      expect(after?.kind, `${st.id} bottom landing`).toBe('floor');
    }
  });

  it('a stair is only a stair when you are on it (standing beneath one gives floor, not the flight)', () => {
    const s1 = STAIRS[0];
    expect(surfaceAt(xs, 0, LEVEL_Y.upper_platform)?.kind).toBe('floor');
    expect(surfaceAt(xs, 0, (s1.yTop + s1.yBottom) / 2)?.kind).toBe('stair');
  });

  it('nearestWalkable returns a point that is actually walkable', () => {
    for (const [lv, x, z] of [['concourse', xs, -4], ['upper_platform', xs, 22], ['intermediate', xs, -20], ['lower_platform', 3, 80], ['upper_platform', LIFT.cx, LIFT.cz]] as const) {
      const n = nearestWalkable(lv, x, z, 0.3);
      expect(isWalkable(lv, n.x, n.z), `${lv} ${x},${z}`).toBe(true);
      expect(n.y).toBeCloseTo(LEVEL_Y[lv], 5);
    }
  });

  it('"Show in 3D Model" lands on real floor, in front of every library component (never on top of it)', () => {
    const bad: string[] = [];
    for (const c of rawComponents as any[]) {
      if (!c.coordinates) continue;
      const lv = levelAtY(c.coordinates.y);
      const p = standInFrontOf(lv, c.coordinates.x, c.coordinates.z, 2.0);
      const d = Math.hypot(p.x - c.coordinates.x, p.z - c.coordinates.z);
      if (!isWalkable(lv, p.x, p.z)) bad.push(`${c.id}: not walkable (${p.x.toFixed(2)},${p.z.toFixed(2)})`);
      if (d < 0.9) bad.push(`${c.id}: lands on the component (${d.toFixed(2)} m)`);
    }
    expect(bad).toEqual([]);
  });
});
