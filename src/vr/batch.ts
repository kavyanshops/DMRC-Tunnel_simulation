import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function materialKey(m: THREE.Material | THREE.Material[]): string | null {
  if (Array.isArray(m)) return null;
  const a = m as any;
  if (a.isShaderMaterial) return null;
  if (a.map || a.alphaMap || a.normalMap || a.emissiveMap) return m.uuid; // textured: keep identity
  return [m.type, a.color?.getHex?.(), a.emissive?.getHex?.(), a.emissiveIntensity, a.roughness, a.metalness,
    m.opacity, m.transparent, m.side, m.depthWrite, a.flatShading, a.wireframe, a.fog].join('|');
}

/**
 * Merge static meshes that share a material into one mesh per material (VR is draw-call bound).
 * Only rearranges the scene graph handed in; the source builder classes are untouched.
 * Meshes are baked to world space, so call this once after the scene is placed.
 */
export function batchStaticMeshes(root: THREE.Object3D): { before: number; after: number } {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  let before = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (o as any).isInstancedMesh || (o as any).isSkinnedMesh) return;
    before++;
    let visible = true;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) visible = false;
    if (!visible || o.userData.noBatch) return;
    const key = materialKey(mesh.material);
    if (!key || !mesh.geometry.attributes.position) return;
    const g = mesh.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!(mesh.material as any).map) g.deleteAttribute('uv');
    g.clearGroups();
    g.applyMatrix4(mesh.matrixWorld);
    const b = buckets.get(key) ?? { mat: mesh.material as THREE.Material, geos: [], meshes: [] };
    b.geos.push(g); b.meshes.push(mesh);
    buckets.set(key, b);
  });
  let after = before;
  for (const { mat, geos, meshes } of buckets.values()) {
    if (geos.length < 2) continue;
    const indexed = geos.filter((g) => g.index).length;
    const norm = indexed === 0 || indexed === geos.length ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(norm, false);
    if (!merged) continue;
    for (const m of meshes) m.parent?.remove(m);
    const out = new THREE.Mesh(merged, mat);
    out.matrixAutoUpdate = false;
    root.add(out);
    after -= meshes.length - 1;
  }
  const l = batchLines(root);
  return { before: before + l.before, after: after + l.after };
}

/** Merge Line / LineSegments / LineLoop objects that share a material into one LineSegments. */
function batchLines(root: THREE.Object3D): { before: number; after: number } {
  const buckets = new Map<string, { mat: THREE.Material; pts: number[]; lines: THREE.Object3D[] }>();
  let before = 0;
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const ln = o as THREE.Line;
    if (!ln.isLine) return;
    before++;
    let visible = true;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) visible = false;
    const key = Array.isArray(ln.material) ? null : ln.material.uuid;
    const pos = ln.geometry.attributes.position;
    if (!visible || !key || !pos || o.userData.noBatch) return;
    const n = ln.geometry.index ? ln.geometry.index.count : pos.count;
    const at = (i: number) => (ln.geometry.index ? ln.geometry.index.getX(i) : i);
    const push = (a: number, b: number) => {
      for (const i of [a, b]) { v.fromBufferAttribute(pos, at(i)).applyMatrix4(ln.matrixWorld); bk.pts.push(v.x, v.y, v.z); }
    };
    const bk = buckets.get(key) ?? { mat: ln.material as THREE.Material, pts: [], lines: [] };
    if ((o as any).isLineSegments) for (let i = 0; i + 1 < n; i += 2) push(i, i + 1);
    else { for (let i = 0; i + 1 < n; i++) push(i, i + 1); if ((o as any).isLineLoop && n > 2) push(n - 1, 0); }
    bk.lines.push(o);
    buckets.set(key, bk);
  });
  let after = before;
  for (const { mat, pts, lines } of buckets.values()) {
    for (const l of lines) l.parent?.remove(l);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const out = new THREE.LineSegments(g, mat);
    out.matrixAutoUpdate = false;
    root.add(out);
    after -= lines.length - 1;
  }
  return { before, after };
}
