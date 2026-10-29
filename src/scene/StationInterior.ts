import * as THREE from 'three';
import { depthToWorldY, STATION_SPEC } from '../data/stationSpec';

export interface StationInteractable {
  id: string;
  name: string;
  actionText: string;
  position: THREE.Vector3;
  radius: number;
  levelId: string;
  type: 'tvm' | 'faregate' | 'psd' | 'elevator_call' | 'pids' | 'map' | 'bench' | 'emergency_sos' | 'customercare';
  details: {
    title: string;
    subtitle: string;
    description: string;
    bulletPoints?: string[];
    actionLabel?: string;
  };
}

/**
 * Creates high-resolution procedural canvas textures for authentic Delhi Metro signage
 */
function createSignTexture(
  textEnglish: string,
  textHindi: string,
  bgColor: string = '#0284c7',
  textColor: string = '#ffffff',
  accentColor: string = '#38bdf8'
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Background fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent line along bottom
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, canvas.height - 18, canvas.width, 18);

    // Text rendering
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(textEnglish, canvas.width / 2, 85);

    if (textHindi) {
      ctx.font = '500 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(textHindi, canvas.width / 2, 175);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Procedural tile grid texture for station flooring
 */
function createFloorTileTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 512);

    // Granite speckle pattern
    ctx.fillStyle = '#475569';
    for (let x = 0; x < 512; x += 128) {
      for (let y = 0; y < 512; y += 128) {
        ctx.fillRect(x + 2, y + 2, 124, 124);
      }
    }

    // Grout lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(512, i);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 64);
  return texture;
}

export class StationInterior {
  public group: THREE.Group;
  public interactables: StationInteractable[] = [];

  // Shared Materials
  private ceilingMat: THREE.MeshStandardMaterial;
  private floorMat: THREE.MeshStandardMaterial;
  private wallMat: THREE.MeshStandardMaterial;
  private accentWallMat: THREE.MeshStandardMaterial;
  private tactileMat: THREE.MeshStandardMaterial;
  private stainlessMat: THREE.MeshStandardMaterial;
  private glassMat: THREE.MeshPhysicalMaterial;
  private trackBedMat: THREE.MeshStandardMaterial;
  private railMat: THREE.MeshStandardMaterial;
  private thirdRailMat: THREE.MeshStandardMaterial;
  private emergencyRedMat: THREE.MeshStandardMaterial;
  private screenGlowMat: THREE.MeshBasicMaterial;

  // Station Dimensions
  private readonly width = STATION_SPEC.stationBox.width.value;   // 13.4m
  private readonly length = STATION_SPEC.stationBox.length.value; // 200m
  private readonly platLength = STATION_SPEC.assumedArchitectural.platformLength.value; // 140m

  // Animated elements
  public fareGatesOpen: boolean = false;
  private fareGateFlaps: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'StationInterior';

    // Materials
    this.ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const floorTex = createFloorTileTexture();
    this.floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.15
    });

    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.05
    });

    this.accentWallMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Delhi Metro Blue / Magenta accent
      roughness: 0.3,
      metalness: 0.2
    });

    this.tactileMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Yellow tactile paving
      roughness: 0.7,
      metalness: 0.1
    });

    this.stainlessMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.25,
      metalness: 0.85
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.7
    });

    this.trackBedMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.95
    });

    this.railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.9
    });

    this.thirdRailMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.4,
      metalness: 0.3
    });

    this.emergencyRedMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.4
    });

    this.screenGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });

    this.buildCeilingBaffles();
    this.buildGraniteFloors();
    this.buildWallCladding();
    this.buildRecessedLighting();
    this.buildTrackways();
    this.buildConcourseFacilities();
    this.buildPlatformSystems();
    this.buildSecurityCheckpoints();
    this.buildWayfindingSignage();
  }

  /**
   * Suspended acoustic ceiling baffle strips (realistic architectural ceiling)
   */
  private buildCeilingBaffles() {
    const levels = [
      { ceilY: depthToWorldY(5.36), name: 'concourse' },
      { ceilY: depthToWorldY(10.56), name: 'upper_platform' },
      { ceilY: depthToWorldY(18.96), name: 'intermediate' },
      { ceilY: depthToWorldY(24.91), name: 'lower_platform' },
    ];

    const baffleW = this.width - 2.0;
    levels.forEach((lvl) => {
      // Solid ceiling backing
      const backPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(baffleW, this.length - 4),
        this.ceilingMat
      );
      backPlane.rotation.x = Math.PI / 2;
      backPlane.position.set(0, lvl.ceilY - 0.02, 0);
      this.group.add(backPlane);

      // Acoustic linear metal baffles every 5 metres
      for (let z = -90; z <= 90; z += 5) {
        const baffle = new THREE.Mesh(
          new THREE.BoxGeometry(baffleW, 0.2, 0.08),
          this.stainlessMat
        );
        baffle.position.set(0, lvl.ceilY - 0.12, z);
        this.group.add(baffle);
      }

      // Overhead utility pipes and HVAC ductwork running along the ceiling
      [-3.0, 3.0].forEach((pipeX) => {
        const duct = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.4, this.length - 6),
          this.stainlessMat
        );
        duct.position.set(pipeX, lvl.ceilY - 0.3, 0);
        this.group.add(duct);

        // Fire sprinkler pipe (red)
        const firePipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, this.length - 6, 8),
          this.emergencyRedMat
        );
        firePipe.rotation.x = Math.PI / 2;
        firePipe.position.set(pipeX + 0.5, lvl.ceilY - 0.2, 0);
        this.group.add(firePipe);
      });
    });
  }

  /**
   * Polished granite floor overlays and tactile guidance paths
   */
  private buildGraniteFloors() {
    const floorLevels = [
      { depth: 10.16, id: 'concourse' },
      { depth: 16.31, id: 'upper_platform' },
      { depth: 24.46, id: 'intermediate' },
      { depth: 31.01, id: 'lower_platform' },
    ];

    floorLevels.forEach((fl) => {
      const y = depthToWorldY(fl.depth) + 0.005;

      // Granite tile floor finish overlay
      const floorTile = new THREE.Mesh(
        new THREE.PlaneGeometry(this.width - 2.0, this.length - 4),
        this.floorMat
      );
      floorTile.rotation.x = -Math.PI / 2;
      floorTile.position.set(0, y, 0);
      floorTile.receiveShadow = true;
      this.group.add(floorTile);

      // Platform tactile paving strip (0.6m from platform edge along Z = -70 to +70)
      if (fl.id === 'upper_platform' || fl.id === 'lower_platform') {
        const tactileStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.015, this.platLength),
          this.tactileMat
        );
        tactileStrip.position.set(0.0, y + 0.008, 0);
        this.group.add(tactileStrip);

        // Yellow warning edge line right at the platform edge
        const yellowLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.016, this.platLength),
          this.tactileMat
        );
        yellowLine.position.set(0.2, y + 0.008, 0);
        this.group.add(yellowLine);
      }

      // Concourse central tactile directional path leading to ticket gates
      if (fl.id === 'concourse') {
        const concTactile = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.015, 60),
          this.tactileMat
        );
        concTactile.position.set(0, y + 0.008, -20);
        this.group.add(concTactile);
      }
    });
  }

  /**
   * Vitrified enamel wall cladding with DMRC accent band
   */
  private buildWallCladding() {
    const halfW = this.width / 2;
    const wallLevels = [
      { topY: depthToWorldY(5.36), botY: depthToWorldY(10.16) },
      { topY: depthToWorldY(10.56), botY: depthToWorldY(16.31) },
      { topY: depthToWorldY(18.96), botY: depthToWorldY(24.46) },
      { topY: depthToWorldY(24.91), botY: depthToWorldY(31.01) },
    ];

    wallLevels.forEach((wl) => {
      const h = wl.topY - wl.botY;
      const cy = (wl.topY + wl.botY) / 2;

      // West Wall Panels
      const wPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, h - 0.2, this.length - 4),
        this.wallMat
      );
      wPanel.position.set(-halfW + 0.82, cy, 0);
      this.group.add(wPanel);

      // Accent colored stripe along the wall (0.5m tall at eye level)
      const wStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.45, this.length - 4),
        this.accentWallMat
      );
      wStripe.position.set(-halfW + 0.83, wl.botY + 1.6, 0);
      this.group.add(wStripe);
    });
  }

  /**
   * Continuous LED strip troughs with balanced point lights for performance
   */
  private buildRecessedLighting() {
    const levels = [
      { ceilY: depthToWorldY(5.36), lightY: depthToWorldY(5.36) - 0.3 },
      { ceilY: depthToWorldY(10.56), lightY: depthToWorldY(10.56) - 0.3 },
      { ceilY: depthToWorldY(18.96), lightY: depthToWorldY(18.96) - 0.3 },
      { ceilY: depthToWorldY(24.91), lightY: depthToWorldY(24.91) - 0.3 },
    ];

    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    levels.forEach((lvl) => {
      // Long linear glowing LED fixtures running longitudinally
      [-2.5, 2.5].forEach((lx) => {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.05, this.length - 8),
          ledMat
        );
        strip.position.set(lx, lvl.ceilY - 0.1, 0);
        this.group.add(strip);
      });

      // 4 soft downlights per level spaced 45m apart (great performance on laptops!)
      for (let z = -65; z <= 65; z += 45) {
        const pl = new THREE.PointLight(0xe0f2fe, 1.2, 35);
        pl.position.set(0, lvl.lightY, z);
        this.group.add(pl);
      }
    });
  }

  /**
   * Track bed plinth, UIC 60 steel rails, and 3rd power rail
   */
  private buildTrackways() {
    const trackConfigs = [
      { name: 'Upper Track', railY: depthToWorldY(17.40) },
      { name: 'Lower Track', railY: depthToWorldY(32.10) },
    ];

    trackConfigs.forEach((tc) => {
      // Ballastless track concrete plinth
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.3, this.platLength + 20),
        this.trackBedMat
      );
      plinth.position.set(3.0, tc.railY - 0.15, 0);
      this.group.add(plinth);

      // Dual running rails (standard gauge 1435mm)
      [-0.717, 0.717].forEach((rOff) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.16, this.platLength + 20),
          this.railMat
        );
        rail.position.set(3.0 + rOff, tc.railY + 0.08, 0);
        this.group.add(rail);

        // Sleepers / Pandrol clip fastenings every 2m
        for (let z = -70; z <= 70; z += 2) {
          const clip = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.04, 0.15),
            this.stainlessMat
          );
          clip.position.set(3.0 + rOff, tc.railY + 0.01, z);
          this.group.add(clip);
        }
      });

      // Third Rail (750V / traction power rail with yellow shield)
      const thirdRailCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.14, this.platLength + 20),
        this.thirdRailMat
      );
      thirdRailCover.position.set(3.0 + 1.45, tc.railY + 0.18, 0);
      this.group.add(thirdRailCover);

      // Drainage channel along track center
      const drain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.08, this.platLength + 20),
        new THREE.MeshBasicMaterial({ color: 0x09090b })
      );
      drain.position.set(3.0, tc.railY - 0.02, 0);
      this.group.add(drain);
    });
  }

  /**
   * Concourse: Automatic Fare Collection (AFC) turnstiles, TVMs, Customer Care
   */
  private buildConcourseFacilities() {
    const concY = depthToWorldY(10.16);

    // 1. AFC Turnstile Gate Array at Z = -20
    const gateCount = 7;
    const gateSpacing = 0.9;
    const startX = -((gateCount - 1) * gateSpacing) / 2;

    for (let i = 0; i < gateCount; i++) {
      const gx = startX + i * gateSpacing;

      // Gate pedestal (stainless steel body)
      const ped = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.05, 1.8),
        this.stainlessMat
      );
      ped.position.set(gx, concY + 0.525, -20);
      this.group.add(ped);

      // Card reader pad on top (glowing blue)
      const reader = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 0.18),
        this.screenGlowMat
      );
      reader.position.set(gx, concY + 1.06, -20.6);
      this.group.add(reader);

      // Status indicator light (green arrow on entry side)
      const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.04, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      indicator.position.set(gx, concY + 0.9, -20.91);
      this.group.add(indicator);

      // Acrylic motorized gate flap between pedestals (except end)
      if (i < gateCount - 1) {
        const flap = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.7, 0.03),
          new THREE.MeshPhysicalMaterial({
            color: 0xef4444, // Red closed flap
            transparent: true,
            opacity: 0.8,
            roughness: 0.1
          })
        );
        flap.position.set(gx + gateSpacing / 2, concY + 0.65, -20);
        this.group.add(flap);
        this.fareGateFlaps.push(flap);
      }
    }

    // Interactive Fare Gate entry
    this.interactables.push({
      id: 'faregate-concourse',
      name: 'AFC Smart Card Fare Gates',
      actionText: 'Tap Smart Card / Open Gate',
      position: new THREE.Vector3(0, concY + 1.0, -21.2),
      radius: 2.2,
      levelId: 'concourse',
      type: 'faregate',
      details: {
        title: 'Automatic Fare Collection (AFC)',
        subtitle: 'Delhi Metro Smart Card & QR Validator',
        description: 'Contactless smart card reader with bi-directional flap gates. Validates DMRC Smart Cards, NCMC (National Common Mobility Cards), and DMRC Momentum 2.0 QR tickets.',
        bulletPoints: [
          'Entry/Exit Fare Deduction: Auto-calculated by distance',
          'Supported: Metro Card, DMRC App QR, WhatsApp Ticketing',
          'Peak hours capacity: 45 passengers per minute per gate'
        ],
        actionLabel: 'TAP CARD & PASS'
      }
    });

    // 2. Ticket Vending Machines (TVMs) along West wall
    const tvmZStart = -35;
    for (let k = 0; k < 4; k++) {
      const tvmZ = tvmZStart + k * 3.5;

      // Machine kiosk body
      const tvm = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.9, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.3, metalness: 0.5 })
      );
      tvm.position.set(-5.3, concY + 0.95, tvmZ);
      this.group.add(tvm);

      // Touchscreen interface
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.45, 0.02),
        this.screenGlowMat
      );
      screen.position.set(-5.3, concY + 1.45, tvmZ + 0.31);
      this.group.add(screen);

      // Smart Card recharge cradle
      const cradle = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 0.15),
        this.stainlessMat
      );
      cradle.position.set(-5.3, concY + 1.05, tvmZ + 0.32);
      this.group.add(cradle);
    }

    // Interactive TVM
    this.interactables.push({
      id: 'tvm-concourse',
      name: 'Ticket Vending Machine (TVM)',
      actionText: 'Use Ticket Machine / Recharge',
      position: new THREE.Vector3(-4.6, concY + 1.0, -31.5),
      radius: 2.2,
      levelId: 'concourse',
      type: 'tvm',
      details: {
        title: 'DMRC Ticket Vending Machine (TVM)',
        subtitle: 'Cash, UPI & Smart Card Recharge',
        description: 'Self-service kiosk providing QR tokens and smart card balance top-ups for Delhi Metro travellers.',
        bulletPoints: [
          'DMRC Smart Card Current Balance: ₹240.00',
          'Sadar Bazar to Rajiv Chowk (Connaught Place): ₹30.00 (6 Stations)',
          'Sadar Bazar to IGI Airport Terminal 3: ₹60.00',
          'Quick Recharge options: ₹100 / ₹200 / ₹500'
        ],
        actionLabel: 'QUICK RECHARGE ₹100'
      }
    });

    // 3. Customer Care Counter
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.15, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.4 })
    );
    counter.position.set(3.5, concY + 0.575, -30);
    this.group.add(counter);

    // Glass safety partition with talk-through hole
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 1.0, 0.04),
      this.glassMat
    );
    glass.position.set(3.5, concY + 1.65, -29.6);
    this.group.add(glass);

    this.interactables.push({
      id: 'customercare-concourse',
      name: 'Customer Care & Help Desk',
      actionText: 'Inquire at Customer Care',
      position: new THREE.Vector3(3.5, concY + 1.0, -28.2),
      radius: 2.5,
      levelId: 'concourse',
      type: 'customercare',
      details: {
        title: 'DMRC Customer Care & Tourist Information',
        subtitle: 'Station Supervisor & Assistance Booth',
        description: 'Customer service desk offering tourist cards, lost and found inquiries, wheelchair assistance, and metro feeder bus connectivity info.',
        bulletPoints: [
          'DMRC Helpline: 155370 (24x7 Assistance)',
          '1-Day Tourist Card: ₹200 (Unlimited Metro Travel)',
          '3-Day Tourist Card: ₹500 (Unlimited Metro Travel)',
          'Accessibility: Wheelchair ramp and tactile guidance verified'
        ],
        actionLabel: 'REQUEST ASSISTANCE'
      }
    });
  }

  /**
   * Platform: Platform Screen Doors (PSD), PIDS electronic countdown, benches, ESP
   */
  private buildPlatformSystems() {
    const platLevels = [
      { id: 'upper_platform', name: 'Upper Platform (L2)', depth: 16.31, line: 'Platform 1 · Towards Janakpuri West' },
      { id: 'lower_platform', name: 'Lower Platform (L4)', depth: 31.01, line: 'Platform 2 · Towards R.K. Ashram Marg' },
    ];

    platLevels.forEach((pl) => {
      const floorY = depthToWorldY(pl.depth);

      // 1. Full-Height Platform Screen Doors (PSD) along edge X = 0.2
      const psdLen = this.platLength;
      const psdHeight = 2.4;

      // PSD Header Box (housing linear motors and wiring)
      const headerBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.35, psdLen),
        this.stainlessMat
      );
      headerBox.position.set(0.2, floorY + psdHeight + 0.175, 0);
      this.group.add(headerBox);

      // PSD Glass Panels with door gaps every 15 metres
      for (let z = -65; z <= 65; z += 15) {
        // Door opening indicator light (red when closed, green when train docked)
        const doorIndicator = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.06, 0.2),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        doorIndicator.position.set(0.2, floorY + psdHeight + 0.05, z);
        this.group.add(doorIndicator);
      }

      // 2. Hanging PIDS (Passenger Information Display System)
      [-30, 20].forEach((pz) => {
        const pids = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.45, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
        );
        pids.position.set(-2.0, floorY + 2.8, pz);
        this.group.add(pids);

        // LED Display face (Amber / Green text)
        const pidsDisplay = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.35, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        pidsDisplay.position.set(-2.0, floorY + 2.8, pz + 0.07);
        this.group.add(pidsDisplay);

        // Hanging suspension rods
        [-0.6, 0.6].forEach((rx) => {
          const rod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8),
            this.stainlessMat
          );
          rod.position.set(-2.0 + rx, floorY + 3.4, pz);
          this.group.add(rod);
        });

        this.interactables.push({
          id: `pids-${pl.id}-${pz}`,
          name: `PIDS Train Display (${pl.name})`,
          actionText: 'Inspect Live Train Schedule',
          position: new THREE.Vector3(-2.0, floorY + 1.6, pz),
          radius: 3.5,
          levelId: pl.id,
          type: 'pids',
          details: {
            title: 'Passenger Information Display System (PIDS)',
            subtitle: pl.line,
            description: 'Real-time train positioning telemetry synchronized with DMRC Centralized Operations Control Centre (OCC).',
            bulletPoints: [
              'Next Train: 2 mins (Approaching Sadar Bazar)',
              'Subsequent Train: 5 mins | 8-Car Rotem Trainset',
              'Speed in Approach Block: 62 km/h',
              'Platform Screen Door Interlock: ARMED (CBTC Grade of Automation GoA2)'
            ],
            actionLabel: 'REFRESH TELEMETRY'
          }
        });
      });

      // 3. Platform Stainless Steel Benches
      [-40, 0, 40].forEach((bz) => {
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.45, 0.6),
          this.stainlessMat
        );
        bench.position.set(-3.6, floorY + 0.225, bz);
        this.group.add(bench);

        this.interactables.push({
          id: `bench-${pl.id}-${bz}`,
          name: 'Platform Transit Bench',
          actionText: 'Sit / Rest on Platform Bench',
          position: new THREE.Vector3(-3.6, floorY + 0.8, bz),
          radius: 1.8,
          levelId: pl.id,
          type: 'bench',
          details: {
            title: 'Platform Waiting Seat',
            subtitle: 'Ergonomic 3-Seater Stainless Steel',
            description: 'Vandal-proof perforated stainless steel passenger seating installed throughout DMRC Phase IV stations.',
            bulletPoints: [
              'Capacity: 3 Passengers',
              'Reserved seating priority: Senior citizens & differently-abled',
              'Press [E] to sit / stand up'
            ],
            actionLabel: 'SIT DOWN'
          }
        });
      });

      // 4. Emergency Stop Plunger (ESP) on structural column
      const espBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.28, 0.12),
        this.emergencyRedMat
      );
      espBox.position.set(-0.5, floorY + 1.4, -10.46);
      this.group.add(espBox);

      this.interactables.push({
        id: `esp-${pl.id}`,
        name: 'Emergency Stop Plunger (ESP)',
        actionText: 'Emergency Stop Plunger (ESP)',
        position: new THREE.Vector3(-0.5, floorY + 1.4, -9.5),
        radius: 2.0,
        levelId: pl.id,
        type: 'emergency_sos',
        details: {
          title: 'Emergency Stop Plunger (ESP)',
          subtitle: 'Track Emergency Traction Power Cutoff',
          description: 'Emergency button located on platform columns. Activating cuts traction power to the track section and triggers emergency braking on approaching trains.',
          bulletPoints: [
            'SAFETY RULE: Operational use only during life-safety hazards',
            'Action: Instantly halts approaching trains in block',
            'Connected to: Station Control Room (SCR) & OCC'
          ],
          actionLabel: 'INSPECT PROCEDURE'
        }
      });
    });
  }

  /**
   * Security Checkpoint: DFMD (Door Frame Metal Detector) & Baggage X-Ray
   */
  private buildSecurityCheckpoints() {
    const concY = depthToWorldY(10.16);

    // Door Frame Metal Detector (DFMD) at concourse entry Z = -45
    [-1.2, 1.2].forEach((dx) => {
      // Left and right pillars
      [-0.45, 0.45].forEach((px) => {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 2.2, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
        );
        pillar.position.set(dx + px, concY + 1.1, -45);
        this.group.add(pillar);
      });

      // Top control bar
      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.02, 0.18, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      topBar.position.set(dx, concY + 2.15, -45);
      this.group.add(topBar);

      // Status LED
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.05, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      led.position.set(dx, concY + 2.15, -44.74);
      this.group.add(led);
    });

    // Baggage X-Ray Scanner Machine between metal detectors
    const xray = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.3, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.3 })
    );
    xray.position.set(3.2, concY + 0.65, -45);
    this.group.add(xray);

    // Conveyor belt
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.1, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 })
    );
    belt.position.set(3.2, concY + 0.7, -45);
    this.group.add(belt);
  }

  /**
   * Bilingual Overhead Directional Signage ("SADAR BAZAR / सदर बाज़ार", etc.)
   */
  private buildWayfindingSignage() {
    const concY = depthToWorldY(10.16);

    // 1. Station Name Master Sign
    const signTex = createSignTexture('SADAR BAZAR', 'सदर बाज़ार', '#0284c7', '#ffffff', '#38bdf8');
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });

    [-50, 50].forEach((sz) => {
      const nameSign = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 1.2, 0.08),
        signMat
      );
      nameSign.position.set(0, concY + 3.2, sz);
      this.group.add(nameSign);

      // Suspension cables
      [-2.0, 2.0].forEach((sx) => {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8),
          this.stainlessMat
        );
        cable.position.set(sx, concY + 4.1, sz);
        this.group.add(cable);
      });
    });

    // 2. Wayfinding Egress Signs ("WAY OUT / EXIT", "LIFTS TO PLATFORM")
    const exitTex = createSignTexture('WAY OUT / EXIT 1 & 2', 'निकास 1 और 2', '#166534', '#ffffff', '#22c55e');
    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.8, 0.06),
      new THREE.MeshBasicMaterial({ map: exitTex, side: THREE.DoubleSide })
    );
    exitSign.position.set(0, concY + 3.0, -10);
    this.group.add(exitSign);

    // Interactive Map Board at Concourse
    this.interactables.push({
      id: 'map-concourse',
      name: 'Delhi Metro Station & Network Map',
      actionText: 'View Delhi Metro Station Map',
      position: new THREE.Vector3(0, concY + 1.2, -12),
      radius: 2.8,
      levelId: 'concourse',
      type: 'map',
      details: {
        title: 'Delhi Metro Phase IV Network Directory',
        subtitle: 'Sadar Bazar Station (Underground Interchange)',
        description: 'Comprehensive line map showing Phase IV network connections, feeder buses, and barrier-free accessible pathways.',
        bulletPoints: [
          'Line Alignment: Janakpuri West - R.K. Ashram Marg Corridor',
          'Platform 1 (L2): Upper Line towards Janakpuri West',
          'Platform 2 (L4): Deep Stacked Lower Line towards R.K. Ashram Marg',
          'Interchange Connections: Red Line (Pul Bangash), Yellow Line (New Delhi / Chawri Bazar)'
        ],
        actionLabel: 'EXPAND DIRECTORY'
      }
    });
  }

  /**
   * Toggles fare gate flap open/closed state
   */
  public toggleFareGates(open?: boolean): boolean {
    this.fareGatesOpen = open !== undefined ? open : !this.fareGatesOpen;
    this.fareGateFlaps.forEach((flap) => {
      flap.scale.x = this.fareGatesOpen ? 0.05 : 1.0;
    });
    return this.fareGatesOpen;
  }
}
