import * as THREE from 'three';
import { depthToWorldY, STATION_SPEC } from '../data/stationSpec';
import { AFC_LINE, BENCH_X, BENCH_Z, ESP, EXIT_SIGN_Z, FINISH, MAP_BOARD, NAME_SIGN_Z, PIDS, PLATFORM, platformRect, range, rectsOverlap, slabById, slabForLevel, splitRun, subtractRects, type Rect } from '../data/stationLayout';

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
      ctx.lineTo(i, 512);
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
  texture.repeat.set(1, 1); // tile scale is applied per floor piece via UVs (see StationInterior.addFloorPieces)
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

  /** Horizontal plane piece (floor finish or ceiling) with tile-scaled UVs. */
  private addPlane(r: Rect, y: number, mat: THREE.Material, up: boolean, tile = 1.43, receive = false) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
    m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
    m.receiveShadow = receive;
    this.group.add(m);
    return m;
  }

  /** Suspended ceilings and baffles. Ceilings carry the same openings as the slab above them. */
  private buildCeilingBaffles() {
    const halfW = this.width / 2 - 1.0; // 5.7
    const zEnd = this.length / 2 - 2;   // 98
    const roofBottom = depthToWorldY(5.36);
    const ceilings: { y: number; openings: Rect[] }[] = [
      { y: roofBottom - 0.02, openings: [] },
      { y: depthToWorldY(10.56) - 0.02, openings: slabById('concourse').openings },
      { y: depthToWorldY(18.96) - 0.02, openings: slabById('upper_undercroft').openings },
      { y: depthToWorldY(24.91) - 0.02, openings: slabById('intermediate').openings },
    ];
    ceilings.forEach((c) => {
      subtractRects({ x0: -halfW, x1: halfW, z0: -zEnd, z1: zEnd }, c.openings).forEach((piece) => this.addPlane(piece, c.y, this.ceilingMat, false));
      // Acoustic baffles sit mid-bay (between column rows), skipped where an opening is
      for (const z of range(-95, 95, 10)) {
        const box: Rect = { x0: -halfW, x1: halfW, z0: z - 0.04, z1: z + 0.04 };
        if (c.openings.some((o) => rectsOverlap(o, box))) continue;
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.2, 0.08), this.stainlessMat);
        baffle.position.set(0, c.y - 0.12, z);
        this.group.add(baffle);
      }
    });
  }

  /** Finished floors laid 5 mm above each walking slab / deck, with the same openings as the slab. */
  private buildGraniteFloors() {
    const concourse = slabForLevel('concourse');
    const intermediate = slabForLevel('intermediate');
    const wide: Rect = { x0: FINISH.x0, x1: FINISH.x1, z0: -FINISH.zEnd, z1: FINISH.zEnd };
    const floors: { slab: typeof concourse; rect: Rect }[] = [
      { slab: concourse, rect: wide },
      { slab: slabForLevel('upper_platform'), rect: platformRect() },
      { slab: intermediate, rect: wide },
      { slab: slabForLevel('lower_platform'), rect: platformRect() },
    ];
    floors.forEach(({ slab, rect }) => {
      subtractRects(rect, slab.openings).forEach((piece) => this.addPlane(piece, slab.top + 0.005, this.floorMat, true, 1.43, true));
    });

    // Continuous two-metre route between the Stair 2 foot and Stair 3 head.
    const intermediateY = slabForLevel('intermediate').top + 0.01;
    this.addPlane({ x0: 0.5, x1: 2.5, z0: -18, z1: 36 }, intermediateY, this.floorMat, true, 1.43, true);

    // Concourse tactile guide path from the north entrance to the AFC aisle (stops short of the gate line)
    const guide = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.015, 33), this.tactileMat);
    guide.position.set(0.45, concourse.top + 0.008, -50 + 16.5);
    this.group.add(guide);

    // ONE tactile strip per platform edge: 0.4 m wide, flush at the platform edge (X -0.2 .. 0.2)
    ['upper_platform', 'lower_platform'].forEach((lv) => {
      const deck = slabForLevel(lv as 'upper_platform');
      const strip = new THREE.Mesh(new THREE.BoxGeometry(PLATFORM.edgeTactile.width, 0.015, PLATFORM.halfLength * 2), this.tactileMat);
      strip.name = `${lv} edge tactile`;
      strip.position.set((PLATFORM.edgeTactile.x0 + PLATFORM.edgeTactile.x1) / 2, deck.top + 0.008, 0);
      this.group.add(strip);
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

    const ceilOpenings: Rect[][] = [
      [],
      slabById('concourse').openings,
      slabById('upper_undercroft').openings,
      slabById('intermediate').openings,
    ];
    levels.forEach((lvl, li) => {
      // Long linear glowing LED fixtures running longitudinally, broken at stair / lift openings
      [-2.5, 2.5].forEach((lx) => {
        splitRun(lx, -(this.length / 2 - 4), this.length / 2 - 4, ceilOpenings[li], 0.125).forEach(([z0, z1]) => {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, z1 - z0), ledMat);
          strip.position.set(lx, lvl.ceilY - 0.1, (z0 + z1) / 2);
          this.group.add(strip);
        });
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
        new THREE.BoxGeometry(4.2, 0.3, this.platLength + 19.6),
        this.trackBedMat
      );
      plinth.position.set(3.0, tc.railY - 0.15, 0);
      this.group.add(plinth);

      // Dual running rails (standard gauge 1435mm)
      [-0.717, 0.717].forEach((rOff) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.16, this.platLength + 19.6),
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
        new THREE.BoxGeometry(0.12, 0.14, this.platLength + 19.6),
        this.thirdRailMat
      );
      thirdRailCover.position.set(3.0 + 1.45, tc.railY + 0.18, 0);
      this.group.add(thirdRailCover);

      // Drainage channel along track center
      const drain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.08, this.platLength + 19.6),
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

    // 1. AFC Turnstile Gate Array (z from the layout manifest; off the column row)
    const gateCount = AFC_LINE.gateCount;
    const gateSpacing = AFC_LINE.spacing;
    const startX = -((gateCount - 1) * gateSpacing) / 2;

    for (let i = 0; i < gateCount; i++) {
      const gx = startX + i * gateSpacing;

      // Gate pedestal (stainless steel body)
      const ped = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.05, 1.8),
        this.stainlessMat
      );
      ped.position.set(gx, concY + 0.525, AFC_LINE.z);
      this.group.add(ped);

      // Card reader pad on top (glowing blue)
      const reader = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 0.18),
        this.screenGlowMat
      );
      reader.position.set(gx, concY + 1.06, AFC_LINE.z - 0.6);
      this.group.add(reader);

      // Status indicator light (green arrow on entry side)
      const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.04, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      indicator.position.set(gx, concY + 0.9, AFC_LINE.z - 0.91);
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
        flap.position.set(gx + gateSpacing / 2, concY + 0.65, AFC_LINE.z);
        this.group.add(flap);
        this.fareGateFlaps.push(flap);
      }
    }

    // Interactive Fare Gate entry
    this.interactables.push({
      id: 'faregate-concourse',
      name: 'AFC Smart Card Fare Gates',
      actionText: 'Tap Smart Card / Open Gate',
      position: new THREE.Vector3(0, concY + 1.0, AFC_LINE.z - 1.2),
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
      PIDS.zs.forEach((pz) => {
        const pids = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.45, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
        );
        pids.position.set(PIDS.x, floorY + 2.8, pz);
        this.group.add(pids);

        // LED Display face (Amber / Green text)
        const pidsDisplay = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.35, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        pidsDisplay.position.set(PIDS.x, floorY + 2.8, pz + 0.07);
        this.group.add(pidsDisplay);

        // Hanging suspension rods
        [-0.6, 0.6].forEach((rx) => {
          const rod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8),
            this.stainlessMat
          );
          rod.position.set(PIDS.x + rx, floorY + 3.4, pz);
          this.group.add(rod);
        });

        this.interactables.push({
          id: `pids-${pl.id}-${pz}`,
          name: `PIDS Train Display (${pl.name})`,
          actionText: 'Inspect Live Train Schedule',
          position: new THREE.Vector3(PIDS.x, floorY + 1.6, pz),
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
      BENCH_Z.forEach((bz) => {
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.45, 2.2),
          this.stainlessMat
        );
        bench.position.set(BENCH_X, floorY + 0.225, bz);
        this.group.add(bench);

        this.interactables.push({
          id: `bench-${pl.id}-${bz}`,
          name: 'Platform Transit Bench',
          actionText: 'Sit / Rest on Platform Bench',
          position: new THREE.Vector3(BENCH_X, floorY + 0.8, bz),
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
        new THREE.BoxGeometry(0.12, 0.28, 0.18),
        this.emergencyRedMat
      );
      espBox.position.set(ESP.boxX, floorY + 1.4, ESP.z);
      this.group.add(espBox);

      this.interactables.push({
        id: `esp-${pl.id}`,
        name: 'Emergency Stop Plunger (ESP)',
        actionText: 'Emergency Stop Plunger (ESP)',
        position: new THREE.Vector3(ESP.boxX, floorY + 1.4, ESP.z),
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

    NAME_SIGN_Z.forEach((sz) => {
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
    exitSign.position.set(0, concY + 3.0, EXIT_SIGN_Z);
    this.group.add(exitSign);

    // Interactive Map Board at Concourse
    this.interactables.push({
      id: 'map-concourse',
      name: 'Delhi Metro Station & Network Map',
      actionText: 'View Delhi Metro Station Map',
      position: new THREE.Vector3(MAP_BOARD.x, concY + 1.2, MAP_BOARD.z),
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
