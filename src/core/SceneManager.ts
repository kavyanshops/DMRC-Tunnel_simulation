import * as THREE from 'three';
import { GroundBuilder } from '../scene/GroundBuilder';
import { StationBuilder } from '../scene/StationBuilder';
import { TunnelBuilder } from '../scene/TunnelBuilder';
import { OverviewControls } from '../controls/OverviewControls';
import { STATION_SPEC, worldYToDepth, worldYToRL } from '../data/stationSpec';
import { LayerVisibilityState } from '../types';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public overviewControls: OverviewControls;

  public groundBuilder: GroundBuilder;
  public stationBuilder: StationBuilder;
  public tunnelBuilder: TunnelBuilder;

  private isRunning: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06090e);
    this.scene.fog = new THREE.FogExp2(0x06090e, 0.0035);

    // Camera: Field of view 50 deg for architectural perspective
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 700);

    // Renderer optimized for student laptops
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
    this.renderer.toneMappingExposure = 1.25;

    // Overview Controls
    this.overviewControls = new OverviewControls(this.camera, canvas);

    // Setup Rich Lighting
    this.setupLighting();

    // Instantiate 3D Subsystems
    this.groundBuilder = new GroundBuilder();
    this.stationBuilder = new StationBuilder();
    this.tunnelBuilder = new TunnelBuilder();

    this.scene.add(this.groundBuilder.group);
    this.scene.add(this.stationBuilder.group);
    this.scene.add(this.tunnelBuilder.group);

    // Window Resize Listener
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupLighting() {
    // Hemisphere fill light (sky tint vs ground tint)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    this.scene.add(hemiLight);

    // Ambient light - deep underground atmospheric blue-grey
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.35);
    this.scene.add(ambientLight);

    // Key Directional Light from above cutaway side
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(70, 85, 45);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 300;
    const shadowDist = 90;
    keyLight.shadow.camera.left = -shadowDist;
    keyLight.shadow.camera.right = shadowDist;
    keyLight.shadow.camera.top = shadowDist;
    keyLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(keyLight);

    // Fill Directional Light for opposite shadows
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    fillLight.position.set(-60, 40, -40);
    this.scene.add(fillLight);

    // Internal Station Floor Spotlights
    const concourseLight = new THREE.PointLight(0x38bdf8, 2.0, 70);
    concourseLight.position.set(0, -10.16 + 2.5, 0);
    this.scene.add(concourseLight);

    const upperPlatLight = new THREE.PointLight(0xfef08a, 2.2, 70);
    upperPlatLight.position.set(0, -16.31 + 2.5, 0);
    this.scene.add(upperPlatLight);

    const intermediateLight = new THREE.PointLight(0x60a5fa, 1.8, 70);
    intermediateLight.position.set(0, -24.46 + 2.5, 0);
    this.scene.add(intermediateLight);

    const lowerPlatLight = new THREE.PointLight(0xfde047, 2.2, 70);
    lowerPlatLight.position.set(0, -31.01 + 2.5, 0);
    this.scene.add(lowerPlatLight);
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

  /**
   * Calculates which station level corresponds to current camera focus
   */
  public getFocusTelemetry(): { name: string; depth: number; rl: number } {
    const targetY = this.overviewControls.controls.target.y;
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

    return {
      name: closest.name,
      depth,
      rl
    };
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

    this.overviewControls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
