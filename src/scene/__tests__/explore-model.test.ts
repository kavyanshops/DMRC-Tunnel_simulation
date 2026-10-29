// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TunnelBuilder } from '../TunnelBuilder';
import { StationBuilder } from '../StationBuilder';
import { STATION_SPEC, TUNNEL_LAYOUT } from '../../data/stationSpec';

const half = STATION_SPEC.stationBox.length.value / 2;

describe('explore model structure', () => {
  it('has no bored-tunnel lining or rings inside the station box', () => {
    const t = new TunnelBuilder();
    t.tunnelsGroup.updateMatrixWorld(true);
    t.tunnelsGroup.children.forEach((o) => {
      const box = new THREE.Box3().setFromObject(o);
      // each piece lies entirely outside the box: z >= half or z <= -half
      expect(box.min.z >= half - 1e-6 || box.max.z <= -half + 1e-6).toBe(true);
    });
    expect(t.tunnelsGroup.children.length).toBeGreaterThan(0);
  });

  it('approach rails start where the in-station track ends (no doubled rails)', () => {
    const t = new TunnelBuilder();
    const meshes = t.tracksGroup.children as THREE.Mesh[];
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox();
      const z0 = m.position.z + m.geometry.boundingBox!.min.z, z1 = m.position.z + m.geometry.boundingBox!.max.z;
      expect(z0 >= 80 - 0.2 || z1 <= -80 + 0.2).toBe(true);
      expect(Math.abs(m.position.x - TUNNEL_LAYOUT.centerX)).toBeLessThan(1);
    });
  });

  it('headwalls have portals and the east wall closes for walk mode only', () => {
    const s = new StationBuilder();
    const heads = s.boxGroup.children.filter((c) => (c as THREE.Mesh).geometry?.type === 'ExtrudeGeometry');
    expect(heads.length).toBe(2);
    expect(s.eastWallUpper!.visible).toBe(false);
    s.setCutaway(false); expect(s.eastWallUpper!.visible).toBe(true);
    s.setCutaway(true); expect(s.eastWallUpper!.visible).toBe(false);
  });
});
