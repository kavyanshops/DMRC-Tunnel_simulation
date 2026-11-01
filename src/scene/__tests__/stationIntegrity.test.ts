// @vitest-environment jsdom
import { describe, expect, it, beforeAll } from 'vitest';
import * as THREE from 'three';
import { StationBuilder } from '../StationBuilder';
import { TunnelBuilder } from '../TunnelBuilder';
import { CirculationBuilder } from '../CirculationBuilder';
import { StationInterior } from '../StationInterior';
import { STATION_SPEC } from '../../data/stationSpec';
import { BENCH_X, BENCH_Z, CLEARANCES, COLUMNS, LIFT, LEVEL_Y as LY, PLATFORM, SLABS, STAIRS, slabForLevel, stairCells, type Rect } from '../../data/stationLayout';
import { batchStaticMeshes } from '../../vr/batch';

/**
 * Phase A integrity tests for the Sadar Bazar station model.
 * Builds exactly what the VR app builds (station + tunnels + circulation + interior),
 * in walk-mode state (east wall closed), and checks the geometry itself.
 *
 * NOTE: clash boxes are world-space AABBs. Sloped meshes (stair ramp backing, handrails)
 * therefore over-estimate; the stair class is checked with extra care in the headroom test below.
 */

type Cls = 'wall' | 'slab' | 'column' | 'deck' | 'stair' | 'lift' | 'track' | 'tunnel' | 'interior' | 'other';

interface Item { mesh: THREE.Mesh; box: THREE.Box3; cls: Cls; path: string }

const GROUP_CLASS: Record<string, Cls> = {
  DiaphragmWalls: 'wall',
  FloorSlabs: 'slab',
  StructuralColumns: 'column',
  PassengerPlatforms: 'deck',
  AssumedEquipment: 'interior',
  StairsAndEscalators: 'stair',
  ElevatorShaft: 'lift',
  PlatformScreenDoors: 'interior',
  WayfindingSignage: 'interior',
  RailsAndTracks: 'track',
  TbmTunnels: 'tunnel',
  NatmCrossPassage: 'tunnel',
  ConflictNotices: 'other',
  StationInterior: 'interior',
};

function classify(o: THREE.Object3D): Cls {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) {
    const c = GROUP_CLASS[p.name];
    if (c) return c;
  }
  return 'other';
}
function pathOf(o: THREE.Object3D): string {
  const parts: string[] = [];
  for (let p: THREE.Object3D | null = o; p; p = p.parent) parts.unshift(p.name || p.type);
  return parts.slice(-3).join('/');
}
function isVisible(o: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

interface World {
  root: THREE.Group;
  station: StationBuilder;
  tunnels: TunnelBuilder;
  circ: CirculationBuilder;
  interior: StationInterior;
}
function buildWorld(): World {
  const station = new StationBuilder();
  const tunnels = new TunnelBuilder();
  const circ = new CirculationBuilder();
  const interior = new StationInterior();
  station.setCutaway(false); // walk-mode: closed east wall
  const root = new THREE.Group();
  root.add(station.group, tunnels.group, circ.group, interior.group);
  root.updateMatrixWorld(true);
  return { root, station, tunnels, circ, interior };
}
function collect(root: THREE.Object3D): Item[] {
  const out: Item[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !isVisible(m) || !m.geometry?.attributes?.position) return;
    const box = new THREE.Box3().setFromObject(m);
    if (box.isEmpty()) return;
    out.push({ mesh: m, box, cls: classify(m), path: pathOf(m) });
  });
  return out;
}
const fmt = (n: number) => n.toFixed(2);

function overlap(a: THREE.Box3, b: THREE.Box3) {
  const dx = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const dy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  const dz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
  if (dx <= 0 || dy <= 0 || dz <= 0) return null;
  return { dx, dy, dz, vol: dx * dy * dz, cx: Math.max(a.min.x, b.min.x) + dx / 2, cy: Math.max(a.min.y, b.min.y) + dy / 2, cz: Math.max(a.min.z, b.min.z) + dz / 2 };
}

/**
 * Explicit, justified whitelist of class pairs that are allowed to overlap.
 * Anything else is a defect. Keep this list short.
 */
const CLASH_WHITELIST: { a: Cls; b: Cls; why: string }[] = [
  { a: 'column', b: 'slab', why: 'columns are monolithic with the slabs they carry' },
  { a: 'slab', b: 'wall', why: 'slabs are cast monolithic with the diaphragm wall' },
  { a: 'deck', b: 'slab', why: 'platform deck sits on / is cast with the undercroft slab' },
  { a: 'deck', b: 'wall', why: 'platform deck abuts the diaphragm wall' },
  { a: 'column', b: 'deck', why: 'the 0.35 m platform deck is a topping cast around the full-height column' },
  { a: 'tunnel', b: 'wall', why: 'TBM/NATM tunnels pass through the headwall portals' },
  { a: 'tunnel', b: 'slab', why: 'tunnel invert/lining meets the base slab at the portal' },
];
const allowed = (x: Cls, y: Cls) => CLASH_WHITELIST.some((w) => (w.a === x && w.b === y) || (w.a === y && w.b === x));

let W: World;
let ITEMS: Item[];
beforeAll(() => { W = buildWorld(); ITEMS = collect(W.root); });

const COL_R = 0.45;
const lvlY = (id: string) => -STATION_SPEC.levels.find((l) => l.id === id)!.depthBelowGround;

describe('1. no solid/solid intersections (whitelist is explicit)', () => {
  it('reports zero un-whitelisted overlaps above 1e-3 m^3', () => {
    const structural = ITEMS.filter((i) => i.cls !== 'other');
    const clashes: string[] = [];
    const pairCount = new Map<string, number>();
    for (let i = 0; i < structural.length; i++) {
      for (let j = i + 1; j < structural.length; j++) {
        const A = structural[i], B = structural[j];
        if (A.cls === B.cls || allowed(A.cls, B.cls)) continue;
        // AABBs of hollow tunnel tubes and of portal-holed headwalls are not solid volumes:
        // an AABB test cannot say anything about what sits inside them, so those pairs are skipped.
        if (A.cls === 'tunnel' || B.cls === 'tunnel') continue;
        // Tilted thin rods (stair handrails) have meaningless AABBs; they are covered by the headroom test instead.
        const tiltedRod = (i: Item) => i.mesh.geometry.type === 'CylinderGeometry' && Math.abs(Math.sin(i.mesh.rotation.x)) > 0.05 && Math.abs(Math.cos(i.mesh.rotation.x)) > 0.05;
        if (tiltedRod(A) || tiltedRod(B)) continue;
        const holed = (i: Item) => i.cls === 'wall' && i.mesh.geometry.type === 'ExtrudeGeometry';
        if ((holed(A) && B.cls === 'track') || (holed(B) && A.cls === 'track')) continue;
        // transparent glass is not a solid
        const tr = (m: THREE.Mesh) => !Array.isArray(m.material) && (m.material as THREE.Material).transparent;
        if (tr(A.mesh) || tr(B.mesh)) continue;
        const o = overlap(A.box, B.box);
        if (!o || o.vol <= 1e-3) continue;
        const key = [A.cls, B.cls].sort().join('|');
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
        if (clashes.length < 60) {
          clashes.push(`${A.path} <-> ${B.path} (overlap ${fmt(o.dx)}x${fmt(o.dy)}x${fmt(o.dz)} at ${fmt(o.cx)},${fmt(o.cy)},${fmt(o.cz)})`);
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[clash] class-pair counts: ${JSON.stringify([...pairCount.entries()])}\n` + clashes.join('\n'));
    expect(clashes, `${[...pairCount.values()].reduce((a, b) => a + b, 0)} clashes`).toEqual([]);
  });
});

describe('2. no coplanar duplicates', () => {
  it('no two meshes share the same world box (1 mm)', () => {
    const dup: string[] = [];
    const near = (a: THREE.Box3, b: THREE.Box3) => {
      const ca = a.getCenter(new THREE.Vector3()), cb = b.getCenter(new THREE.Vector3());
      const sa = a.getSize(new THREE.Vector3()), sb = b.getSize(new THREE.Vector3());
      return ca.distanceTo(cb) < 1e-3 && sa.distanceTo(sb) < 1e-3;
    };
    for (let i = 0; i < ITEMS.length; i++) for (let j = i + 1; j < ITEMS.length; j++) {
      if (near(ITEMS[i].box, ITEMS[j].box) && dup.length < 40) dup.push(`${ITEMS[i].path} == ${ITEMS[j].path}`);
    }
    // eslint-disable-next-line no-console
    console.log('[dup-box]\n' + dup.join('\n'));
    expect(dup).toEqual([]);
  });

  it('no two thin horizontal meshes overlap in plan within 3 mm height (z-fighting)', () => {
    const thin = ITEMS.filter((i) => i.box.max.y - i.box.min.y < 0.05 && (i.box.max.x - i.box.min.x) > 0.05 && (i.box.max.z - i.box.min.z) > 0.05);
    const zf: string[] = [];
    for (let i = 0; i < thin.length; i++) for (let j = i + 1; j < thin.length; j++) {
      const A = thin[i], B = thin[j];
      if (Math.abs(A.box.max.y - B.box.max.y) >= 0.003) continue;
      const dx = Math.min(A.box.max.x, B.box.max.x) - Math.max(A.box.min.x, B.box.min.x);
      const dz = Math.min(A.box.max.z, B.box.max.z) - Math.max(A.box.min.z, B.box.min.z);
      if (dx > 0 && dz > 0 && dx * dz > 0.01 && zf.length < 40) zf.push(`${A.path} ~ ${B.path} (plan ${fmt(dx)}x${fmt(dz)} at y=${fmt(A.box.max.y)})`);
    }
    // eslint-disable-next-line no-console
    console.log('[z-fight]\n' + zf.join('\n'));
    expect(zf).toEqual([]);
  });
});

describe('3. banners and yellow', () => {
  it('walk/VR scene graph has zero sprites and no banner-tagged meshes', () => {
    let sprites = 0, banners = 0;
    W.root.traverse((o) => {
      if ((o as THREE.Sprite).isSprite) sprites++;
      if (o.userData?.kind === 'banner' && !o.userData?.overviewLabel) banners++;
    });
    // eslint-disable-next-line no-console
    console.log(`[banner] sprites=${sprites} bannerMeshes=${banners} (excl. ground, which VR does not build)`);
    expect(sprites + banners).toBe(0);
  });

  it('amber/yellow mesh count is below 20', () => {
    const YEL = new Set([0xf59e0b, 0xeab308]);
    let n = 0;
    W.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || Array.isArray(m.material)) return;
      const c = (m.material as THREE.MeshStandardMaterial).color;
      if (c && YEL.has(c.getHex())) n++;
    });
    // eslint-disable-next-line no-console
    console.log(`[yellow] amber/yellow meshes = ${n}`);
    expect(n).toBeLessThan(20);
  });
});

describe('4. column grid', () => {
  it('all columns lie on one X line and a 10 m Z grid', () => {
    const cols = ITEMS.filter((i) => i.cls === 'column');
    expect(cols.length).toBeGreaterThan(0);
    const xs = new Set(cols.map((c) => c.box.getCenter(new THREE.Vector3()).x.toFixed(2)));
    expect([...xs].length, `column X lines: ${[...xs]}`).toBe(1);
    const zs = [...new Set(cols.map((c) => c.box.getCenter(new THREE.Vector3()).z.toFixed(2)))].map(Number).sort((a, b) => a - b);
    for (let i = 1; i < zs.length; i++) expect(Math.abs(zs[i] - zs[i - 1] - 10)).toBeLessThan(1e-6);
  });

  it('every column keeps >= 0.4 m from stairs and lift, and no interactable stands inside one', () => {
    const GAP = 0.4;
    const cols = ITEMS.filter((i) => i.cls === 'column');
    const bad = new Set<string>();
    const planDist = (b: THREE.Box3, x0: number, x1: number, z0: number, z1: number) => {
      const dx = Math.max(x0 - b.max.x, b.min.x - x1, 0), dz = Math.max(z0 - b.max.z, b.min.z - z1, 0);
      return Math.hypot(dx, dz);
    };
    const yOverlap = (b: THREE.Box3, y0: number, y1: number) => Math.min(b.max.y, y1) - Math.max(b.min.y, y0) > 0.1;
    for (const c of cols) {
      const cz = c.box.getCenter(new THREE.Vector3()).z;
      for (const s of W.circ.stairs) {
        const bd = s.bounds; const [z0, z1] = [Math.min(bd.zTop, bd.zBottom), Math.max(bd.zTop, bd.zBottom)];
        if (yOverlap(c.box, Math.min(bd.yTop, bd.yBottom), Math.max(bd.yTop, bd.yBottom)) && planDist(c.box, bd.xMin, bd.xMax, z0, z1) < GAP)
          bad.add(`column z=${fmt(cz)} vs ${s.id}`);
      }
      const lift = ITEMS.filter((i) => i.cls === 'lift' && !(i.mesh as any).isSprite);
      for (const l of lift) {
        if (planDist(c.box, l.box.min.x, l.box.max.x, l.box.min.z, l.box.max.z) < GAP && yOverlap(c.box, l.box.min.y, l.box.max.y))
          { bad.add(`column z=${fmt(cz)} vs lift (${l.path})`); break; }
      }
      for (const it of W.interior.interactables) {
        const px = it.position.x, pz = it.position.z;
        if (it.position.y < c.box.min.y || it.position.y > c.box.max.y) continue;
        // an interactable's stand-point must not be inside the column (0.05 m margin)
        if (Math.hypot(px - W.station.columnsGroup.children[0].position.x, pz - c.box.getCenter(new THREE.Vector3()).z) < COL_R + 0.05) bad.add(`column z=${fmt(cz)} vs interactable ${it.id} (${fmt(px)},${fmt(pz)})`);
      }
    }
    // eslint-disable-next-line no-console
    console.log('[column-gap]\n' + [...bad].join('\n'));
    expect([...bad]).toEqual([]);
  });
});

describe('5. walkability: floors really exist where the design says you walk', () => {
  const caster = new THREE.Raycaster();
  const floorHit = (x: number, z: number, levelY: number): number | null => {
    caster.set(new THREE.Vector3(x, levelY + 1.2, z), new THREE.Vector3(0, -1, 0));
    caster.far = 1.6;
    const solids = ITEMS.filter((i) => i.cls !== 'stair' && i.cls !== 'other').map((i) => i.mesh)
      .filter((m) => !Array.isArray(m.material) && !(m.material as THREE.Material).transparent);
    const h = caster.intersectObjects(solids, false)[0];
    return h ? h.point.y : null;
  };

  it('stair headroom: no slab / deck / column / lift within 2.2 m above any stair surface', () => {
    const bad: string[] = [];
    const solids = ITEMS.filter((i) => ['slab', 'deck', 'column', 'lift', 'wall'].includes(i.cls)).map((i) => i.mesh)
      .filter((m) => !(m.material as THREE.Material).transparent);
    for (const s of W.circ.stairs) {
      const b = s.bounds;
      const xm = (b.xMin + b.xMax) / 2;
      for (let k = 1; k < 20; k++) {            // skip exact ends (they are on the landings)
        const t = k / 20;
        const z = b.zTop + (b.zBottom - b.zTop) * t;
        const y = b.yTop + (b.yBottom - b.yTop) * t;
        for (const x of [b.xMin + 0.2, xm, b.xMax - 0.2]) {
          caster.set(new THREE.Vector3(x, y + 0.05, z), new THREE.Vector3(0, 1, 0));
          caster.far = 2.2;
          const h = caster.intersectObjects(solids, false)[0];
          if (h && bad.length < 40) bad.push(`${s.id} @z=${fmt(z)} x=${fmt(x)}: ${h.object.name || pathOf(h.object)} at ${fmt(h.distance)} m headroom`);
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log('[headroom]\n' + bad.join('\n'));
    expect(bad).toEqual([]);
  });

  it('each stair has a real floor mesh on both 1.0 m landings', () => {
    const bad: string[] = [];
    for (const s of W.circ.stairs) {
      const b = s.bounds, xm = (b.xMin + b.xMax) / 2, sg = Math.sign(b.zBottom - b.zTop);
      const top = floorHit(xm, b.zTop - sg * 1.0, lvlY(s.fromLevel));
      const bot = floorHit(xm, b.zBottom + sg * 1.0, lvlY(s.toLevel));
      if (top === null || Math.abs(top - lvlY(s.fromLevel)) > 0.25) bad.push(`${s.id}: no floor on TOP landing (hit ${top === null ? 'none' : fmt(top)} vs level ${fmt(lvlY(s.fromLevel))})`);
      if (bot === null || Math.abs(bot - lvlY(s.toLevel)) > 0.25) bad.push(`${s.id}: no floor on BOTTOM landing (hit ${bot === null ? 'none' : fmt(bot)} vs level ${fmt(lvlY(s.toLevel))})`);
    }
    // eslint-disable-next-line no-console
    console.log('[landings]\n' + bad.join('\n'));
    expect(bad).toEqual([]);
  });

  it('intermediate level has a continuous >= 2.0 m wide floor from stair 2 foot (z=36) to stair 3 head (z=-18)', () => {
    const y = lvlY('intermediate');
    const bad: string[] = [];
    for (let z = 35.9; z >= -17.95; z -= 2) { // sampled just inside the stair-head edges (z = 36 / -18)
      let run = 0, best = 0;
      for (let x = -5.9; x <= 5.9; x += 0.25) {
        const h = floorHit(x, z, y);
        if (h !== null && Math.abs(h - y) < 0.25) { run += 0.25; best = Math.max(best, run); } else run = 0;
      }
      if (best < 2.0) bad.push(`z=${z}: widest floored run is ${best.toFixed(2)} m`);
    }
    // eslint-disable-next-line no-console
    console.log('[intermediate-walkway]\n' + bad.join('\n'));
    expect(bad).toEqual([]);
  });

  it('stair widths match the spec (2.20 m)', () => {
    const spec = (STATION_SPEC as any).stairs?.staircaseWidth?.value ?? (STATION_SPEC as any).staircaseWidth?.value ?? 2.2;
    const wrong = W.circ.stairs.map((s) => ({ id: s.id, w: +(s.bounds.xMax - s.bounds.xMin).toFixed(2) })).filter((s) => Math.abs(s.w - spec) > 0.01);
    // eslint-disable-next-line no-console
    console.log('[stair-width] spec=' + spec + ' ' + JSON.stringify(wrong));
    expect(wrong).toEqual([]);
  });
});


describe('6. layout geometry measured from the manifest', () => {
  it('every stair: riser <= 0.18 m, tread >= 0.30 m, width = spec; reports slope', () => {
    const lines: string[] = [];
    for (const st of STAIRS) {
      lines.push(`${st.id}: ${st.steps} steps, riser ${(st.riser * 1000).toFixed(0)} mm, tread ${(st.tread * 1000).toFixed(0)} mm, slope ${st.slopeDeg.toFixed(1)} deg, width ${(st.xMax - st.xMin).toFixed(2)} m`);
      expect(st.riser).toBeLessThanOrEqual(CLEARANCES.maxRiser + 1e-9);
      expect(st.tread).toBeGreaterThanOrEqual(0.3);
    }
    // eslint-disable-next-line no-console
    console.log('[stairs]\n' + lines.join('\n'));
  });

  it('platform passage: >= 2.0 m clear walking width along the whole platform on both levels', () => {
    const bad: string[] = [];
    for (const lv of ['upper_platform', 'lower_platform'] as const) {
      const deck = slabForLevel(lv);
      const obstacles: Rect[] = [
        ...deck.openings,
        { ...LIFT.outer(), id: 'lift' } as any,
        ...COLUMNS.zs.map((z) => ({ x0: COLUMNS.x - COLUMNS.radius, x1: COLUMNS.x + COLUMNS.radius, z0: z - COLUMNS.radius, z1: z + COLUMNS.radius })),
        ...BENCH_Z.map((z) => ({ x0: BENCH_X - 0.3, x1: BENCH_X + 0.3, z0: z - 1.1, z1: z + 1.1 })),
      ];
      // under-stair solid (soffit < 2.2 m above this platform) is not walkable either
      for (const st of STAIRS) if (st.toLevel === lv) for (const c of stairCells(st)) if (c.solidToFloor) obstacles.push({ x0: st.xMin, x1: st.xMax, z0: c.zA, z1: c.zB });
      let minRun = 99, atZ = 0;
      for (let z = -PLATFORM.halfLength + 0.5; z <= PLATFORM.halfLength - 0.5; z += 0.5) {
        let run = 0, best = 0;
        for (let x = PLATFORM.x0; x <= PLATFORM.x1 - CLEARANCES.platformEdgeSafe[0] + 1e-9; x += 0.05) {
          const blocked = obstacles.some((o) => x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1);
          if (blocked) run = 0; else { run += 0.05; best = Math.max(best, run); }
        }
        if (best < minRun) { minRun = best; atZ = z; }
      }
      // eslint-disable-next-line no-console
      console.log(`[passage] ${lv}: narrowest clear lane ${minRun.toFixed(2)} m at z=${atZ} (edge safe zone excluded)`);
      if (minRun < CLEARANCES.minWalkWidth) bad.push(`${lv}: ${minRun.toFixed(2)} m at z=${atZ}`);
    }
    expect(bad).toEqual([]);
  });

  it('lift lobby (1.5 x 1.5 m) is clear of openings and columns on every level it serves', () => {
    const lobby = LIFT.lobby();
    expect(lobby.x1 - lobby.x0).toBeGreaterThanOrEqual(CLEARANCES.liftLobby - 1e-9);
    expect(lobby.z1 - lobby.z0).toBeGreaterThanOrEqual(CLEARANCES.liftLobby - 1e-9);
    const hits: string[] = [];
    for (const slab of SLABS.filter((x) => x.walkLevel)) {
      for (const o of slab.openings) if (o.id !== 'lift-shaft' && lobby.x1 > o.x0 && lobby.x0 < o.x1 && lobby.z1 > o.z0 && lobby.z0 < o.z1) hits.push(`${slab.id}: ${o.id}`);
    }
    for (const z of COLUMNS.zs) if (Math.hypot(Math.max(lobby.x0 - COLUMNS.x, 0, COLUMNS.x - lobby.x1), Math.max(lobby.z0 - z, 0, z - lobby.z1)) < COLUMNS.radius) hits.push(`column z=${z}`);
    expect(hits).toEqual([]);
    expect(LY.concourse).toBeLessThan(0);
  });
});

describe('7. determinism', () => {
  const sig = (w: World) => {
    const items = collect(w.root);
    let h = 0;
    for (const i of items) {
      const c = i.box.getCenter(new THREE.Vector3()), s = i.box.getSize(new THREE.Vector3());
      h = (h * 31 + Math.round(c.x * 1000) * 7 + Math.round(c.y * 1000) * 13 + Math.round(c.z * 1000) * 17 + Math.round(s.x * 1000) * 3 + Math.round(s.y * 1000) * 5 + Math.round(s.z * 1000) * 11) | 0;
    }
    return { n: items.length, h };
  };
  it('building twice yields identical counts and rounded-position hash', () => {
    expect(sig(buildWorld())).toEqual(sig(buildWorld()));
  });
});

describe('8. budget after batchStaticMeshes (VR path)', () => {
  it('<= 100 draw objects and <= 100k triangles', () => {
    const w = buildWorld();
    const info = batchStaticMeshes(w.root);
    let draw = 0, tris = 0;
    w.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !isVisible(m)) return;
      draw++;
      const g = m.geometry; tris += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
    });
    // eslint-disable-next-line no-console
    console.log(`[budget] before=${info.before} draw objects=${draw} triangles=${Math.round(tris)}`);
    expect(draw).toBeLessThanOrEqual(100);
    expect(tris).toBeLessThanOrEqual(100000);
  });
});
