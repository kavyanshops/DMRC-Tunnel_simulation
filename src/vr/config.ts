import { STATION_SPEC } from '../data/stationSpec';

export type VRLevelId = 'concourse' | 'upper_platform' | 'intermediate' | 'lower_platform';

export const VR_LEVEL_IDS: VRLevelId[] = ['concourse', 'upper_platform', 'intermediate', 'lower_platform'];

/** Floor height (world Y) of each walkable level, taken from the station spec. */
export function levelFloorY(id: VRLevelId): number {
  const lvl = STATION_SPEC.levels.find((l) => l.id === id);
  if (!lvl) throw new Error(`Unknown level ${id}`);
  return -lvl.depthBelowGround;
}

export function levelName(id: VRLevelId): string {
  return STATION_SPEC.levels.find((l) => l.id === id)?.name ?? id;
}

/** Teleport bounds: inside the 13.4 m box (with wall margin) and along the ~200 m length. */
export const BOUNDS = { xMin: -5.9, xMax: 5.9, zMin: -95, zMax: 95 };

export const SNAP_TURN_DEG = 30;
export const MAX_TELEPORT_DIST = 30;
export const SMOOTH_SPEED = 2.0; // m/s, optional
