// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FirstPersonControls } from '../FirstPersonControls';
import { CirculationBuilder } from '../../scene/CirculationBuilder';
import { STATION_SPEC, depthToWorldY, worldYToDepth, worldYToRL } from '../../data/stationSpec';

describe('Walk Mode - FirstPersonControls Physics & Collision', () => {
  let camera: THREE.PerspectiveCamera;
  let domElement: HTMLElement;
  let circulation: CirculationBuilder;
  let controls: FirstPersonControls;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 500);
    domElement = document.createElement('canvas');
    circulation = new CirculationBuilder();
    controls = new FirstPersonControls(camera, domElement, circulation);
    controls.enabled = true;
  });

  it('spawns initially on the Concourse Level at -10.16m elevation with 1.65m eye height', () => {
    const conc = STATION_SPEC.levels.find((l) => l.id === 'concourse')!;
    const expectedY = depthToWorldY(conc.depthBelowGround);

    expect(controls.feetPosition.y).toBeCloseTo(expectedY, 2);
    expect(controls.camera.position.y).toBeCloseTo(expectedY + 1.65, 2);
    expect(controls.activeLevelId).toBe('concourse');

    const telem = controls.getTelemetry();
    expect(telem.levelId).toBe('concourse');
    expect(telem.depth).toBeCloseTo(10.16, 1);
    expect(telem.rl).toBeCloseTo(209.84, 1);
  });

  it('clamps player coordinates to the diaphragm wall and length boundaries', () => {
    // Attempt to move past west diaphragm wall (x < -5.9)
    controls.feetPosition.set(-15, -10.16, 0);
    controls.update(0.016);
    expect(controls.feetPosition.x).toBeGreaterThanOrEqual(-5.9);

    // Attempt to move past east cutaway/wall (x > 5.9)
    controls.feetPosition.set(20, -10.16, 0);
    controls.update(0.016);
    expect(controls.feetPosition.x).toBeLessThanOrEqual(5.9);

    // Attempt to move past north headwall (z < -95)
    controls.feetPosition.set(0, -10.16, -120);
    controls.update(0.016);
    expect(controls.feetPosition.z).toBeGreaterThanOrEqual(-95.0);

    // Attempt to move past south headwall (z > 95)
    controls.feetPosition.set(0, -10.16, 150);
    controls.update(0.016);
    expect(controls.feetPosition.z).toBeLessThanOrEqual(95.0);
  });

  it('accurately computes continuous floor elevation when walking up/down Stair 1', () => {
    // Stair 1 connects Concourse (-10.16m at z=-8) to Upper Platform (-16.31m at z=8)
    const yTop = depthToWorldY(10.16);
    const yBottom = depthToWorldY(16.31);
    const xOnStairs = -1.5;

    // Top landing
    expect(controls.computeFloorHeightAt(xOnStairs, -8)).toBeCloseTo(yTop, 2);

    // Mid flight (z=0)
    const yMidExpected = (yTop + yBottom) / 2;
    expect(controls.computeFloorHeightAt(xOnStairs, 0)).toBeCloseTo(yMidExpected, 2);

    // Bottom landing (z=8)
    expect(controls.computeFloorHeightAt(xOnStairs, 8)).toBeCloseTo(yBottom, 2);
  });

  it('teleports reliably via fast-travel to all verified station levels', () => {
    const levelsToTest = [
      { id: 'upper_platform', expectedDepth: 16.31 },
      { id: 'intermediate', expectedDepth: 24.46 },
      { id: 'lower_platform', expectedDepth: 31.01 },
      { id: 'ground', expectedDepth: 0.0 },
      { id: 'concourse', expectedDepth: 10.16 },
    ];

    levelsToTest.forEach(({ id, expectedDepth }) => {
      controls.teleportToLevel(id);
      expect(controls.activeLevelId).toBe(id);
      expect(worldYToDepth(controls.feetPosition.y)).toBeCloseTo(expectedDepth, 1);
      expect(worldYToRL(controls.feetPosition.y)).toBeCloseTo(220.0 - expectedDepth, 1);
    });
  });

  it('detects when player is inside the elevator and coordinates elevator cabin motion', () => {
    // Step inside elevator cabin (shaft centered at x = -4.5, z = -2.0)
    controls.feetPosition.set(-4.5, depthToWorldY(10.16), -2.0);
    expect(controls.isPlayerInElevator()).toBe(true);

    // Call elevator to Lower Platform (Stop 3, -31.01m)
    controls.callElevatorToStop(3);
    expect(controls.elevatorMoving).toBe(true);

    // Advance time to close doors and start travel
    controls.update(0.5); // doors close
    controls.update(1.0); // cabin descends
    expect(controls.elevatorCurrentY).toBeLessThan(depthToWorldY(10.16));

    // Player position remains vertically locked to moving elevator floor
    expect(controls.feetPosition.y).toBe(controls.elevatorCurrentY);
  });

  it('calculates compass heading degrees and cardinal directions accurately', () => {
    // Facing South (yaw = 0)
    controls.yaw = 0;
    let telem = controls.getTelemetry();
    expect(telem.headingDegrees).toBe(0);
    expect(telem.cardinal).toBe('N');

    // Turn 90 degrees right (West in world)
    controls.yaw = -Math.PI / 2;
    telem = controls.getTelemetry();
    expect(telem.headingDegrees).toBe(90);
    expect(telem.cardinal).toBe('E');

    // Turn 180 degrees
    controls.yaw = -Math.PI;
    telem = controls.getTelemetry();
    expect(telem.headingDegrees).toBe(180);
    expect(telem.cardinal).toBe('S');
  });

  it('moves forward on KeyW and backward on KeyS (no inversion)', () => {
    controls.yaw = 0; // facing forward along -Z
    controls.feetPosition.set(0, depthToWorldY(10.16), 0);

    // Simulate pressing KeyW
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    controls.update(0.1);
    expect(controls.velocity.z).toBeLessThan(0); // moving forward into negative Z

    // Release KeyW and press KeyS
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
    controls.update(0.3);
    expect(controls.velocity.z).toBeGreaterThan(0); // moving backward into positive Z
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
  });

  it('prevents walking through structural columns and platform edge boundaries', () => {
    // Column at X = -0.5, Z = 50 (cylinder radius 0.45m + player radius 0.35m = 0.80m)
    controls.feetPosition.set(-0.5, depthToWorldY(10.16), 49.8);
    controls.update(0.016);
    const distToCol = Math.hypot(controls.feetPosition.x - (-0.5), controls.feetPosition.z - 50);
    expect(distToCol).toBeGreaterThanOrEqual(0.79);

    // On Upper Platform level, PSD prevents falling onto track bed (x <= 0.1)
    controls.teleportToLevel('upper_platform');
    controls.feetPosition.set(2.5, controls.feetPosition.y, 0); // attempt to walk into track bed
    controls.update(0.016);
    expect(controls.feetPosition.x).toBeLessThanOrEqual(0.1);
  });
});
