import { describe, expect, it } from 'vitest';
import { isWalkablePoint, nearestWalkablePoint, walkableRects } from '../walkableZones';

describe('manifest-derived walkable zones', () => {
  it('covers every walkable level with non-empty floor regions', () => {
    for (const level of ['concourse', 'upper_platform', 'intermediate', 'lower_platform'] as const) {
      expect(walkableRects(level).length).toBeGreaterThan(0);
    }
  });

  it('keeps spawn points clear of stair and lift openings', () => {
    const point = nearestWalkablePoint('concourse', -3, -8);
    expect(isWalkablePoint('concourse', point.x, point.z)).toBe(true);
  });

  it('projects out-of-bounds teleport targets onto a walkable region', () => {
    const point = nearestWalkablePoint('upper_platform', 20, 200);
    expect(isWalkablePoint('upper_platform', point.x, point.z)).toBe(true);
    expect(point.x).toBeLessThan(0.2);
    expect(point.z).toBeLessThan(70);
  });
});
