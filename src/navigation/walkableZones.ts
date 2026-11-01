import { slabForLevel, subtractRects, type LevelId, type Rect } from '../data/stationLayout';

export const WALKABLE_MARGIN = 0.35;

export function walkableRects(levelId: LevelId): Rect[] {
  const slab = slabForLevel(levelId);
  return subtractRects(slab.rect, slab.openings);
}

export function nearestWalkablePoint(levelId: LevelId, x: number, z: number): { x: number; z: number } {
  const rects = walkableRects(levelId);
  let best = { x: rects[0].x0, z: rects[0].z0 };
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const rect of rects) {
    const minX = rect.x0 + WALKABLE_MARGIN;
    const maxX = rect.x1 - WALKABLE_MARGIN;
    const minZ = rect.z0 + WALKABLE_MARGIN;
    const maxZ = rect.z1 - WALKABLE_MARGIN;
    if (minX > maxX || minZ > maxZ) continue;

    const candidate = {
      x: Math.max(minX, Math.min(maxX, x)),
      z: Math.max(minZ, Math.min(maxZ, z)),
    };
    const distance = (candidate.x - x) ** 2 + (candidate.z - z) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  if (!Number.isFinite(bestDistance)) {
    throw new Error(`No walkable area available for level ${levelId}`);
  }
  return best;
}

export function isWalkablePoint(levelId: LevelId, x: number, z: number): boolean {
  return walkableRects(levelId).some((rect) =>
    x >= rect.x0 + WALKABLE_MARGIN &&
    x <= rect.x1 - WALKABLE_MARGIN &&
    z >= rect.z0 + WALKABLE_MARGIN &&
    z <= rect.z1 - WALKABLE_MARGIN
  );
}
