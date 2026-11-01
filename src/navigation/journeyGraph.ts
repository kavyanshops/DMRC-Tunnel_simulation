import { CLEARANCES, LEVEL_Y, LIFT, STAIRS, STAIR_X, type LevelId } from '../data/stationLayout';

export type JourneyNodeKind = 'landing' | 'level-change' | 'destination';

export interface JourneyNode {
  id: string;
  levelId: LevelId;
  x: number;
  z: number;
  y: number;
  kind: JourneyNodeKind;
}

export interface JourneyEdge {
  from: string;
  to: string;
  width: number;
  slope: number;
  headroom: number;
  length: number;
  kind: 'corridor' | 'stair' | 'lift';
}

export interface JourneyGraph {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
}

const stairCenterX = () => (STAIR_X.min + STAIR_X.max) / 2;
const level = (id: LevelId, x: number, z: number, kind: JourneyNodeKind): JourneyNode => ({
  id: `${id}-${kind}-${z}`,
  levelId: id,
  x,
  z,
  y: LEVEL_Y[id],
  kind,
});

const stairEdges = STAIRS.map((stair) => {
  const from = level(stair.fromLevel, stairCenterX(), stair.zTop, 'landing');
  const to = level(stair.toLevel, stairCenterX(), stair.zBottom, 'landing');
  return {
    nodes: [from, to],
    edge: {
      from: from.id,
      to: to.id,
      width: stair.xMax - stair.xMin,
      slope: stair.slopeDeg,
      headroom: CLEARANCES.stairHeadroom,
      length: Math.abs(stair.zBottom - stair.zTop),
      kind: 'stair' as const,
    },
  };
});

const routeNodes: JourneyNode[] = [
  level('concourse', 1.5, -90, 'destination'),
  level('concourse', 1.5, -20, 'destination'),
  level('concourse', stairCenterX(), -8, 'landing'),
  level('upper_platform', stairCenterX(), 8, 'landing'),
  level('upper_platform', stairCenterX(), 18, 'landing'),
  level('intermediate', 1.5, 36, 'landing'),
  level('intermediate', 1.5, -18, 'landing'),
  level('lower_platform', stairCenterX(), -34, 'landing'),
  level('lower_platform', 1.5, -70, 'destination'),
  level('concourse', LIFT.cx, LIFT.cz, 'level-change'),
  level('upper_platform', LIFT.cx, LIFT.cz, 'level-change'),
  level('intermediate', LIFT.cx, LIFT.cz, 'level-change'),
  level('lower_platform', LIFT.cx, LIFT.cz, 'level-change'),
];

const corridor = (from: JourneyNode, to: JourneyNode): JourneyEdge => ({
  from: from.id,
  to: to.id,
  width: CLEARANCES.minWalkWidth,
  slope: 0,
  headroom: CLEARANCES.stairHeadroom,
  length: Math.hypot(to.x - from.x, to.z - from.z),
  kind: 'corridor',
});

const by = (id: string) => routeNodes.find((node) => node.id === id)!;
const routeEdges: JourneyEdge[] = [
  corridor(by('concourse-destination--90'), by('concourse-destination--20')),
  corridor(by('concourse-destination--20'), by('concourse-landing--8')),
  corridor(by('upper_platform-landing-8'), by('upper_platform-landing-18')),
  corridor(by('intermediate-landing-36'), by('intermediate-landing--18')),
  corridor(by('lower_platform-landing--34'), by('lower_platform-destination--70')),
  ...stairEdges.map(({ edge }) => edge),
];

for (let i = 0; i < 3; i++) {
  const lower = by(['concourse', 'upper_platform', 'intermediate', 'lower_platform'][i] + '-level-change-12');
  const upper = by(['concourse', 'upper_platform', 'intermediate', 'lower_platform'][i + 1] + '-level-change-12');
  routeEdges.push({
    from: lower.id,
    to: upper.id,
    width: LIFT.w,
    slope: 0,
    headroom: CLEARANCES.stairHeadroom,
    length: Math.abs(upper.y - lower.y),
    kind: 'lift',
  });
}

export const JOURNEY_GRAPH: JourneyGraph = { nodes: routeNodes, edges: routeEdges };

export const JOURNEY_ROUTE = [
  by('concourse-destination--90'),
  by('concourse-destination--20'),
  by('concourse-landing--8'),
  by('upper_platform-landing-8'),
  by('upper_platform-landing-18'),
  by('intermediate-landing-36'),
  by('intermediate-landing--18'),
  by('lower_platform-landing--34'),
  by('lower_platform-destination--70'),
];

export function journeyGuidePoints() {
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < JOURNEY_ROUTE.length - 1; i++) {
    const from = JOURNEY_ROUTE[i];
    const to = JOURNEY_ROUTE[i + 1];
    const steps = Math.max(1, Math.ceil(Math.abs(to.z - from.z) / 2));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      points.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      });
    }
  }
  const last = JOURNEY_ROUTE[JOURNEY_ROUTE.length - 1];
  points.push({ x: last.x, y: last.y, z: last.z });
  return points;
}

export function findJourneyPath(from: string, to: string): JourneyNode[] | null {
  const queue = [from];
  const previous = new Map<string, string | null>([[from, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === to) break;
    for (const edge of JOURNEY_GRAPH.edges) {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (next && !previous.has(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  if (!previous.has(to)) return null;
  const path: JourneyNode[] = [];
  for (let id: string | null = to; id; id = previous.get(id) ?? null) path.unshift(JOURNEY_GRAPH.nodes.find((node) => node.id === id)!);
  return path;
}
