import * as THREE from 'three';
import { STATION_SPEC, depthToWorldY } from '../data/stationSpec';
import { AssumedTagMarker } from './AssumedTagMarker';

export class StationBuilder {
  public group: THREE.Group;
  public boxGroup: THREE.Group;
  public slabsGroup: THREE.Group;
  public columnsGroup: THREE.Group;
  public platformsGroup: THREE.Group;
  public assumedEquipmentGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'StationSystem';

    this.boxGroup = new THREE.Group();
    this.boxGroup.name = 'DiaphragmWalls';

    this.slabsGroup = new THREE.Group();
    this.slabsGroup.name = 'FloorSlabs';

    this.columnsGroup = new THREE.Group();
    this.columnsGroup.name = 'StructuralColumns';

    this.platformsGroup = new THREE.Group();
    this.platformsGroup.name = 'PassengerPlatforms';

    this.assumedEquipmentGroup = new THREE.Group();
    this.assumedEquipmentGroup.name = 'AssumedEquipment';

    this.group.add(this.boxGroup);
    this.group.add(this.slabsGroup);
    this.group.add(this.columnsGroup);
    this.group.add(this.platformsGroup);
    this.group.add(this.assumedEquipmentGroup);

    this.buildPerimeterWalls();
    this.buildFloorSlabs();
    this.buildStructuralColumns();
    this.buildPlatforms();
    this.buildConcourseElements();
  }

  /**
   * Builds the diaphragm walls enclosing the 13.4m x 200m station box.
   * One side is cut open longitudinally to provide the architectural cutaway view!
   */
  private buildPerimeterWalls() {
    const width = STATION_SPEC.stationBox.width.value; // 13.40 m
    const length = STATION_SPEC.stationBox.length.value; // 200 m
    const wallThick = STATION_SPEC.stationBox.wallThickness.value; // 0.80 m
    
    // Depth: from roof underside (-4.36) down to base undercroft (-34.50)
    const topY = depthToWorldY(STATION_SPEC.stationBox.soilCoverAboveRoof.value);
    const bottomY = depthToWorldY(34.5);
    const boxHeight = topY - bottomY;
    const centerY = (topY + bottomY) / 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // North End Wall (Headwall)
    const northGeom = new THREE.BoxGeometry(width + wallThick * 2, boxHeight, wallThick);
    const northWall = new THREE.Mesh(northGeom, wallMat);
    northWall.position.set(0, centerY, -length / 2 - wallThick / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.boxGroup.add(northWall);

    // South End Wall (Headwall)
    const southWall = northWall.clone();
    southWall.position.set(0, centerY, length / 2 + wallThick / 2);
    this.boxGroup.add(southWall);

    // West Retaining Wall (Solid)
    const westGeom = new THREE.BoxGeometry(wallThick, boxHeight, length);
    const westWall = new THREE.Mesh(westGeom, wallMat);
    westWall.position.set(-width / 2 - wallThick / 2, centerY, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    this.boxGroup.add(westWall);

    // East Retaining Wall (Cutaway: upper half glass/open, bottom solid)
    const cutawayHeight = boxHeight * 0.35;
    const cutawayGeom = new THREE.BoxGeometry(wallThick, cutawayHeight, length);
    const cutawayWall = new THREE.Mesh(cutawayGeom, wallMat);
    cutawayWall.position.set(width / 2 + wallThick / 2, bottomY + cutawayHeight / 2, 0);
    cutawayWall.receiveShadow = true;
    this.boxGroup.add(cutawayWall);
  }

  /**
   * Builds the 5 primary horizontal floor slabs
   */
  private buildFloorSlabs() {
    const width = STATION_SPEC.stationBox.width.value; // 13.40 m
    const length = STATION_SPEC.stationBox.length.value; // 200 m

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.75,
      metalness: 0.15
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9
    });

    // 1. Roof Slab (Top at -4.36, Underside at -5.36 -> thickness 1.0m)
    const roofThick = STATION_SPEC.stationBox.roofSlabThickness.value;
    const roofGeom = new THREE.BoxGeometry(width, roofThick, length);
    const roofMesh = new THREE.Mesh(roofGeom, roofMat);
    roofMesh.name = 'Roof Slab (RL +214.64 underside)';
    roofMesh.position.set(0, depthToWorldY(4.36) - roofThick / 2, 0);
    roofMesh.castShadow = true;
    this.slabsGroup.add(roofMesh);

    // 2. Concourse Level Slab (RL +209.84, Depth 10.16m) with stairwell & elevator openings
    const concDef = STATION_SPEC.levels.find(l => l.id === 'concourse')!;
    const concY = depthToWorldY(concDef.depthBelowGround) - 0.2;
    const concGroup = new THREE.Group();
    concGroup.name = 'Concourse Floor Slab (RL +209.84)';

    // North & South main slabs
    const concNorth = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, 91), slabMat);
    concNorth.position.set(0, concY, -54.5);
    concNorth.receiveShadow = true;
    concGroup.add(concNorth);

    const concSouth = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, 91), slabMat);
    concSouth.position.set(0, concY, 54.5);
    concSouth.receiveShadow = true;
    concGroup.add(concSouth);

    // East corridor across the central void
    const concEast = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.4, 18), slabMat);
    concEast.position.set(3.35, concY, 0);
    concEast.receiveShadow = true;
    concGroup.add(concEast);

    // West perimeter corridor
    const concWest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 18), slabMat);
    concWest.position.set(-6.25, concY, 0);
    concWest.receiveShadow = true;
    concGroup.add(concWest);

    // North & South of lift corridor
    const concLiftN = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 5.7), slabMat);
    concLiftN.position.set(-4.5, concY, -6.15);
    concLiftN.receiveShadow = true;
    concGroup.add(concLiftN);

    const concLiftS = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 9.7), slabMat);
    concLiftS.position.set(-4.5, concY, 4.15);
    concLiftS.receiveShadow = true;
    concGroup.add(concLiftS);

    this.slabsGroup.add(concGroup);

    // 3. Upper Platform Track Slab & Undercroft (RL +201.54, Depth 18.46m)
    const uUndDef = STATION_SPEC.levels.find(l => l.id === 'upper_undercroft')!;
    const uUndGeom = new THREE.BoxGeometry(width, 0.5, length);
    const uUndMesh = new THREE.Mesh(uUndGeom, slabMat);
    uUndMesh.name = 'Upper Undercroft Slab (RL +201.54)';
    uUndMesh.position.set(0, depthToWorldY(uUndDef.depthBelowGround) - 0.25, 0);
    uUndMesh.receiveShadow = true;
    this.slabsGroup.add(uUndMesh);

    // 4. Intermediate Technical / Plant Level (RL +195.54, Depth 24.46m)
    const intDef = STATION_SPEC.levels.find(l => l.id === 'intermediate')!;
    const intY = depthToWorldY(intDef.depthBelowGround) - 0.225;
    const intGroup = new THREE.Group();
    intGroup.name = 'Intermediate Floor Slab (RL +195.54)';

    // Slabs partitioned around stair 2, stair 3, and elevator openings
    const intFarN = new THREE.Mesh(new THREE.BoxGeometry(width, 0.45, 65), slabMat);
    intFarN.position.set(0, intY, -67.5);
    intFarN.receiveShadow = true;
    intGroup.add(intFarN);

    const intFarS = new THREE.Mesh(new THREE.BoxGeometry(width, 0.45, 63), slabMat);
    intFarS.position.set(0, intY, 68.5);
    intFarS.receiveShadow = true;
    intGroup.add(intFarS);

    const intCenter = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.45, 72), slabMat);
    intCenter.position.set(3.35, intY, 0);
    intCenter.receiveShadow = true;
    intGroup.add(intCenter);

    const intWestCenter = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.45, 26), slabMat);
    intWestCenter.position.set(-4.5, intY, 5);
    intWestCenter.receiveShadow = true;
    intGroup.add(intWestCenter);

    this.slabsGroup.add(intGroup);

    // 5. Lower Undercroft / Base Foundation Slab (RL +186.09, Depth 33.91m)
    const lUndDef = STATION_SPEC.levels.find(l => l.id === 'lower_undercroft')!;
    const baseGeom = new THREE.BoxGeometry(width, 1.2, length);
    const baseMesh = new THREE.Mesh(baseGeom, slabMat);
    baseMesh.name = 'Foundation Base Slab (RL +186.09)';
    baseMesh.position.set(0, depthToWorldY(lUndDef.depthBelowGround) - 0.6, 0);
    baseMesh.receiveShadow = true;
    this.slabsGroup.add(baseMesh);
  }

  /**
   * Structural reinforced concrete columns spaced at 10m grid
   */
  private buildStructuralColumns() {
    const colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const colRadius = 0.45;
    const colHeight = 28; // Spanning full station vertical envelope
    const centerY = depthToWorldY(19.0);

    // Place along internal grid line C (X = -0.5)
    for (let z = -90; z <= 90; z += 10) {
      const colGeom = new THREE.CylinderGeometry(colRadius, colRadius, colHeight, 16);
      const col = new THREE.Mesh(colGeom, colMat);
      col.position.set(-0.5, centerY, z);
      col.castShadow = true;
      col.receiveShadow = true;
      this.columnsGroup.add(col);
    }
  }

  /**
   * Builds the Upper Platform and Lower Platform slabs (140m length, assumed width 4.8m)
   */
  private buildPlatforms() {
    const platLen = STATION_SPEC.assumedArchitectural.platformLength.value; // 140 m
    const platWid = STATION_SPEC.assumedArchitectural.platformWidth.value; // 4.8 m

    const platMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.6
    });

    const edgeTactileMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Yellow tactile edge

    const upperPlatDef = STATION_SPEC.levels.find(l => l.id === 'upper_platform')!;
    const lowerPlatDef = STATION_SPEC.levels.find(l => l.id === 'lower_platform')!;

    // Platforms sit on the passenger waiting side (opposite to rail track)
    const platX = -2.2;

    [
      { name: 'Upper Platform (RL +203.69)', def: upperPlatDef },
      { name: 'Lower Platform (RL +188.99)', def: lowerPlatDef }
    ].forEach((p) => {
      const platY = depthToWorldY(p.def.depthBelowGround);

      // Main platform deck
      const platGeom = new THREE.BoxGeometry(platWid, 0.35, platLen);
      const platMesh = new THREE.Mesh(platGeom, platMat);
      platMesh.name = p.name;
      platMesh.position.set(platX, platY - 0.175, 0);
      platMesh.receiveShadow = true;
      this.platformsGroup.add(platMesh);

      // Safety tactile edge strip along the trackside
      const edgeGeom = new THREE.BoxGeometry(0.3, 0.02, platLen);
      const edgeMesh = new THREE.Mesh(edgeGeom, edgeTactileMat);
      edgeMesh.position.set(platX + platWid / 2 - 0.15, platY + 0.01, 0);
      this.platformsGroup.add(edgeMesh);
    });

    // Tag platforms as ASSUMED dimensions
    const platTag = AssumedTagMarker.createTag('ASSUMED: PLATFORM 140m', 'Width & Layout unstated');
    platTag.position.set(-2.2, depthToWorldY(upperPlatDef.depthBelowGround) + 2.0, 0);
    this.assumedEquipmentGroup.add(platTag);
  }

  /**
   * Concourse schematic elements (ticket turnstiles, customer care, stairs/lifts)
   */
  private buildConcourseElements() {
    const concDef = STATION_SPEC.levels.find(l => l.id === 'concourse')!;
    const concY = depthToWorldY(concDef.depthBelowGround);

    // Schematic fare gates (8 gates)
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 });
    for (let i = -4; i < 4; i++) {
      const gateGeom = new THREE.BoxGeometry(0.15, 1.0, 1.4);
      const gate = new THREE.Mesh(gateGeom, gateMat);
      gate.position.set(i * 1.0, concY + 0.5, -20);
      this.assumedEquipmentGroup.add(gate);
    }

    // Assumed tag for concourse
    const concTag = AssumedTagMarker.createTag('ASSUMED: CONCOURSE LAYOUT', 'Schematic transit equipment');
    concTag.position.set(0, concY + 3.0, -20);
    this.assumedEquipmentGroup.add(concTag);
  }
}
