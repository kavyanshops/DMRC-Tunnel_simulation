import { BOUNDS, type VRLevelId } from './config';
import { constrainMove, isWalkable, nearestWalkable } from '../scene/walkable';
import { LEVEL_Y } from '../data/stationLayout';

export interface Vec3 { x: number; y: number; z: number }

/** Intersect a ray with the horizontal plane y = planeY. Null if parallel, behind, or too far. */
export function rayPlaneHit(origin: Vec3, dir: Vec3, planeY: number, maxDist = 30): Vec3 | null {
  if (Math.abs(dir.y) < 1e-4) return null;
  const t = (planeY - origin.y) / dir.y;
  if (!(t > 0) || t > maxDist) return null;
  return { x: origin.x + dir.x * t, y: planeY, z: origin.z + dir.z * t };
}

export function applyDeadzone(x: number, y: number, dz = 0.35): [number, number] {
  return Math.hypot(x, y) < dz ? [0, 0] : [x, y];
}

/**
 * Edge-triggered snap turn. Returns +1 / -1 (rotation sign about +Y) only when the stick
 * crosses the threshold; stick right turns the view right (negative rotation about +Y).
 */
export function snapTurnDirection(prevX: number, x: number, threshold = 0.7): 0 | 1 | -1 {
  if (Math.abs(prevX) < threshold && x >= threshold) return -1;
  if (Math.abs(prevX) < threshold && x <= -threshold) return 1;
  return 0;
}

/** Smooth move delta in world XZ. Stick up (y < 0) = forward along head yaw. */
export function smoothMoveDelta(stickX: number, stickY: number, headYaw: number, speed: number, dt: number): [number, number] {
  const fx = -Math.sin(headYaw), fz = -Math.cos(headYaw);
  const rx = Math.cos(headYaw), rz = -Math.sin(headYaw);
  const f = -stickY, r = stickX;
  return [(fx * f + rx * r) * speed * dt, (fz * f + rz * r) * speed * dt];
}

export function clampToBounds(p: Vec3): Vec3 {
  return {
    x: Math.min(BOUNDS.xMax, Math.max(BOUNDS.xMin, p.x)),
    y: p.y,
    z: Math.min(BOUNDS.zMax, Math.max(BOUNDS.zMin, p.z))
  };
}

/** Rig position so that the user's head ends up above `target` (cancels head offset in the rig). */
export function rigPositionForTarget(target: Vec3, headLocal: Vec3, floorY: number): Vec3 {
  return { x: target.x - headLocal.x, y: floorY, z: target.z - headLocal.z };
}

/**
 * Teleport validation: a destination is accepted only if it lies on real floor of this level
 * (not in a stair or lift void, not under a low stair, not past the platform ends).
 */
export function canTeleport(level: VRLevelId, p: { x: number; z: number }): boolean {
  return isWalkable(level, p.x, p.z);
}

/** Nearest valid standing point on this level (used by the level menu and hotspot jumps). */
export function snapToWalkable(level: VRLevelId, p: { x: number; z: number }): Vec3 {
  const n = nearestWalkable(level, p.x, p.z, 0.4);
  return { x: n.x, y: LEVEL_Y[level], z: n.z };
}

/** Smooth-move step that cannot leave the floor: slides along edges, stops at voids. */
export function moveOnFloor(level: VRLevelId, from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number } {
  return constrainMove(from.x, from.z, to.x, to.z, LEVEL_Y[level]);
}
