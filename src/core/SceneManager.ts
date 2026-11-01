import * as THREE from 'three';
import { GroundBuilder } from '../scene/GroundBuilder';
import { StationBuilder } from '../scene/StationBuilder';
import { TunnelBuilder } from '../scene/TunnelBuilder';
import { CirculationBuilder } from '../scene/CirculationBuilder';
import { StationInterior } from '../scene/StationInterior';
import { CinematicAtmosphere } from '../scene/CinematicAtmosphere';
import { ComponentLibrary, ComponentRecord } from '../ui/ComponentLibrary';
import { OverviewControls } from '../controls/OverviewControls';
import { FirstPersonControls } from '../controls/FirstPersonControls';
import { WalkHUD } from '../controls/WalkHUD';
import { STATION_SPEC, worldYToDepth, worldYToRL } from '../data/stationSpec';
import { AppMode, CameraViewMode, LayerVisibilityState } from '../types';
import { RouteGuide } from '../navigation/RouteGuide';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public overviewControls: OverviewControls;
  public firstPersonControls: FirstPersonControls;
  public walkHUD: WalkHUD;
  public cameraViewMode: CameraViewMode = 'overview';

  public groundBuilder: GroundBuilder;
  public stationBuilder: StationBuilder;
  public tunnelBuilder: TunnelBuilder;
  public circulationBuilder: CirculationBuilder;
  public stationInterior: StationInterior;
  public atmosphere: CinematicAtmosphere;
  public componentLibrary: ComponentLibrary;
  public routeGuide: RouteGuide;

  private currentMode: AppMode = 'home';
  private isRunning: boolean = true;
  private lastTime: number = performance.now();

  // Mouse parallax interpolation for Home mode
  public mousePos = { x: 0, y: 0, currentX: 0, currentY: 0 };

  // Home camera resting position
  private homeCamPos = new THREE.Vector3(2.5, -15.5, 25);
  private homeCamLook = new THREE.Vector3(2.5, -15.5, -125);

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040609);
    this.scene.fog = new THREE.FogExp2(0x040609, 0.0045);

    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.3, 700);

    // Initial position in tunnel for Home mode
    this.camera.position.copy(this.homeCamPos);
    this.camera.lookAt(this.homeCamLook);

    // WebGLRenderer optimized for laptops
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    // Overview Controls (active in explorer mode)
    this.overviewControls = new OverviewControls(this.camera, canvas);
    this.overviewControls.controls.enabled = false; // disabled on home

    // Setup Lighting
    this.setupLighting();

    // 3D Subsystems
    this.groundBuilder = new GroundBuilder();
    this.stationBuilder = new StationBuilder();
    this.tunnelBuilder = new TunnelBuilder();
    this.circulationBuilder = new CirculationBuilder();
    this.stationInterior = new StationInterior();
    this.atmosphere = new CinematicAtmosphere();

    this.scene.add(this.groundBuilder.group);
    this.scene.add(this.stationBuilder.group);
    this.scene.add(this.tunnelBuilder.group);
    this.scene.add(this.circulationBuilder.group);
    this.scene.add(this.stationInterior.group);
    this.scene.add(this.atmosphere.group);

    // First-Person Controls & HUD (Milestone 2 Walk Mode)
    this.firstPersonControls = new FirstPersonControls(this.camera, canvas, this.circulationBuilder);
    this.firstPersonControls.setStationInterior(this.stationInterior);

    // Component Library (Milestone 3)
    this.componentLibrary = new ComponentLibrary((comp) => this.navigateToComponent(comp));

    this.walkHUD = new WalkHUD(this.firstPersonControls, () => this.toggleCameraView(), this.componentLibrary);
    this.routeGuide = new RouteGuide();
    this.scene.add(this.routeGuide.group);
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyG' && this.cameraViewMode === 'walk') this.routeGuide.setVisible(!this.routeGuide.group.visible);
    });

    // On interact in walk mode, mark explored in component library
    const origInteractCallback = this.firstPersonControls.onInteractCallback;
    this.firstPersonControls.onInteractCallback = (item) => {
      this.componentLibrary.markAsExplored(item.id);
      if (origInteractCallback) origInteractCallback(item);
    };

    // Tab key switches between Overview and First-Person Walk modes
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && this.currentMode === 'explorer') {
        e.preventDefault();
        this.toggleCameraView();
      }
    });

    // Window Resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupLighting() {
    // Rich hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xcfd8dc, 0x0f172a, 0.9);
    this.scene.add(hemiLight);

    // Deep underground ambient
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.4);
    this.scene.add(ambientLight);

    // Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(70, 85, 45);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    // Tunnel trackside lighting fixtures along upper tunnel
    for (let z = -100; z <= 20; z += 25) {
      const fixtureLight = new THREE.PointLight(0x7dd3fc, 1.4, 28);
      fixtureLight.position.set(2.5 + 2.5, -14.2, z);
      this.scene.add(fixtureLight);

      // Small light bracket geometry
      const fixtureMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xbae6fd })
      );
      fixtureMesh.position.set(2.5 + 2.7, -14.2, z);
      this.scene.add(fixtureMesh);
    }

    // Floor accent lights
    const concourseLight = new THREE.PointLight(0x38bdf8, 2.0, 70);
    concourseLight.position.set(0, -10.16 + 2.5, 0);
    this.scene.add(concourseLight);

    const intermediateLight = new THREE.PointLight(0x60a5fa, 1.8, 70);
    intermediateLight.position.set(0, -24.46 + 2.5, 0);
    this.scene.add(intermediateLight);

    const lowerPlatLight = new THREE.PointLight(0xfde047, 2.2, 70);
    lowerPlatLight.position.set(0, -31.01 + 2.5, 0);
    this.scene.add(lowerPlatLight);
  }

  public setMode(mode: AppMode) {
    this.currentMode = mode;

    if (mode === 'home') {
      this.overviewControls.controls.enabled = false;
      this.firstPersonControls.enabled = false;
      this.firstPersonControls.unlock();
      this.walkHUD.setVisible(false);
      this.groundBuilder.group.visible = true;
      this.atmosphere.group.visible = true;
    } else {
      // Explorer / 3D Mode
      this.setCameraView('overview');
    }
  }

  public setCameraView(viewMode: CameraViewMode) {
    this.cameraViewMode = viewMode;
    this.stationBuilder.setCutaway(viewMode !== 'walk');
    const hudOverlay = document.getElementById('hud-overlay');

    if (viewMode === 'walk') {
      this.overviewControls.controls.enabled = false;
      this.firstPersonControls.enabled = true;
      this.firstPersonControls.updateCameraTransform();
      this.walkHUD.setVisible(true);
      if (hudOverlay) hudOverlay.style.display = 'none';
      // When entering walk mode, automatically attempt pointer lock
      this.firstPersonControls.lock();
    } else {
      this.routeGuide.setVisible(false);
      this.firstPersonControls.enabled = false;
      this.firstPersonControls.unlock();
      this.overviewControls.controls.enabled = true;
      this.overviewControls.resetView();
      this.walkHUD.setVisible(false);
      if (hudOverlay) hudOverlay.style.display = 'block';
    }
  }

  public toggleCameraView() {
    this.setCameraView(this.cameraViewMode === 'overview' ? 'walk' : 'overview');
  }

  public navigateToComponent(comp: ComponentRecord) {
    if (this.currentMode === 'home') {
      this.setMode('explorer');
    }

    if (this.cameraViewMode === 'walk') {
      if (comp.levelId && ['concourse', 'upper_platform', 'intermediate', 'lower_platform', 'ground'].includes(comp.levelId)) {
        this.firstPersonControls.teleportToLevel(comp.levelId);
      }
      const target = new THREE.Vector3(comp.coordinates.x, comp.coordinates.y, comp.coordinates.z);
      let spawnX = target.x;
      let spawnZ = target.z - 2.5;
      if (spawnX < -5.4) spawnX = -4.5;
      if (spawnX > 5.4) spawnX = 4.5;
      if (spawnZ < -94) spawnZ = -92;
      if (spawnZ > 94) spawnZ = 92;

      this.firstPersonControls.feetPosition.set(spawnX, comp.coordinates.y, spawnZ);
      const dx = target.x - spawnX;
      const dz = target.z - spawnZ;
      this.firstPersonControls.yaw = Math.atan2(-dx, -dz);
      this.firstPersonControls.pitch = 0;
      this.firstPersonControls.updateCameraTransform();
      this.firstPersonControls.lock();
    } else {
      this.overviewControls.controls.target.set(comp.coordinates.x, comp.coordinates.y, comp.coordinates.z);
      this.camera.position.set(comp.coordinates.x + 35, comp.coordinates.y + 16, comp.coordinates.z + 28);
      this.overviewControls.controls.update();
    }
  }


  public updateMouseParallax(normX: number, normY: number) {
    this.mousePos.x = normX;
    this.mousePos.y = normY;
  }

  public setSoilCutaway(percent: number) {
    const fraction = percent / 100;
    this.groundBuilder.setCutawayProgress(fraction);
  }

  public setLayerVisibility(layer: keyof LayerVisibilityState, visible: boolean) {
    switch (layer) {
      case 'ground':
        this.groundBuilder.strataGroup.visible = visible;
        break;
      case 'stationBox':
        this.stationBuilder.boxGroup.visible = visible;
        this.stationBuilder.slabsGroup.visible = visible;
        this.stationBuilder.columnsGroup.visible = visible;
        this.stationBuilder.platformsGroup.visible = visible;
        this.circulationBuilder.group.visible = visible;
        this.stationInterior.group.visible = visible;
        break;
      case 'tunnels':
        this.tunnelBuilder.tunnelsGroup.visible = visible;
        this.tunnelBuilder.tracksGroup.visible = visible;
        break;
      case 'systems':
        this.tunnelBuilder.crossPassageGroup.visible = visible;
        this.groundBuilder.sewerGroup.visible = visible;
        break;
      case 'assumedTags':
        this.groundBuilder.assumedTagsGroup.visible = visible;
        this.stationBuilder.assumedEquipmentGroup.visible = visible;
        this.tunnelBuilder.crossPassageGroup.visible = visible;
        this.tunnelBuilder.conflictNoticeGroup.visible = visible;
        break;
      case 'surfaceContext':
        this.groundBuilder.surfaceGroup.visible = visible;
        break;
    }
  }

  public getFocusTelemetry(): { name: string; depth: number; rl: number } {
    const targetY = this.currentMode === 'home' 
      ? this.homeCamPos.y 
      : this.overviewControls.controls.target.y;
    const depth = Math.max(0, worldYToDepth(targetY));
    const rl = worldYToRL(targetY);

    let closest = STATION_SPEC.levels[0];
    let minDiff = 999;
    STATION_SPEC.levels.forEach((lvl) => {
      const lvlY = -lvl.depthBelowGround;
      const diff = Math.abs(lvlY - targetY);
      if (diff < minDiff) {
        minDiff = diff;
        closest = lvl;
      }
    });

    return { name: closest.name, depth, rl };
  }

  private onWindowResize() {
    const canvas = this.renderer.domElement;
    const width = canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.parentElement?.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Update floating atmospheric particles
    this.atmosphere.update(deltaTime);

    if (this.currentMode === 'home') {
      // Smooth continuous cursor parallax in genuine 3D perspective
      const lerp = 0.045;
      this.mousePos.currentX += (this.mousePos.x - this.mousePos.currentX) * lerp;
      this.mousePos.currentY += (this.mousePos.y - this.mousePos.currentY) * lerp;

      // Restrained camera head shift
      const camX = this.homeCamPos.x + this.mousePos.currentX * 1.6;
      const camY = this.homeCamPos.y - this.mousePos.currentY * 0.9;
      const camZ = this.homeCamPos.z;

      this.camera.position.set(camX, camY, camZ);

      // Camera gaze direction looking down tunnel
      const lookX = this.homeCamLook.x - this.mousePos.currentX * 2.8;
      const lookY = this.homeCamLook.y + this.mousePos.currentY * 1.8;
      const lookZ = this.homeCamLook.z;

      this.camera.lookAt(lookX, lookY, lookZ);
    } else if (this.cameraViewMode === 'walk') {
      this.firstPersonControls.update(deltaTime);
      const telem = this.firstPersonControls.getTelemetry();
      this.walkHUD.update(telem, this.firstPersonControls.feetPosition, this.firstPersonControls.yaw);
    } else {
      this.overviewControls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onWindowResize);
    this.firstPersonControls.dispose();
    this.renderer.dispose();
  }
}
