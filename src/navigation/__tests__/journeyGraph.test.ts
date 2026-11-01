import { describe, expect, it } from 'vitest';
import { CLEARANCES } from '../../data/stationLayout';
import { JOURNEY_GRAPH, JOURNEY_ROUTE, findJourneyPath, journeyGuidePoints } from '../journeyGraph';

describe('Phase D journey graph', () => {
  it('connects the concourse and lower platform in both directions', () => {
    const start = JOURNEY_ROUTE[0].id;
    const finish = JOURNEY_ROUTE[JOURNEY_ROUTE.length - 1].id;
    expect(findJourneyPath(start, finish)).not.toBeNull();
    expect(findJourneyPath(finish, start)).not.toBeNull();
  });

  it('keeps every journey edge wide and clear enough for the route', () => {
    expect(JOURNEY_GRAPH.edges.length).toBeGreaterThan(0);
    for (const edge of JOURNEY_GRAPH.edges) {
      expect(edge.width).toBeGreaterThanOrEqual(CLEARANCES.minWalkWidth);
      expect(edge.headroom).toBeGreaterThanOrEqual(CLEARANCES.stairHeadroom);
      expect(edge.length).toBeGreaterThan(0);
    }
  });

  it('generates a floor-following guide through all route levels', () => {
    const points = journeyGuidePoints();
    expect(points.length).toBeGreaterThan(JOURNEY_ROUTE.length);
    expect(new Set(points.map((point) => point.y)).size).toBeGreaterThan(2);
    expect(points[0]).toMatchObject({ x: 1.5, z: -90 });
    expect(points[points.length - 1]).toMatchObject({ x: 1.5, z: -70 });
  });
});
