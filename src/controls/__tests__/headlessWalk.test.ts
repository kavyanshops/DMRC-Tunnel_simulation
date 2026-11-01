// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FirstPersonControls } from '../FirstPersonControls';
import { CirculationBuilder } from '../../scene/CirculationBuilder';
import { StationBuilder } from '../../scene/StationBuilder';
import { StationInterior } from '../../scene/StationInterior';
import { LEVEL_Y, LIFT, STAIR_X } from '../../data/stationLayout';
import { levelAtY, surfaceAt } from '../../scene/walkable';

/**
 * Scripted headless walk (no WebGL): keys + yaw drive the real FirstPersonControls update loop.
 * Every frame we assert the player is on a real walkable surface and the body never sits inside a solid.
 */
let controls: FirstPersonControls;
let solids: THREE.Box3[] = [];
const keys = () => (controls as any).keys as { forward: boolean };

beforeAll(() => {
  const circ = new CirculationBuilder();
  const station = new StationBuilder();
  const interior = new StationInterior();
  station.setCutaway(false);
  const root = new THREE.Group();
  root.add(station.group, circ.group, interior.group);
  root.updateMatrixWorld(true);
  const solidGroups = new Set(['DiaphragmWalls', 'FloorSlabs', 'StructuralColumns', 'PassengerPlatforms']);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    let solid = false;
    for (let p: THREE.Object3D | null = m; p; p = p.parent) if (solidGroups.has(p.name)) solid = true;
    if (m.name.includes(' step ')) solid = true;
    if (solid) solids.push(new THREE.Box3().setFromObject(m));
  });
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 500);
  controls = new FirstPersonControls(camera, document.createElement('canvas'), circ);
  controls.enabled = true;
});

const inLift = () => controls.isPlayerInElevator();

function frameChecks(label: string) {
  const f = controls.feetPosition;
  if (!inLift()) {
    expect(surfaceAt(f.x, f.z, f.y), `${label}: off every walkable surface at (${f.x.toFixed(2)}, ${f.y.toFixed(2)}, ${f.z.toFixed(2)})`).not.toBeNull();
  }
  for (const h of [0.3, 0.9, 1.6]) {
    const p = new THREE.Vector3(f.x, f.y + h, f.z);
    for (const b of solids) {
      expect(b.containsPoint(p), `${label}: body point +${h} m inside a solid at (${f.x.toFixed(2)}, ${f.y.toFixed(2)}, ${f.z.toFixed(2)})`).toBe(false);
    }
  }
}

function walkTo(tx: number, tz: number, label: string, maxFrames = 4000) {
  for (let i = 0; i < maxFrames; i++) {
    const f = controls.feetPosition;
    const dx = tx - f.x, dz = tz - f.z;
    if (Math.hypot(dx, dz) < 0.25) break;
    controls.yaw = Math.atan2(-dx, -dz);
    keys().forward = true;
    controls.update(1 / 30);
    frameChecks(label);
  }
  keys().forward = false;
  for (let i = 0; i < 20; i++) { controls.update(1 / 30); frameChecks(label); } // settle (smooth floor snapping)
  const f = controls.feetPosition;
  expect(Math.hypot(tx - f.x, tz - f.z), `${label}: did not reach (${tx}, ${tz}); stopped at (${f.x.toFixed(2)}, ${f.z.toFixed(2)})`).toBeLessThan(0.6);
}
const xs = (STAIR_X.min + STAIR_X.max) / 2;
const expectLevel = (id: keyof typeof LEVEL_Y) => {
  expect(controls.feetPosition.y).toBeCloseTo(LEVEL_Y[id], 1);
  expect(levelAtY(controls.feetPosition.y)).toBe(id);
};

describe('headless walk: concourse -> upper platform -> intermediate -> lower platform and back by stairs', () => {
  it('goes down', () => {
    controls.teleportToLevel('concourse');
    expectLevel('concourse');
    walkTo(xs, -10, 'concourse to stair 1 head');
    walkTo(xs, -7.5, 'onto stair 1');
    walkTo(xs, 9.0, 'down stair 1');
    expectLevel('upper_platform');
    walkTo(xs, 16.5, 'upper platform to stair 2 head');
    walkTo(xs, 36.6, 'down stair 2');
    expectLevel('intermediate');
    // detour round the solid under-stair mass and the column row
    walkTo(1.5, 38.5, 'intermediate: around stair 2 foot');
    walkTo(1.5, -16, 'intermediate walkway');
    walkTo(xs, -16, 'intermediate: to stair 3 head');
    walkTo(xs, -34.6, 'down stair 3');
    expectLevel('lower_platform');
  });

  it('comes back up by the same stairs', () => {
    walkTo(xs, -17.6, 'up stair 3');
    expectLevel('intermediate');
    walkTo(xs, -16, 'intermediate: off stair 3');
    walkTo(1.5, -16, 'intermediate walkway back');
    walkTo(1.5, 38.5, 'intermediate walkway back south');
    walkTo(xs, 38.5, 'intermediate: to stair 2 foot');
    walkTo(xs, 17.4, 'up stair 2');
    expectLevel('upper_platform');
    walkTo(xs, 9.0, 'upper platform to stair 1 foot');
    walkTo(xs, -8.6, 'up stair 1');
    expectLevel('concourse');
  });

  it('cannot walk into a stair void, under a low stair, or off the end of the platform', () => {
    // 1. concourse: walk east into the stair 1 void (x -3.8..-1.6, z -8..-1.1) from the west
    controls.teleportToLevel('concourse');
    controls.feetPosition.set(-5.0, LEVEL_Y.concourse, -4);
    for (let i = 0; i < 300; i++) { controls.yaw = -Math.PI / 2; keys().forward = true; controls.update(1 / 30); frameChecks('void edge'); }
    expect(controls.feetPosition.x).toBeLessThan(STAIR_X.min);
    expect(controls.feetPosition.y).toBeCloseTo(LEVEL_Y.concourse, 1); // did not fall / snap onto the flight

    // 2. upper platform: walk east into the solid mass under stair 1 (low headroom) at z = 6
    controls.teleportToLevel('upper_platform');
    controls.feetPosition.set(-5.0, LEVEL_Y.upper_platform, 6);
    for (let i = 0; i < 300; i++) { controls.yaw = -Math.PI / 2; keys().forward = true; controls.update(1 / 30); frameChecks('under stair'); }
    expect(controls.feetPosition.x).toBeLessThan(STAIR_X.min);

    // 3. upper platform: walk south off the 140 m platform end
    controls.feetPosition.set(xs, LEVEL_Y.upper_platform, 66);
    for (let i = 0; i < 400; i++) { controls.yaw = Math.PI; keys().forward = true; controls.update(1 / 30); frameChecks('platform end'); }
    keys().forward = false;
    expect(controls.feetPosition.z).toBeLessThanOrEqual(70.01);
  });
});

describe('headless lift ride between all four levels', () => {
  it('rides, opens doors and steps out onto real floor at each stop', () => {
    controls.teleportToLevel('concourse');
    controls.feetPosition.set(LIFT.cx, LEVEL_Y.concourse, LIFT.cz + 2.2);
    walkTo(LIFT.cx, LIFT.cz + 0.2, 'into lift');
    expect(controls.isPlayerInElevator()).toBe(true);
    const order: [number, keyof typeof LEVEL_Y][] = [[1, 'upper_platform'], [2, 'intermediate'], [3, 'lower_platform'], [0, 'concourse']];
    for (const [stop, id] of order) {
      controls.callElevatorToStop(stop);
      for (let i = 0; i < 1500 && (controls.elevatorMoving || !controls.elevatorDoorsOpen); i++) controls.update(1 / 30);
      expect(controls.feetPosition.y, `arrived at ${id}`).toBeCloseTo(LEVEL_Y[id], 1);
      walkTo(LIFT.cx, LIFT.cz + 2.2, `exit lift at ${id}`);
      expect(surfaceAt(controls.feetPosition.x, controls.feetPosition.z, controls.feetPosition.y)?.level).toBe(id);
      walkTo(LIFT.cx, LIFT.cz + 0.2, `re-enter lift at ${id}`);
    }
  });
});
