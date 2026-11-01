import * as THREE from 'three';
import { STATION_SPEC, depthToWorldY, worldYToDepth, worldYToRL } from '../data/stationSpec';
import { AFC_LINE, COLUMNS, LIFT } from '../data/stationLayout';
import { constrainMove, levelAtY, nearestWalkable, surfaceAt } from '../scene/walkable';
import type { CirculationBuilder } from '../scene/CirculationBuilder';
import type { StationInterior, StationInteractable } from '../scene/StationInterior';

export interface PlayerTelemetry {
  levelId: string;
  levelName: string;
  depth: number;
  rl: number;
  headingDegrees: number;
  cardinal: string;
  isSprinting: boolean;
  isLocked: boolean;
  inElevator: boolean;
}

export class FirstPersonControls {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public circulationBuilder: CirculationBuilder;
  public stationInterior: StationInterior | null = null;

  // Eye height above walking floor
  public eyeHeight: number = 1.65;
  public isSitting: boolean = false;

  // Player position (feet level)
  public feetPosition: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();

  // Rotation angles (radians)
  public yaw: number = 0;
  public pitch: number = 0;
  public mouseSensitivity: number = 0.0022;

  // Movement physics
  public walkSpeed: number = 3.8;
  public sprintSpeed: number = 7.2;
  public isSprinting: boolean = false;
  public isLocked: boolean = false;
  public enabled: boolean = false;

  // Keyboard input states
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
  };

  // Active level state
  public activeLevelId: string = 'concourse';

  // Elevator interaction state
  public elevatorMoving: boolean = false;
  public elevatorDoorsOpen: boolean = true;
  public elevatorDoorProgress: number = 1.0; // 0 = closed, 1 = open
  public elevatorTargetY: number = depthToWorldY(10.16);
  public elevatorCurrentY: number = depthToWorldY(10.16);

  // Bounds
  private readonly boundsX = { min: -5.9, max: 5.9 };
  private readonly boundsZ = { min: -95.0, max: 95.0 };

  // Elevator shaft bounds
  private readonly liftBounds = {
    xMin: LIFT.cx - 1.1,
    xMax: LIFT.cx + 1.1,
    zMin: LIFT.cz - 1.1,
    zMax: LIFT.cz + 1.1,
  };

  // Interactive targeting
  public activeInteractable: StationInteractable | null = null;
  public onInteractCallback: ((interactable: StationInteractable) => void) | null = null;

  // Event handlers for clean cleanup
  private onKeyDownBound = this.onKeyDown.bind(this);
  private onKeyUpBound = this.onKeyUp.bind(this);
  private onMouseMoveBound = this.onMouseMove.bind(this);
  private onPointerLockChangeBound = this.onPointerLockChange.bind(this);

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    circulationBuilder: CirculationBuilder
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.circulationBuilder = circulationBuilder;

    // Default spawn: Concourse Level at ticket gates (L1, -10.16m depth)
    const concDef = STATION_SPEC.levels.find((l) => l.id === 'concourse')!;
    const spawnY = depthToWorldY(concDef.depthBelowGround);
    this.feetPosition = new THREE.Vector3(0, spawnY, -12.5);
    this.yaw = 0;
    this.pitch = 0;

    this.updateCameraTransform();
    this.initEvents();
  }

  public setStationInterior(interior: StationInterior) {
    this.stationInterior = interior;
  }

  private initEvents() {
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    this.unlock();
  }

  public lock() {
    if (!this.isLocked && this.enabled) {
      this.domElement.requestPointerLock();
    }
  }

  public unlock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = true;
        break;
      case 'KeyE':
        this.handleInteractKey();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (!this.enabled) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = false;
        break;
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.enabled || !this.isLocked) return;

    const dx = e.movementX || 0;
    const dy = e.movementY || 0;

    this.yaw -= dx * this.mouseSensitivity;
    this.pitch -= dy * this.mouseSensitivity;

    // Clamp vertical look angle to avoid gimbal flips (+/- 85 degrees)
    const maxPitch = 1.48;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.updateCameraTransform();
  }

  public updateCameraTransform() {
    // Rotation order: Y (yaw) then X (pitch)
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.position.set(
      this.feetPosition.x,
      this.feetPosition.y + this.eyeHeight,
      this.feetPosition.z
    );
  }

  /**
   * Fast-travel to any station level
   */
  public teleportToLevel(levelId: string) {
    const lvl = STATION_SPEC.levels.find((l) => l.id === levelId);
    if (!lvl) return;

    this.activeLevelId = levelId;
    const y = depthToWorldY(lvl.depthBelowGround);

    let x = 0;
    let z = 0;
    let newYaw = 0;

    switch (levelId) {
      case 'concourse':
        x = 0;
        z = -12.5;
        newYaw = 0;
        break;
      case 'upper_platform':
        x = -2.2;
        z = -10;
        newYaw = 0;
        break;
      case 'intermediate':
        x = -2.2;
        z = 5;
        newYaw = Math.PI;
        break;
      case 'lower_platform':
        x = -2.2;
        z = -10;
        newYaw = 0;
        break;
      case 'ground':
        x = 0;
        z = 15;
        newYaw = Math.PI;
        break;
      default:
        x = -2.2;
        z = 0;
        break;
    }

    this.feetPosition.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = newYaw;
    this.pitch = 0;
    this.updateCameraTransform();
  }

  /**
   * Main per-frame update loop with sub-stepping for physics & animation stability
   */
  public update(deltaTime: number) {
    if (!this.enabled) return;

    let remaining = Math.min(deltaTime, 2.0);
    const maxSubStep = 0.05;

    while (remaining > 0) {
      const dt = Math.min(remaining, maxSubStep);
      this.internalStep(dt);
      remaining -= dt;
    }

    // Update Active Level ID based on current elevation
    this.updateActiveLevel();

    // Check for interactive objects in range/view
    this.updateInteractables();

    // Update Camera
    this.updateCameraTransform();
  }

  private internalStep(dt: number) {
    // 1. Update Elevator Motion & Doors
    this.updateElevator(dt);

    // 2. Compute Movement Vectors
    this.isSprinting = this.keys.shift;
    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Movement direction input:
    // W (forward): +1 in forward direction
    // S (backward): -1 in forward direction
    // D (right): +1 in right direction
    // A (left): -1 in right direction
    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.z += 1;
    if (this.keys.backward) moveDir.z -= 1;
    if (this.keys.right) moveDir.x += 1;
    if (this.keys.left) moveDir.x -= 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      // Transform direction according to camera yaw (XZ plane)
      // Yaw 0 looks towards -Z
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      const targetVelocity = new THREE.Vector3();
      // forward: W pushes forward, S pushes backward
      targetVelocity.addScaledVector(forward, moveDir.z * currentSpeed);
      // right: D pushes right, A pushes left
      targetVelocity.addScaledVector(right, moveDir.x * currentSpeed);

      // Smooth horizontal velocity interpolation
      this.velocity.x += (targetVelocity.x - this.velocity.x) * 14 * dt;
      this.velocity.z += (targetVelocity.z - this.velocity.z) * 14 * dt;
    } else {
      // Damping
      this.velocity.x += (0 - this.velocity.x) * 15 * dt;
      this.velocity.z += (0 - this.velocity.z) * 15 * dt;
    }

    // 3. Propose New Position
    const proposedX = this.feetPosition.x + this.velocity.x * dt;
    const proposedZ = this.feetPosition.z + this.velocity.z * dt;

    // 3b. If something put us off the floor (teleport, library jump), step onto the nearest walkable point
    if (!this.isPlayerInElevator() && !surfaceAt(this.feetPosition.x, this.feetPosition.z, this.feetPosition.y)) {
      const n = nearestWalkable(levelAtY(this.feetPosition.y), this.feetPosition.x, this.feetPosition.z, 0.4);
      this.feetPosition.set(n.x, n.y, n.z);
    }

    // 4. Collision resolution against walls, columns, elevator, PSD, and boundaries
    const resolved = this.resolveCollisions(proposedX, proposedZ);
    this.feetPosition.x = resolved.x;
    this.feetPosition.z = resolved.z;

    // 5. Vertical Floor Snapping / Stairs / Elevator
    const inElevator = this.isPlayerInElevator();
    if (inElevator) {
      // Player vertical position is locked to elevator cabin floor
      this.feetPosition.y = this.elevatorCurrentY;
    } else {
      // Check stairs or floor slabs
      const floorY = this.computeFloorHeightAt(this.feetPosition.x, this.feetPosition.z);
      // Smooth step climbing
      this.feetPosition.y += (floorY - this.feetPosition.y) * 20 * dt;
    }
  }

  /**
   * Collision resolution against physical obstacles
   */
  private resolveCollisions(newX: number, newZ: number): { x: number; z: number } {
    let x = newX;
    let z = newZ;

    // A. Outer Station Box Boundary Clamping
    x = Math.max(this.boundsX.min, Math.min(this.boundsX.max, x));
    z = Math.max(this.boundsZ.min, Math.min(this.boundsZ.max, z));

    // B. Is the player actually ON a stair surface (not merely under or above one)?
    const isOnStairs = surfaceAt(x, z, this.feetPosition.y)?.kind === 'stair';

    if (!isOnStairs) {
      // C. Reinforced Concrete Columns Collision (Cylinders on the layout manifest grid)
      const colRadius = COLUMNS.radius;
      const playerRadius = 0.35;
      const minDist = colRadius + playerRadius; // 0.80m

      for (const cz of COLUMNS.zs) {
        const dx = x - COLUMNS.x;
        const dz = z - cz;
        const dist = Math.hypot(dx, dz);
        if (dist < minDist && dist > 0.0001) {
          const push = minDist - dist;
          x += (dx / dist) * push;
          z += (dz / dist) * push;
        }
      }

      // D. Elevator Shaft Collision (when outside)
      const insideElevator = this.isPlayerInElevator();
      if (!insideElevator) {
        const lb = this.liftBounds;
        const isDoorOpen = this.elevatorDoorsOpen && this.elevatorDoorProgress > 0.6;
        const approachingDoor = x >= LIFT.cx - 0.3 && x <= LIFT.cx + 0.3 && z >= LIFT.cz + 0.8 && z <= LIFT.cz + 1.3;

        // If not entering through open door, prevent entering shaft
        if (!(isDoorOpen && approachingDoor)) {
          if (x > lb.xMin - 0.3 && x < lb.xMax + 0.3 && z > lb.zMin - 0.3 && z < lb.zMax + 0.3) {
            // Push outside shaft along closest edge
            const dLeft = Math.abs(x - (lb.xMin - 0.3));
            const dRight = Math.abs(x - (lb.xMax + 0.3));
            const dTop = Math.abs(z - (lb.zMin - 0.3));
            const dBottom = Math.abs(z - (lb.zMax + 0.3));
            const minEdge = Math.min(dLeft, dRight, dTop, dBottom);

            if (minEdge === dLeft) x = lb.xMin - 0.3;
            else if (minEdge === dRight) x = lb.xMax + 0.3;
            else if (minEdge === dTop) z = lb.zMin - 0.3;
            else z = lb.zMax + 0.3;
          }
        }
      } else {
        // Player inside elevator: clamp within cabin walls
        // Doors open and lined up with them: allow stepping out onto the lobby threshold
        const doorOpen = this.elevatorDoorsOpen && this.elevatorDoorProgress > 0.6 && Math.abs(x - LIFT.cx) < 0.45;
        x = Math.max(LIFT.cx - 0.8, Math.min(LIFT.cx + 0.8, x));
        z = Math.max(LIFT.cz - 0.85, Math.min(LIFT.cz + (doorOpen ? 1.4 : 0.85), z));
      }

      // E. Platform Screen Doors (PSD) barrier on platform levels
      // Platform deck is on the west side (x <= 0.1). Track is at x > 0.2.
      // PSD prevents falling onto track bed unless on intermediate/concourse
      if (this.activeLevelId === 'upper_platform' || this.activeLevelId === 'lower_platform') {
        if (z >= -70 && z <= 70) {
          if (x > 0.1) {
            x = 0.1; // Collide with Platform Screen Door glass
          }
        }
      }

      // F. Concourse Fare Gates Barrier at the AFC line (layout manifest)
      if (this.activeLevelId === 'concourse' && this.stationInterior && !this.stationInterior.fareGatesOpen) {
        if (x >= -AFC_LINE.halfSpan && x <= AFC_LINE.halfSpan) {
          const zu = AFC_LINE.z - 0.8, zp = AFC_LINE.z + 0.8;
          if (this.feetPosition.z <= zu && z > zu) {
            z = zu; // Blocked on unpaid side
          } else if (this.feetPosition.z >= zp && z < zp) {
            z = zp; // Blocked on paid side
          }
        }
      }
    }

    // G. Never leave the walkable floor / stair surface (voids, under-stair mass, past the platform ends)
    const lb2 = this.liftBounds;
    const inLiftBox = x >= lb2.xMin && x <= lb2.xMax && z >= lb2.zMin && z <= lb2.zMax;
    if (!inLiftBox) {
      const c = constrainMove(this.feetPosition.x, this.feetPosition.z, x, z, this.feetPosition.y);
      x = c.x;
      z = c.z;
    }

    return { x, z };
  }

  public isPlayerInElevator(): boolean {
    const x = this.feetPosition.x;
    const z = this.feetPosition.z;
    return (
      x >= this.liftBounds.xMin &&
      x <= this.liftBounds.xMax &&
      z >= this.liftBounds.zMin &&
      z <= this.liftBounds.zMax
    );
  }

  /**
   * Floor Y at (x, z) for a person whose feet are at `y` (default: the player's own). Uses the walkable
   * surfaces generated from the layout manifest: stair ramp first, then finished floor. Where there is no
   * surface (a void) the current height is kept: there is no "nearest level" fallback any more.
   */
  public computeFloorHeightAt(x: number, z: number, y: number = this.feetPosition.y): number {
    return surfaceAt(x, z, y)?.y ?? y;
  }

  private updateActiveLevel() {
    const currentDepth = worldYToDepth(this.feetPosition.y);
    let closestLevel = STATION_SPEC.levels[0];
    let minDiff = 999;

    STATION_SPEC.levels.forEach((lvl) => {
      const diff = Math.abs(lvl.depthBelowGround - currentDepth);
      if (diff < minDiff) {
        minDiff = diff;
        closestLevel = lvl;
      }
    });

    this.activeLevelId = closestLevel.id;
  }

  /**
   * Find interactive station objects in proximity and camera line-of-sight
   */
  private updateInteractables() {
    if (!this.stationInterior) {
      this.activeInteractable = null;
      return;
    }

    const eyePos = this.camera.position;
    const lookDir = new THREE.Vector3();
    this.camera.getWorldDirection(lookDir);

    let closest: StationInteractable | null = null;
    let minScore = 999;

    for (const item of this.stationInterior.interactables) {
      // Must be on same approximate floor level (within 3.5m vertical)
      if (Math.abs(item.position.y - this.feetPosition.y) > 3.5) continue;

      const dist = this.feetPosition.distanceTo(item.position);
      if (dist <= item.radius) {
        const toItem = item.position.clone().sub(eyePos).normalize();
        const dot = lookDir.dot(toItem);
        // Score prioritizes gaze alignment + distance
        const score = dist - dot * 1.6;
        if (score < minScore) {
          minScore = score;
          closest = item;
        }
      }
    }

    this.activeInteractable = closest;
  }

  /**
   * Elevator state machine updates
   */
  private updateElevator(dt: number) {
    if (this.elevatorMoving) {
      if (this.elevatorDoorProgress > 0) {
        this.elevatorDoorProgress = Math.max(0, this.elevatorDoorProgress - dt * 2.5);
        this.circulationBuilder.setDoorProgress(this.elevatorDoorProgress);
        return;
      }

      const dy = this.elevatorTargetY - this.elevatorCurrentY;
      const step = 2.8 * dt;

      if (Math.abs(dy) <= step) {
        this.elevatorCurrentY = this.elevatorTargetY;
        this.elevatorMoving = false;
        this.elevatorDoorsOpen = true;
      } else {
        this.elevatorCurrentY += Math.sign(dy) * step;
      }

      this.circulationBuilder.setCabinY(this.elevatorCurrentY);
    } else if (this.elevatorDoorsOpen && this.elevatorDoorProgress < 1.0) {
      this.elevatorDoorProgress = Math.min(1.0, this.elevatorDoorProgress + dt * 2.0);
      this.circulationBuilder.setDoorProgress(this.elevatorDoorProgress);
    }
  }

  /**
   * Command elevator to travel to a target stop index
   */
  public callElevatorToStop(stopIndex: number) {
    const stops = this.circulationBuilder.elevatorStops;
    if (stopIndex < 0 || stopIndex >= stops.length) return;
    this.elevatorTargetY = stops[stopIndex].yFloor;
    this.elevatorMoving = true;
    this.elevatorDoorsOpen = false;
  }

  private handleInteractKey() {
    // 1. If currently targeting an interactive station element
    if (this.activeInteractable) {
      if (this.activeInteractable.type === 'faregate' && this.stationInterior) {
        const open = this.stationInterior.toggleFareGates();
        this.activeInteractable.actionText = open ? 'Gate Open · Pass through' : 'Tap Smart Card / Open Gate';
      } else if (this.activeInteractable.type === 'bench') {
        this.isSitting = !this.isSitting;
        this.eyeHeight = this.isSitting ? 0.95 : 1.65;
        this.activeInteractable.actionText = this.isSitting ? 'Stand Up' : 'Sit / Rest on Platform Bench';
      }

      if (this.onInteractCallback) {
        this.onInteractCallback(this.activeInteractable);
      }
      return;
    }

    // 2. If inside elevator, cycle through stops
    const inElevator = this.isPlayerInElevator();
    if (inElevator) {
      const stops = this.circulationBuilder.elevatorStops;
      const currentStopIdx = stops.findIndex(
        (s) => Math.abs(s.yFloor - this.elevatorCurrentY) < 1.0
      );
      const nextIdx = (currentStopIdx + 1) % stops.length;
      this.callElevatorToStop(nextIdx);
    }
  }

  public getTelemetry(): PlayerTelemetry {
    const depth = Math.max(0, worldYToDepth(this.feetPosition.y));
    const rl = worldYToRL(this.feetPosition.y);

    let deg = Math.round((-this.yaw * (180 / Math.PI)) % 360);
    if (deg < 0) deg += 360;
    if (deg === 0 || Object.is(deg, -0)) deg = 0;

    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const cardIdx = Math.round(deg / 45) % 8;
    const cardinal = cardinals[cardIdx];

    const lvl = STATION_SPEC.levels.find((l) => l.id === this.activeLevelId);
    const levelName = lvl ? lvl.name : 'Underground';

    return {
      levelId: this.activeLevelId,
      levelName,
      depth,
      rl,
      headingDegrees: deg,
      cardinal,
      isSprinting: this.isSprinting,
      isLocked: this.isLocked,
      inElevator: this.isPlayerInElevator(),
    };
  }
}
