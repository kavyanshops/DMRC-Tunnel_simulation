import { describe, expect, it } from 'vitest';
import { applyDeadzone, clampToBounds, rayPlaneHit, rigPositionForTarget, smoothMoveDelta, snapTurnDirection } from '../locomotion';
import { hitTest, layoutLevelButtons } from '../panelModel';
import { loadHotspots, wrapText } from '../hotspots';
import { VR_LEVEL_IDS, levelFloorY, BOUNDS } from '../config';

describe('VR locomotion', () => {
  it('ray hits floor ahead and below', () => {
    const h = rayPlaneHit({ x: 0, y: 1, z: 0 }, { x: 0, y: -0.5, z: -0.5 }, 0)!;
    expect(h.z).toBeCloseTo(-1); expect(h.y).toBe(0);
  });
  it('rejects parallel, upward and too-far rays', () => {
    expect(rayPlaneHit({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 0)).toBeNull();
    expect(rayPlaneHit({ x: 0, y: 1, z: 0 }, { x: 0, y: 0.5, z: -1 }, 0)).toBeNull();
    expect(rayPlaneHit({ x: 0, y: 1, z: 0 }, { x: 0, y: -0.01, z: -1 }, 0)).toBeNull();
  });
  it('deadzone', () => {
    expect(applyDeadzone(0.1, 0.1)).toEqual([0, 0]);
    expect(applyDeadzone(0.9, 0)).toEqual([0.9, 0]);
  });
  it('snap turn is edge-triggered', () => {
    expect(snapTurnDirection(0, 0.9)).toBe(-1);
    expect(snapTurnDirection(0.9, 0.95)).toBe(0);
    expect(snapTurnDirection(0, -0.9)).toBe(1);
    expect(snapTurnDirection(0, 0.3)).toBe(0);
  });
  it('smooth move: stick up goes forward (-Z at yaw 0), right goes +X', () => {
    const [x, z] = smoothMoveDelta(0, -1, 0, 2, 1);
    expect(x).toBeCloseTo(0); expect(z).toBeCloseTo(-2);
    const [x2] = smoothMoveDelta(1, 0, 0, 2, 1);
    expect(x2).toBeCloseTo(2);
  });
  it('clamps into the station box and positions rig over target', () => {
    const c = clampToBounds({ x: 50, y: 0, z: -500 });
    expect(c.x).toBe(BOUNDS.xMax); expect(c.z).toBe(BOUNDS.zMin);
    expect(rigPositionForTarget({ x: 1, y: 0, z: 2 }, { x: 0.3, y: 1.6, z: -0.2 }, -10.16)).toEqual({ x: 0.7, y: -10.16, z: 2.2 });
  });
});

describe('VR panel', () => {
  it('hit-tests with canvas y flipped from uv v', () => {
    const b = layoutLevelButtons([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], 512, 100, 60, 10);
    expect(hitTest(b, 0.5, 1 - 130 / 640, 512, 640)?.id).toBe('a');
    expect(hitTest(b, 0.5, 1 - 200 / 640, 512, 640)?.id).toBe('b');
    expect(hitTest(b, 0.5, 0.99, 512, 640)).toBeNull();
  });
});

describe('VR data', () => {
  it('four walkable levels sit below ground, in descending order', () => {
    const ys = VR_LEVEL_IDS.map(levelFloorY);
    expect(ys.every((y) => y < 0)).toBe(true);
    expect([...ys].sort((a, b) => b - a)).toEqual(ys);
  });
  it('hotspots come from the existing library with a confidence label', () => {
    const h = loadHotspots();
    expect(h.length).toBe(18);
    expect(h.every((x) => ['Verified', 'Provisional', 'Assumed'].includes(x.confidence) || x.confidence)).toBe(true);
  });
  it('wraps text', () => {
    expect(wrapText('aaa bbb ccc', 7)).toEqual(['aaa bbb', 'ccc']);
  });
});

import { canTeleport, moveOnFloor, snapToWalkable } from '../locomotion';
import { LIFT, STAIR_X } from '../../data/stationLayout';

describe('VR teleport validation (zones, not a bounding box)', () => {
  const xs = (STAIR_X.min + STAIR_X.max) / 2;
  it('rejects a teleport into a stair void, a lift shaft, under a low stair, past a platform end and onto the track', () => {
    expect(canTeleport('concourse', { x: xs, z: -5 })).toBe(false);
    expect(canTeleport('concourse', { x: LIFT.cx, z: LIFT.cz })).toBe(false);
    expect(canTeleport('upper_platform', { x: xs, z: 6 })).toBe(false);
    expect(canTeleport('upper_platform', { x: -2, z: 80 })).toBe(false);
    expect(canTeleport('lower_platform', { x: 3, z: 0 })).toBe(false);
  });
  it('accepts teleport onto real floor, including each stair landing', () => {
    expect(canTeleport('concourse', { x: 0, z: -40 })).toBe(true);
    for (const [lv, z] of [['concourse', -9], ['upper_platform', 9], ['upper_platform', 17], ['intermediate', 37], ['intermediate', -17], ['lower_platform', -35]] as const) {
      expect(canTeleport(lv, { x: xs, z }), `${lv} landing z=${z}`).toBe(true);
    }
  });
  it('snaps menu/hotspot jumps onto the nearest valid floor', () => {
    const p = snapToWalkable('upper_platform', { x: xs, z: 6 });
    expect(canTeleport('upper_platform', p)).toBe(true);
  });
  it('smooth move slides along an edge and stops at a void', () => {
    const a = moveOnFloor('concourse', { x: -5, z: -4 }, { x: -2.7, z: -4 });
    expect(a.x).toBeLessThan(-3.8);
  });
});
