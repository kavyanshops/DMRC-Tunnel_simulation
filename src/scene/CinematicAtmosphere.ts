import * as THREE from 'three';

export class CinematicAtmosphere {
  public group: THREE.Group;
  public dustParticles: THREE.Points;
  public portalLightMesh: THREE.Mesh;
  public portalPointLight: THREE.PointLight;

  private particleCount = 450;
  private particlePositions!: Float32Array;
  private particleSpeeds!: Float32Array;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CinematicAtmosphere';

    // 1. Portal at the distant end of the tunnel
    const portalGeom = new THREE.PlaneGeometry(6.2, 6.2);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    this.portalLightMesh = new THREE.Mesh(portalGeom, portalMat);
    // Position at the far end of the upper tunnel
    this.portalLightMesh.position.set(2.5, -15.5, -125);
    this.group.add(this.portalLightMesh);

    // Glowing beam sprite around portal
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(224, 242, 254, 0.9)');
    grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);

    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(32, 32, 1);
    glowSprite.position.set(2.5, -15.5, -124);
    this.group.add(glowSprite);

    // Volumetric point light emanating from portal
    this.portalPointLight = new THREE.PointLight(0x7dd3fc, 3.5, 95);
    this.portalPointLight.position.set(2.5, -15.5, -120);
    this.group.add(this.portalPointLight);

    // 2. Atmospheric dust motes floating inside the tunnel
    const geom = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleSpeeds = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      // Confine particles within the tunnel envelope
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.4;
      const x = 2.5 + Math.cos(angle) * radius;
      const y = -15.5 + Math.sin(angle) * radius;
      const z = -120 + Math.random() * 160;

      this.particlePositions[i * 3] = x;
      this.particlePositions[i * 3 + 1] = y;
      this.particlePositions[i * 3 + 2] = z;

      this.particleSpeeds[i] = 0.02 + Math.random() * 0.04;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    // Particle sprite
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.4, 'rgba(186, 230, 253, 0.6)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);

    const pTex = new THREE.CanvasTexture(pCanvas);
    const pMat = new THREE.PointsMaterial({
      size: 0.35,
      map: pTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dustParticles = new THREE.Points(geom, pMat);
    this.group.add(this.dustParticles);
  }

  public update(deltaTime: number) {
    const pos = this.dustParticles.geometry.attributes.position as THREE.BufferAttribute;
    const array = pos.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      // Drift slowly along Z toward viewer
      array[i * 3 + 2] += this.particleSpeeds[i] * 60 * deltaTime;
      if (array[i * 3 + 2] > 45) {
        array[i * 3 + 2] = -120;
      }
      // Gentle floating wobble
      array[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.002;
    }

    pos.needsUpdate = true;
  }
}
