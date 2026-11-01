import * as THREE from 'three';
import { depthToWorldY } from '../data/stationSpec';
import { LIFT, LEVEL_Y, STAIRS, STAIR_X, stairCells, slabForLevel, type StairLayout } from '../data/stationLayout';

export interface StairDefinition {
  id: string;
  name: string;
  fromLevel: string;
  toLevel: string;
  bounds: {
    xMin: number;
    xMax: number;
    zTop: number;
    zBottom: number;
    yTop: number;
    yBottom: number;
  };
}

export interface ElevatorLevelCall {
  levelId: string;
  name: string;
  yFloor: number;
  depth: number;
}

export class CirculationBuilder {
  public group: THREE.Group;
  public stairsGroup: THREE.Group;
  public elevatorGroup: THREE.Group;
  public psdGroup: THREE.Group;
  public signageGroup: THREE.Group;

  // Animated elevator cabin and doors
  public elevatorCabin: THREE.Group;
  public elevatorDoorLeft: THREE.Mesh;
  public elevatorDoorRight: THREE.Mesh;

  // Stair specifications for player collision & physics
  public stairs: StairDefinition[] = [];

  // Elevator level stops
  public elevatorStops: ElevatorLevelCall[] = [
    { levelId: 'concourse', name: 'Concourse (L1)', yFloor: depthToWorldY(10.16), depth: 10.16 },
    { levelId: 'upper_platform', name: 'Upper Platform (L2)', yFloor: depthToWorldY(16.31), depth: 16.31 },
    { levelId: 'intermediate', name: 'Intermediate Plant (L3)', yFloor: depthToWorldY(24.46), depth: 24.46 },
    { levelId: 'lower_platform', name: 'Lower Platform (L4)', yFloor: depthToWorldY(31.01), depth: 31.01 },
  ];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CirculationSystem';

    this.stairsGroup = new THREE.Group();
    this.stairsGroup.name = 'StairsAndEscalators';

    this.elevatorGroup = new THREE.Group();
    this.elevatorGroup.name = 'ElevatorShaft';

    this.psdGroup = new THREE.Group();
    this.psdGroup.name = 'PlatformScreenDoors';

    this.signageGroup = new THREE.Group();
    this.signageGroup.name = 'WayfindingSignage';

    this.group.add(this.stairsGroup);
    this.group.add(this.elevatorGroup);
    this.group.add(this.psdGroup);
    this.group.add(this.signageGroup);

    // Initialize elevator cabin placeholders
    this.elevatorCabin = new THREE.Group();
    this.elevatorCabin.name = 'ElevatorCabin';
    const dummyMat = new THREE.MeshBasicMaterial();
    this.elevatorDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), dummyMat);
    this.elevatorDoorRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), dummyMat);

    this.buildStairs();
    this.buildElevatorShaft();
    this.buildPlatformScreenDoors();
    this.buildSignage();
  }

  /**
   * Builds the 3 staircases connecting the 4 primary levels
   */
  private buildStairs() {
    // High-visibility materials for realistic architectural metro stairs
    const stepTreadMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Clean light granite
      roughness: 0.35,
      metalness: 0.1
    });

    const stepNosingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // High-contrast amber/yellow safety edge nosing
      roughness: 0.3,
      metalness: 0.2
    });

    const handrailMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Bright polished stainless steel
      roughness: 0.15,
      metalness: 0.95
    });

    const glassBalustradeMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.7
    });

    // Stairs come from the layout manifest (width, position, step count with riser <= 0.18 m)
    const nosingCount = STAIRS.reduce((total, layout) => total + layout.steps, 0);
    const nosings = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.025, 0.07),
      stepNosingMat,
      nosingCount
    );
    nosings.name = 'Stair safety nosings';
    let nosingIndex = 0;

    for (const layout of STAIRS) {
      const def: StairDefinition = {
        id: layout.id,
        name: layout.name,
        fromLevel: layout.fromLevel,
        toLevel: layout.toLevel,
        bounds: { xMin: layout.xMin, xMax: layout.xMax, zTop: layout.zTop, zBottom: layout.zBottom, yTop: layout.yTop, yBottom: layout.yBottom },
      };
      this.stairs.push(def);
      this.createStairFlight(layout, stepTreadMat, handrailMat, glassBalustradeMat, nosings, () => nosingIndex++);

      // Dedicated downlight over the flight
      const light = new THREE.PointLight(0xffffff, 2.0, 24);
      light.position.set((layout.xMin + layout.xMax) / 2, Math.max(layout.yTop, layout.yBottom) - 1.5 - (layout.yTop - layout.yBottom) / 2 + 1.5, (layout.zTop + layout.zBottom) / 2);
      this.stairsGroup.add(light);
    }
    nosings.instanceMatrix.needsUpdate = true;
    this.stairsGroup.add(nosings);

    // Concourse floor safety balustrade surrounding Stair 1 void
    this.buildStairOpeningGuards(handrailMat, glassBalustradeMat);

    // Overhead illuminated wayfinding sign at Concourse top landing
    this.buildStairwayOverheadSign();

  }

  /**
   * Guard rails around each stair opening in the slab the flight starts from (open edge = the stair head),
   * plus a tactile warning strip on the approach.
   */
  private buildStairOpeningGuards(railMat: THREE.Material, glassMat: THREE.Material) {
    const tactileMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const railHeight = 1.05;
    for (const s of STAIRS) {
      const slab = slabForLevel(s.fromLevel);
      const o = slab.openings.find((op) => op.id.startsWith(s.id));
      if (!o) continue;
      const dir = Math.sign(s.zBottom - s.zTop);
      const y = slab.top;
      const len = o.z1 - o.z0, zc = (o.z0 + o.z1) / 2;
      // west + east guards along the opening
      [o.x0, o.x1].forEach((gx) => {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, len), glassMat);
        glass.position.set(gx, y + 0.45, zc);
        this.stairsGroup.add(glass);
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), railMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.set(gx, y + railHeight, zc);
        this.stairsGroup.add(rail);
      });
      // far-end guard
      const zFar = dir > 0 ? o.z1 : o.z0;
      const w = o.x1 - o.x0;
      const endGlass = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.04), glassMat);
      endGlass.position.set((o.x0 + o.x1) / 2, y + 0.45, zFar);
      this.stairsGroup.add(endGlass);
      const endRail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, w, 8), railMat);
      endRail.rotation.z = Math.PI / 2;
      endRail.position.set((o.x0 + o.x1) / 2, y + railHeight, zFar);
      this.stairsGroup.add(endRail);
      // tactile warning strip on the approach to the stair head
      const tactile = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, 0.6), tactileMat);
      tactile.position.set((o.x0 + o.x1) / 2, y + 0.01, s.zTop - dir * 0.6);
      this.stairsGroup.add(tactile);
    }
  }

  /**
   * Overhead illuminated wayfinding sign for the stairs
   */
  private buildStairwayOverheadSign() {
    const concY = depthToWorldY(10.16);

    // Suspended sign board directly above the entrance to Stair 1
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.6, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 })
    );
    signBox.position.set(((STAIR_X.min + STAIR_X.max) / 2), concY + 2.7, -8.5);
    this.stairsGroup.add(signBox);

    // Glowing face
    const signFace = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.45, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    signFace.position.set(((STAIR_X.min + STAIR_X.max) / 2), concY + 2.7, -8.45);
    this.stairsGroup.add(signFace);

    // Suspension rods
    [-1.0, 1.0].forEach((rx) => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9 })
      );
      rod.position.set(((STAIR_X.min + STAIR_X.max) / 2) + rx, concY + 3.3, -8.5);
      this.stairsGroup.add(rod);
    });
  }

  private createStairFlight(
    stair: StairLayout,
    stepMat: THREE.Material,
    railMat: THREE.Material,
    glassMat: THREE.Material,
    nosings: THREE.InstancedMesh,
    nextNosingIndex: () => number
  ) {
    const { xMin, xMax, zTop, zBottom, yTop, yBottom } = stair;
    const width = xMax - xMin;
    const length = Math.abs(zBottom - zTop);
    const height = yTop - yBottom;
    const centerX = (xMin + xMax) / 2;
    const zDirection = zBottom > zTop ? 1 : -1;

    // Folded-plate steps: each tread is a block down to its soffit; where the space beneath has under
    // 2.2 m headroom the block runs down to the landing floor (solid under-stair, not walkable).
    for (const c of stairCells(stair)) {
      const stepGeom = new THREE.BoxGeometry(width, c.top - c.bottom, c.zB - c.zA);
      const step = new THREE.Mesh(stepGeom, stepMat);
      step.name = `${stair.id} step ${c.i}`;
      step.position.set(centerX, (c.top + c.bottom) / 2, (c.zA + c.zB) / 2);
      step.receiveShadow = true;
      this.stairsGroup.add(step);

      const forwardZ = zDirection > 0 ? c.zB : c.zA;
      const nosingMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(centerX, c.top + 0.0125, forwardZ - zDirection * 0.035),
        new THREE.Quaternion(),
        new THREE.Vector3(width - 0.02, 1, 1)
      );
      nosings.setMatrixAt(nextNosingIndex(), nosingMatrix);
    }

    const rampLength = Math.hypot(length, height);
    const rampAngle = Math.atan2(height, length);

    // Handrails and glass balustrades on both sides
    [-width / 2 + 0.05, width / 2 - 0.05].forEach((offset) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, rampLength, 8), railMat);
      rail.position.set(centerX + offset, (yTop + yBottom) / 2 + 0.9, (zTop + zBottom) / 2);
      rail.rotation.x = Math.PI / 2 + zDirection * rampAngle;
      this.stairsGroup.add(rail);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, rampLength), glassMat);
      glass.position.set(centerX + offset, (yTop + yBottom) / 2 + 0.45, (zTop + zBottom) / 2);
      glass.rotation.x = zDirection * rampAngle;
      this.stairsGroup.add(glass);

      for (let z = Math.min(zTop, zBottom); z <= Math.max(zTop, zBottom); z += 3) {
        const t = (z - zTop) / (zBottom - zTop);
        const y = yTop - t * height;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), railMat);
        post.position.set(centerX + offset, y + 0.45, z);
        this.stairsGroup.add(post);
      }
    });
  }

  /**
   * Builds the glass & steel Elevator Shaft spanning Concourse down to Lower Platform
   */
  private buildElevatorShaft() {
    const shaftX = LIFT.cx;
    const shaftZ = LIFT.cz;
    const shaftW = LIFT.w;
    const shaftL = LIFT.l;
    const topY = LEVEL_Y.concourse + 3.0;
    const bottomY = LEVEL_Y.lower_platform;
    const shaftHeight = topY - bottomY;

    // Glass Shaft Enclosure
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.5
    });

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    // 4 Corner structural steel posts
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dz]) => {
      const colGeom = new THREE.BoxGeometry(0.12, shaftHeight, 0.12);
      const col = new THREE.Mesh(colGeom, frameMat);
      col.position.set(shaftX + (dx * shaftW) / 2, (topY + bottomY) / 2, shaftZ + (dz * shaftL) / 2);
      this.elevatorGroup.add(col);
    });

    // Glass panels on 3 sides (front door side is open for doors)
    // Left side
    const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, shaftHeight, shaftL), glassMat);
    leftGlass.position.set(shaftX - shaftW / 2, (topY + bottomY) / 2, shaftZ);
    this.elevatorGroup.add(leftGlass);

    // Right side
    const rightGlass = leftGlass.clone();
    rightGlass.position.x = shaftX + shaftW / 2;
    this.elevatorGroup.add(rightGlass);

    // Back side
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(shaftW, shaftHeight, 0.02), glassMat);
    backGlass.position.set(shaftX, (topY + bottomY) / 2, shaftZ - shaftL / 2);
    this.elevatorGroup.add(backGlass);

    // Landing door frames at each floor stop
    this.elevatorStops.forEach((stop) => {
      const landingFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 0.1), frameMat);
      landingFrame.position.set(shaftX, stop.yFloor + 1.15, shaftZ + shaftL / 2);
      this.elevatorGroup.add(landingFrame);

      // Floor call button panel on outer wall
      const btnGeom = new THREE.BoxGeometry(0.15, 0.35, 0.04);
      const btnMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
      const btn = new THREE.Mesh(btnGeom, btnMat);
      btn.position.set(shaftX + 1.0, stop.yFloor + 1.2, shaftZ + shaftL / 2 + 0.05);
      this.elevatorGroup.add(btn);
    });

    // Animated Elevator Cabin
    this.elevatorCabin = new THREE.Group();
    this.elevatorCabin.name = 'ElevatorCabin';
    this.elevatorCabin.position.set(shaftX, this.elevatorStops[0].yFloor, shaftZ);

    const cabinFloorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const cabinWallMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });
    const cabinCeilMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });

    // Cabin floor (2.0m x 2.0m)
    const cFloor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 2.0), cabinFloorMat);
    cFloor.position.set(0, 0.05, 0);
    this.elevatorCabin.add(cFloor);

    // Cabin ceiling with integrated recessed LED light
    const cCeil = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 2.0), cabinCeilMat);
    cCeil.position.set(0, 2.45, 0);
    this.elevatorCabin.add(cCeil);

    const cabinLight = new THREE.PointLight(0xffffff, 1.2, 5);
    cabinLight.position.set(0, 2.3, 0);
    this.elevatorCabin.add(cabinLight);

    // Cabin back and side walls
    const cBack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.05), cabinWallMat);
    cBack.position.set(0, 1.2, -0.975);
    this.elevatorCabin.add(cBack);

    const cLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 2.0), cabinWallMat);
    cLeft.position.set(-0.975, 1.2, 0);
    this.elevatorCabin.add(cLeft);

    const cRight = cLeft.clone();
    cRight.position.x = 0.975;
    this.elevatorCabin.add(cRight);

    // Sliding doors
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    this.elevatorDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.2, 0.04), doorMat);
    this.elevatorDoorLeft.position.set(-0.3, 1.15, 0.98);
    this.elevatorCabin.add(this.elevatorDoorLeft);

    this.elevatorDoorRight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.2, 0.04), doorMat);
    this.elevatorDoorRight.position.set(0.3, 1.15, 0.98);
    this.elevatorCabin.add(this.elevatorDoorRight);

    // Internal control panel
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 0.3), panelMat);
    panel.position.set(0.96, 1.2, 0.3);
    this.elevatorCabin.add(panel);

    this.elevatorGroup.add(this.elevatorCabin);

  }

  /**
   * Sets elevator doors open fraction (0 = closed, 1 = fully open)
   */
  public setDoorProgress(progress: number) {
    const clamped = Math.max(0, Math.min(1, progress));
    // Door width is 0.55m; open shifts left door by -0.45m, right door by +0.45m
    this.elevatorDoorLeft.position.x = -0.3 - clamped * 0.45;
    this.elevatorDoorRight.position.x = 0.3 + clamped * 0.45;
  }

  /**
   * Moves elevator cabin smoothly to a target world Y
   */
  public setCabinY(y: number) {
    this.elevatorCabin.position.y = y;
  }

  /**
   * Builds Platform Screen Doors (PSDs) along track edges
   */
  private buildPlatformScreenDoors() {
    const psdMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.2
    });
    const headerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });

    const platLen = 140;
    const psdX = 0.15; // Trackside edge of passenger platform

    [
      { y: depthToWorldY(16.31), name: 'Upper Platform PSDs' },
      { y: depthToWorldY(31.01), name: 'Lower Platform PSDs' },
    ].forEach((lvl) => {
      // Header beam running full 140m platform
      const header = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, platLen), headerMat);
      header.position.set(psdX, lvl.y + 2.15, 0);
      this.psdGroup.add(header);

      // Glass panels and mullion posts
      for (let z = -platLen / 2; z < platLen / 2; z += 3.5) {
        // Vertical post
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.08), postMat);
        post.position.set(psdX, lvl.y + 1.0, z);
        this.psdGroup.add(post);

        // Glass panel
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.9, 3.4), psdMat);
        glass.position.set(psdX, lvl.y + 1.0, z + 1.75);
        this.psdGroup.add(glass);
      }
    });

  }

  /**
   * Directional and Wayfinding Signage
   */
  private buildSignage() {
    const signMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Concourse overhead sign
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 0.1), signMat);
    signBox.position.set(((STAIR_X.min + STAIR_X.max) / 2), depthToWorldY(10.16) + 3.2, -6);
    this.signageGroup.add(signBox);

    // Indicator stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.06, 0.12), textMat);
    stripe.position.set(((STAIR_X.min + STAIR_X.max) / 2), depthToWorldY(10.16) + 2.95, -6);
    this.signageGroup.add(stripe);
  }
}
