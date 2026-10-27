import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class OverviewControls {
  public controls: OrbitControls;
  public camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(this.camera, domElement);

    // Smooth damping
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Movement & distance limits
    this.controls.minDistance = 8;
    this.controls.maxDistance = 350;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Initial position: looking straight into the architectural cutaway
    this.resetView();
  }

  public resetView() {
    this.camera.position.set(52, 12, 48);
    this.controls.target.set(0, -18, 0); // Focus on intermediate level center
    this.controls.update();
  }

  public update() {
    this.controls.update();
  }
}
