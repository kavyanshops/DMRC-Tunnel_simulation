import * as THREE from 'three';
import { StationBuilder } from '../scene/StationBuilder';
import { TunnelBuilder } from '../scene/TunnelBuilder';
import { CirculationBuilder } from '../scene/CirculationBuilder';
import { StationInterior } from '../scene/StationInterior';
import {
  BOUNDS, MAX_TELEPORT_DIST, SMOOTH_SPEED, SNAP_TURN_DEG,
  VR_LEVEL_IDS, VRLevelId, levelFloorY, levelName
} from './config';
import { applyDeadzone, clampToBounds, rayPlaneHit, rigPositionForTarget, smoothMoveDelta, snapTurnDirection } from './locomotion';
import { PanelButton, hitTest, layoutLevelButtons } from './panelModel';
import { Hotspot, loadHotspots, wrapText } from './hotspots';
import { batchStaticMeshes } from './batch';
import { journeyGuidePoints } from '../navigation/journeyGraph';
import { nearestWalkablePoint } from '../navigation/walkableZones';

const PANEL_W = 512, PANEL_H = 640;

export class VRApp {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
  readonly rig = new THREE.Group();
  level: VRLevelId = 'concourse';

  private hotspots: Hotspot[] = loadHotspots();
  private hotspotMeshes: THREE.Object3D[] = [];
  private selected: Hotspot | null = null;
  private marker: THREE.Mesh;
  private markerValid = false;
  private markerPos = new THREE.Vector3();
  private menu: THREE.Mesh;
  private menuCtx: CanvasRenderingContext2D;
  private menuTex: THREE.CanvasTexture;
  private buttons: PanelButton[] = [];
  private routeGuide: THREE.Group;
  private info: THREE.Mesh;
  private infoCtx: CanvasRenderingContext2D;
  private infoTex: THREE.CanvasTexture;
  private controllers: THREE.Group[] = [];
  private prevTurnX = new Map<number, number>();
  private raycaster = new THREE.Raycaster();
  private keys = new Set<string>();
  private yaw = 0; private pitch = 0;
  batchInfo = { before: 0, after: 0 };
  onStatus: (s: string) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.scene.background = new THREE.Color(0x040609);
    this.scene.fog = new THREE.FogExp2(0x040609, 0.008);

    // Same station geometry as the main app, reused read-only. Ground/strata are left out:
    // a VR user stands inside the box, and the soil mesh would only cost draw calls.
    const station = new StationBuilder();
    const tunnels = new TunnelBuilder();
    const circulation = new CirculationBuilder();
    const interior = new StationInterior();
    const world = new THREE.Group();
    world.add(station.group, tunnels.group, circulation.group, interior.group);
    this.batchInfo = batchStaticMeshes(world);
    this.scene.add(world);

    this.scene.add(new THREE.HemisphereLight(0xcfd8dc, 0x0f172a, 1.1));
    this.scene.add(new THREE.AmbientLight(0x38bdf8, 0.5));
    for (const id of VR_LEVEL_IDS) {
      const l = new THREE.PointLight(0xffffff, 2.0, 70);
      l.position.set(0, levelFloorY(id) + 2.5, 0);
      this.scene.add(l);
    }

    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    this.marker.visible = false;
    this.scene.add(this.marker);

    this.buildHotspots();
    this.routeGuide = this.buildRouteGuide();
    this.scene.add(this.routeGuide);

    const m = this.makePanel(PANEL_W, PANEL_H, 0.32, 0.4);
    this.menu = m.mesh; this.menuCtx = m.ctx; this.menuTex = m.tex;
    const i = this.makePanel(768, 640, 1.2, 1.0);
    this.info = i.mesh; this.infoCtx = i.ctx; this.infoTex = i.tex;
    this.info.visible = false;
    this.scene.add(this.info);

    this.setupControllers();
    this.setupDesktop();
    this.setLevel('concourse', 0, 0);
    this.drawMenu();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop((t, f) => this.frame(t, f));
  }

  // ---- scene helpers ----
  private makePanel(cw: number, ch: number, w: number, h: number) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d')!;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, fog: false }));
    return { mesh, ctx, tex };
  }

  private buildHotspots() {
    const geo = new THREE.SphereGeometry(0.12, 12, 8);
    const mesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false }),
      this.hotspots.length
    );
    const matrix = new THREE.Matrix4();
    for (const [index, h] of this.hotspots.entries()) {
      matrix.makeTranslation(...h.position);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.hotspots = this.hotspots;
    this.scene.add(mesh);
    this.hotspotMeshes.push(mesh);
  }

  // ---- level / movement ----
  setLevel(id: VRLevelId, x = this.headWorld().x, z = this.headWorld().z) {
    this.level = id;
    const head = new THREE.Vector3(); this.camera.getWorldPosition(head);
    const local = this.camera.position;
    const point = nearestWalkablePoint(id, x, z);
    const p = clampToBounds({ x: point.x, y: 0, z: point.z });
    const rp = rigPositionForTarget(p, { x: local.x, y: 0, z: local.z }, levelFloorY(id));
    this.rig.position.set(rp.x, rp.y, rp.z);
    this.refreshMenuAndInfo();
  }

  private headWorld() { const v = new THREE.Vector3(); this.camera.getWorldPosition(v); return v; }

  teleportTo(p: THREE.Vector3) {
    const point = nearestWalkablePoint(this.level, p.x, p.z);
    const c = clampToBounds({ x: point.x, y: 0, z: point.z });
    const local = this.camera.position;
    const rp = rigPositionForTarget(c, { x: local.x, y: 0, z: local.z }, levelFloorY(this.level));
    this.rig.position.set(rp.x, rp.y, rp.z);
  }

  private snapTurn(sign: number) {
    const before = this.headWorld();
    this.rig.rotation.y += sign * THREE.MathUtils.degToRad(SNAP_TURN_DEG);
    this.rig.updateMatrixWorld(true);
    const after = this.headWorld();
    this.rig.position.x += before.x - after.x;
    this.rig.position.z += before.z - after.z;
  }

  // ---- controllers ----
  private setupControllers() {
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      c.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
        new THREE.LineBasicMaterial({ color: 0x7dd3fc })
      ));
      c.addEventListener('connected', (e: any) => {
        c.userData.handedness = e.data.handedness;
        if (e.data.handedness === 'left') { c.add(this.menu); this.menu.position.set(0, 0.12, -0.12); this.menu.rotation.set(-Math.PI / 3, 0, 0); }
      });
      c.addEventListener('selectstart', () => this.onSelect(c));
      this.rig.add(c);
      this.controllers.push(c);
    }
  }

  private pointer(c: THREE.Group) {
    const origin = new THREE.Vector3(); c.getWorldPosition(origin);
    const q = new THREE.Quaternion(); c.getWorldQuaternion(q);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return { origin, dir };
  }

  private onSelect(c: THREE.Group) {
    const { origin, dir } = this.pointer(c);
    this.raycaster.set(origin, dir);
    const panels = [this.menu, ...(this.info.visible ? [this.info] : [])];
    const ph = this.raycaster.intersectObjects(panels, false)[0];
    if (ph && ph.uv) {
      if (ph.object === this.menu) {
        const b = hitTest(this.buttons, ph.uv.x, ph.uv.y, PANEL_W, PANEL_H);
        if (b) this.onButton(b.id);
      } else { this.selected = null; this.info.visible = false; }
      return;
    }
    const hh = this.raycaster.intersectObjects(this.hotspotMeshes, false)[0];
    if (hh && hh.instanceId !== undefined) {
      const hotspots = hh.object.userData.hotspots as Hotspot[];
      this.showInfo(hotspots[hh.instanceId]);
      return;
    }
    if (this.markerValid) this.teleportTo(this.markerPos);
  }

  private onButton(id: string) {
    if (id.startsWith('lvl:')) this.setLevel(id.slice(4) as VRLevelId);
    else if (id === 'hotspots') this.hotspotMeshes.forEach((m) => (m.visible = !m.visible));
    else if (id === 'route') this.routeGuide.visible = !this.routeGuide.visible;
  }

  // ---- UI drawing ----
  private refreshMenuAndInfo() { this.drawMenu(); }

  private drawMenu() {
    const g = this.menuCtx;
    g.fillStyle = 'rgba(15,23,42,0.92)'; g.fillRect(0, 0, PANEL_W, PANEL_H);
    g.fillStyle = '#e2e8f0'; g.font = 'bold 26px system-ui'; g.fillText('Level', 16, 40);
    this.buttons = layoutLevelButtons(
      VR_LEVEL_IDS.map((id) => ({ id: 'lvl:' + id, label: levelName(id) })), PANEL_W, 56, 64, 12);
    this.buttons.push({ id: 'hotspots', label: 'Toggle hotspots', x: 12, y: 56 + 4 * 76 + 8, w: PANEL_W - 24, h: 64 });
    this.buttons.push({ id: 'route', label: 'Toggle route guide', x: 12, y: 56 + 4 * 76 + 84, w: PANEL_W - 24, h: 64 });
    for (const b of this.buttons) {
      const active = b.id === 'lvl:' + this.level;
      g.fillStyle = active ? '#0ea5e9' : '#334155'; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = active ? '#04121c' : '#e2e8f0'; g.font = '24px system-ui'; g.fillText(b.label, b.x + 14, b.y + 40);
    }

    this.menuTex.needsUpdate = true;
  }

  private buildRouteGuide() {
    const group = new THREE.Group();
    group.name = 'GuidedJourneyRoute';
    const points = journeyGuidePoints().map((point) => new THREE.Vector3(point.x, point.y + 0.08, point.z));
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 })
    ));
    const geometry = new THREE.SphereGeometry(0.18, 12, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    for (const point of points) {
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(point);
      group.add(marker);
    }
    group.visible = false;
    return group;
  }

  private showInfo(h: Hotspot) {
    this.selected = h;
    const g = this.infoCtx; const w = 768, hgt = 640;
    g.fillStyle = 'rgba(15,23,42,0.95)'; g.fillRect(0, 0, w, hgt);
    let y = 40;
    g.fillStyle = '#f8fafc'; g.font = 'bold 30px system-ui'; g.fillText(h.name, 16, y); y += 36;
    if (h.nameHindi) { g.fillStyle = '#7dd3fc'; g.font = '26px system-ui'; g.fillText(h.nameHindi, 16, y); y += 34; }
    g.fillStyle = '#94a3b8'; g.font = '20px system-ui'; g.fillText(`Confidence: ${h.confidence} · Source: ${h.source}`, 16, y); y += 34;
    g.fillStyle = '#e2e8f0'; g.font = '22px system-ui';
    for (const l of wrapText(h.description, 56).slice(0, 6)) { g.fillText(l, 16, y); y += 28; }
    y += 8;
    if (h.safetyNotice) {
      g.fillStyle = '#fca5a5'; g.font = 'bold 22px system-ui';
      for (const l of wrapText('Safety: ' + h.safetyNotice, 52).slice(0, 4)) { g.fillText(l, 16, y); y += 28; }
    }
    g.fillStyle = '#64748b'; g.font = '18px system-ui'; g.fillText('Point at this panel and press trigger to close', 16, hgt - 16);
    this.infoTex.needsUpdate = true;
    // Place 1.4 m in front of the head, at eye height, facing the user.
    const head = this.headWorld();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    fwd.y = 0; fwd.normalize();
    this.info.position.copy(head).addScaledVector(fwd, 1.4);
    this.info.lookAt(head);
    this.info.visible = true;
  }

  // ---- loop ----
  private frame(_t: number, _f?: XRFrame) {
    const presenting = this.renderer.xr.isPresenting;
    if (presenting) this.xrInput(); else this.desktopInput(1 / 60);
    // Teleport marker from the right controller (or screen centre on desktop).
    this.markerValid = false;
    const ptr = presenting
      ? this.pointer(this.controllers.find((c) => c.userData.handedness === 'right') ?? this.controllers[1])
      : { origin: this.headWorld(), dir: new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion())) };
    const hit = rayPlaneHit(ptr.origin, ptr.dir, levelFloorY(this.level), MAX_TELEPORT_DIST);
    if (hit && hit.x >= BOUNDS.xMin && hit.x <= BOUNDS.xMax && hit.z >= BOUNDS.zMin && hit.z <= BOUNDS.zMax) {
      this.markerValid = true; this.markerPos.set(hit.x, hit.y, hit.z);
      this.marker.position.copy(this.markerPos).y += 0.02;
    }
    this.marker.visible = this.markerValid && (presenting || false);
    this.renderer.render(this.scene, this.camera);
  }

  private xrInput() {
    const session = this.renderer.xr.getSession();
    if (!session) return;
    let idx = 0;
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (gp && src.handedness === 'right' && gp.axes.length >= 4) {
        const [x] = applyDeadzone(gp.axes[2], gp.axes[3]);
        const dir = snapTurnDirection(this.prevTurnX.get(idx) ?? 0, x);
        this.prevTurnX.set(idx, x);
        if (dir !== 0) this.snapTurn(dir);
      }
      idx++;
    }
  }

  // ---- desktop preview (no headset needed) ----
  private setupDesktop() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      const n = Number(e.key);
      if (n >= 1 && n <= 4) this.setLevel(VR_LEVEL_IDS[n - 1]);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    let drag = false;
    this.canvas.addEventListener('pointerdown', () => (drag = true));
    window.addEventListener('pointerup', () => (drag = false));
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag || this.renderer.xr.isPresenting) return;
      this.yaw -= e.movementX * 0.004;
      this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - e.movementY * 0.004));
    });
  }

  private desktopInput(dt: number) {
    this.camera.position.set(0, 1.6, 0); // standing eye height in desktop preview
    this.rig.rotation.set(0, this.yaw, 0);
    this.camera.rotation.set(this.pitch, 0, 0);
    const sx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const sy = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);
    if (sx || sy) {
      const [dx, dz] = smoothMoveDelta(sx, sy, this.yaw, SMOOTH_SPEED * 2, dt);
      const p = clampToBounds({ x: this.rig.position.x + dx, y: 0, z: this.rig.position.z + dz });
      this.rig.position.x = p.x; this.rig.position.z = p.z;
    }
  }

  // ---- session / resize ----
  private resize() {
    if (this.renderer.xr.isPresenting) return;
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  async enterVR() {
    const xr = (navigator as any).xr;
    const session = await xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    session.addEventListener('end', () => this.onStatus('VR session ended'));
    await this.renderer.xr.setSession(session);
    this.camera.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.setLevel(this.level, 0, 0);
    this.onStatus('In VR. Point + trigger to teleport; right stick turns.');
  }

  stats() { return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, selected: this.selected?.id ?? null }; }
}
