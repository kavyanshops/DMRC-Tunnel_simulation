import * as THREE from 'three';
import { depthToWorldY } from '../data/stationSpec';
import { AssumedTagMarker } from './AssumedTagMarker';

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

    // 1. Staircase 1: Concourse (-10.16) to Upper Platform (-16.31)
    // Run: Z from -8 to +8 (16m run for 6.15m rise)
    const s1 = {
      id: 'stair-conc-to-uplat',
      name: 'Stairs: Concourse to Upper Platform',
      fromLevel: 'concourse',
      toLevel: 'upper_platform',
      bounds: {
        xMin: -2.8,
        xMax: -0.2,
        zTop: -8,
        zBottom: 8,
        yTop: depthToWorldY(10.16),
        yBottom: depthToWorldY(16.31)
      }
    };
    this.stairs.push(s1);
    this.createStairFlight(s1, stepTreadMat, stepNosingMat, handrailMat, glassBalustradeMat);

    // Dedicated Stair 1 overhead downlight
    const s1Light = new THREE.PointLight(0xffffff, 2.0, 22);
    s1Light.position.set(-1.5, depthToWorldY(10.16) - 1.5, 0);
    this.stairsGroup.add(s1Light);

    // 2. Staircase 2: Upper Platform (-16.31) to Intermediate Plant (-24.46)
    // Run: Z from 18 to 36 (18m run for 8.15m rise)
    const s2 = {
      id: 'stair-uplat-to-int',
      name: 'Stairs: Upper Platform to Intermediate Plant',
      fromLevel: 'upper_platform',
      toLevel: 'intermediate',
      bounds: {
        xMin: -2.8,
        xMax: -0.2,
        zTop: 18,
        zBottom: 36,
        yTop: depthToWorldY(16.31),
        yBottom: depthToWorldY(24.46)
      }
    };
    this.stairs.push(s2);
    this.createStairFlight(s2, stepTreadMat, stepNosingMat, handrailMat, glassBalustradeMat);

    // Dedicated Stair 2 downlight
    const s2Light = new THREE.PointLight(0xffffff, 2.0, 24);
    s2Light.position.set(-1.5, depthToWorldY(16.31) - 2.5, 27);
    this.stairsGroup.add(s2Light);

    // 3. Staircase 3: Intermediate Plant (-24.46) to Lower Platform (-31.01)
    // Run: Z from -18 to -34 (16m run for 6.55m rise)
    const s3 = {
      id: 'stair-int-to-lplat',
      name: 'Stairs: Intermediate to Lower Platform',
      fromLevel: 'intermediate',
      toLevel: 'lower_platform',
      bounds: {
        xMin: -2.8,
        xMax: -0.2,
        zTop: -18,
        zBottom: -34,
        yTop: depthToWorldY(24.46),
        yBottom: depthToWorldY(31.01)
      }
    };
    this.stairs.push(s3);
    this.createStairFlight(s3, stepTreadMat, stepNosingMat, handrailMat, glassBalustradeMat);

    // Dedicated Stair 3 downlight
    const s3Light = new THREE.PointLight(0xffffff, 2.0, 22);
    s3Light.position.set(-1.5, depthToWorldY(24.46) - 2.0, -26);
    this.stairsGroup.add(s3Light);

    // Concourse floor safety balustrade surrounding Stair 1 void
    this.buildStairwellPerimeterBalustrade(handrailMat, glassBalustradeMat);

    // Overhead illuminated wayfinding sign at Concourse top landing
    this.buildStairwayOverheadSign();

    // Tag stairs as ASSUMED layout
    const tag = AssumedTagMarker.createTag('ASSUMED: STAIRWAYS', 'Circulation flight placement estimated');
    tag.position.set(-1.5, depthToWorldY(10.16) + 2.5, 0);
    this.stairsGroup.add(tag);
  }

  /**
   * Concourse perimeter safety balustrade surrounding the Stair 1 opening
   */
  private buildStairwellPerimeterBalustrade(
    railMat: THREE.Material,
    glassMat: THREE.Material
  ) {
    const concY = depthToWorldY(10.16);
    const railHeight = 1.05;

    // East side railing along X = 0.0 (from Z = -8.2 to 8.2)
    const eastGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 16.4), glassMat);
    eastGlass.position.set(0.0, concY + 0.45, 0);
    this.stairsGroup.add(eastGlass);

    const eastRail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 16.4, 8), railMat);
    eastRail.rotation.x = Math.PI / 2;
    eastRail.position.set(0.0, concY + railHeight, 0);
    this.stairsGroup.add(eastRail);

    // South end railing along Z = 8.2 (from X = -2.8 to 0.0)
    const southGlass = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.04), glassMat);
    southGlass.position.set(-1.4, concY + 0.45, 8.2);
    this.stairsGroup.add(southGlass);

    const southRail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.8, 8), railMat);
    southRail.rotation.z = Math.PI / 2;
    southRail.position.set(-1.4, concY + railHeight, 8.2);
    this.stairsGroup.add(southRail);

    // Yellow tactile warning strip at the top approach landing (Z = -8.8 to -8.2)
    const tactileMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const approachTactile = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.6), tactileMat);
    approachTactile.position.set(-1.5, concY + 0.01, -8.6);
    this.stairsGroup.add(approachTactile);
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
    signBox.position.set(-1.5, concY + 2.7, -8.5);
    this.stairsGroup.add(signBox);

    // Glowing face
    const signFace = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.45, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    signFace.position.set(-1.5, concY + 2.7, -8.45);
    this.stairsGroup.add(signFace);

    // Suspension rods
    [-1.0, 1.0].forEach((rx) => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9 })
      );
      rod.position.set(-1.5 + rx, concY + 3.3, -8.5);
      this.stairsGroup.add(rod);
    });
  }

  private createStairFlight(
    stair: StairDefinition,
    stepMat: THREE.Material,
    nosingMat: THREE.Material,
    railMat: THREE.Material,
    glassMat: THREE.Material
  ) {
    const { xMin, xMax, zTop, zBottom, yTop, yBottom } = stair.bounds;
    const width = xMax - xMin;
    const length = Math.abs(zBottom - zTop);
    const height = yTop - yBottom;
    const centerX = (xMin + xMax) / 2;

    const numSteps = 24;
    const stepLength = length / numSteps;
    const stepHeight = height / numSteps;
    const zDirection = zBottom > zTop ? 1 : -1;

    // Steps with high-contrast nosing stripes
    for (let i = 0; i < numSteps; i++) {
      // Step tread
      const stepGeom = new THREE.BoxGeometry(width, stepHeight, stepLength);
      const step = new THREE.Mesh(stepGeom, stepMat);
      const curZ = zTop + (i + 0.5) * stepLength * zDirection;
      const curY = yTop - (i + 0.5) * stepHeight;
      step.position.set(centerX, curY, curZ);
      step.receiveShadow = true;
      this.stairsGroup.add(step);

      // Yellow high-contrast safety nosing strip on forward edge of each step
      const nosingGeom = new THREE.BoxGeometry(width - 0.02, 0.025, 0.07);
      const nosing = new THREE.Mesh(nosingGeom, nosingMat);
      const nosingZ = curZ + (stepLength / 2 - 0.035) * zDirection;
      nosing.position.set(centerX, curY + stepHeight / 2 + 0.012, nosingZ);
      this.stairsGroup.add(nosing);
    }

    // Inclined ramp base under steps (clean solid architectural finish)
    const rampLength = Math.hypot(length, height);
    const rampAngle = Math.atan2(height, length);
    const rampGeom = new THREE.BoxGeometry(width, 0.2, rampLength);
    const ramp = new THREE.Mesh(rampGeom, stepMat);
    ramp.position.set(centerX, (yTop + yBottom) / 2 - 0.25, (zTop + zBottom) / 2);
    ramp.rotation.x = zDirection * rampAngle;
    this.stairsGroup.add(ramp);

    // Handrails and glass balustrades on both sides
    [-width / 2 + 0.05, width / 2 - 0.05].forEach((offset) => {
      // Top handrail tube
      const railGeom = new THREE.CylinderGeometry(0.04, 0.04, rampLength, 8);
      const rail = new THREE.Mesh(railGeom, railMat);
      rail.position.set(centerX + offset, (yTop + yBottom) / 2 + 0.9, (zTop + zBottom) / 2);
      rail.rotation.x = Math.PI / 2 + zDirection * rampAngle;
      this.stairsGroup.add(rail);

      // Glass balustrade panel running along the flight
      const glassGeom = new THREE.BoxGeometry(0.02, 0.8, rampLength);
      const glass = new THREE.Mesh(glassGeom, glassMat);
      glass.position.set(centerX + offset, (yTop + yBottom) / 2 + 0.45, (zTop + zBottom) / 2);
      glass.rotation.x = zDirection * rampAngle;
      this.stairsGroup.add(glass);

      // Vertical stainless steel posts every 3 metres
      for (let z = Math.min(zTop, zBottom); z <= Math.max(zTop, zBottom); z += 3) {
        const t = (z - zTop) / (zBottom - zTop);
        const y = yTop - t * height;
        const postGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8);
        const post = new THREE.Mesh(postGeom, railMat);
        post.position.set(centerX + offset, y + 0.45, z);
        this.stairsGroup.add(post);
      }
    });
  }

  /**
   * Builds the glass & steel Elevator Shaft spanning Concourse down to Lower Platform
   */
  private buildElevatorShaft() {
    const shaftX = -4.5;
    const shaftZ = -2.0;
    const shaftW = 2.4;
    const shaftL = 2.4;
    const topY = depthToWorldY(10.16) + 3.0;
    const bottomY = depthToWorldY(31.01);
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

    // Floating tag
    const liftTag = AssumedTagMarker.createTag('ASSUMED: LIFT SHAFT', 'Transit elevator location estimated');
    liftTag.position.set(shaftX, topY + 0.5, shaftZ);
    this.elevatorGroup.add(liftTag);
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

    const psdTag = AssumedTagMarker.createTag('ASSUMED: FULL-HEIGHT PSDs', 'Platform screen door standard design');
    psdTag.position.set(psdX, depthToWorldY(16.31) + 3.0, 0);
    this.psdGroup.add(psdTag);
  }

  /**
   * Directional and Wayfinding Signage
   */
  private buildSignage() {
    const signMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Concourse overhead sign
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 0.1), signMat);
    signBox.position.set(-1.5, depthToWorldY(10.16) + 3.2, -6);
    this.signageGroup.add(signBox);

    // Indicator stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.06, 0.12), textMat);
    stripe.position.set(-1.5, depthToWorldY(10.16) + 2.95, -6);
    this.signageGroup.add(stripe);
  }
}
