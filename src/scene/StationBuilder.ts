import * as THREE from 'three';
import { STATION_SPEC, TUNNEL_LAYOUT, depthToWorldY } from '../data/stationSpec';
import { COLUMNS, slabById, subtractRects, type SlabSpec } from '../data/stationLayout';

export class StationBuilder {
  public group: THREE.Group;
  public boxGroup: THREE.Group;
  public slabsGroup: THREE.Group;
  public columnsGroup: THREE.Group;
  public platformsGroup: THREE.Group;
  public assumedEquipmentGroup: THREE.Group;
  /** Upper part of the east wall: hidden in the overview cutaway, shown when walking inside. */
  public eastWallUpper: THREE.Mesh | null = null;

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

    // Headwalls: solid diaphragm walls with a circular portal for each stacked TBM tunnel,
    // so the bored tunnels visibly connect to the open station hall.
    const outerR = STATION_SPEC.tbmTunnels.outerDiameter.value / 2;
    const c = TUNNEL_LAYOUT.centers();
    const makeHeadwall = (z: number) => {
      const w = width + wallThick * 2;
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -boxHeight / 2); shape.lineTo(w / 2, -boxHeight / 2);
      shape.lineTo(w / 2, boxHeight / 2); shape.lineTo(-w / 2, boxHeight / 2); shape.closePath();
      for (const cy of [c.upper, c.lower]) {
        const hole = new THREE.Path();
        hole.absarc(TUNNEL_LAYOUT.centerX, cy - centerY, outerR, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
      const geom = new THREE.ExtrudeGeometry(shape, { depth: wallThick, bevelEnabled: false, curveSegments: 32 });
      geom.translate(0, centerY, -wallThick / 2);
      const wall = new THREE.Mesh(geom, wallMat);
      wall.position.set(0, 0, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.boxGroup.add(wall);
    };
    makeHeadwall(-length / 2 - wallThick / 2);
    makeHeadwall(length / 2 + wallThick / 2);

    // West Retaining Wall (Solid)
    const westGeom = new THREE.BoxGeometry(wallThick, boxHeight, length);
    const westWall = new THREE.Mesh(westGeom, wallMat);
    westWall.position.set(-width / 2 - wallThick / 2, centerY, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    this.boxGroup.add(westWall);

    // East wall interior finish (light cladding, matches the west side) so the hall isn't a dark void
    const eastMat = new THREE.MeshStandardMaterial({ color: 0xa8b6c6, roughness: 0.7, metalness: 0.05 });

    // East Retaining Wall (Cutaway: upper half glass/open, bottom solid)
    const cutawayHeight = boxHeight * 0.35;
    const cutawayGeom = new THREE.BoxGeometry(wallThick, cutawayHeight, length);
    const cutawayWall = new THREE.Mesh(cutawayGeom, eastMat);
    cutawayWall.position.set(width / 2 + wallThick / 2, bottomY + cutawayHeight / 2, 0);
    cutawayWall.receiveShadow = true;
    this.boxGroup.add(cutawayWall);

    // Upper east wall: closes the hall when walking inside; removed in the overview cutaway.
    const upperH = boxHeight - cutawayHeight;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(wallThick, upperH, length), eastMat);
    upper.position.set(width / 2 + wallThick / 2, topY - upperH / 2, 0);
    upper.visible = false;
    this.eastWallUpper = upper;
    this.boxGroup.add(upper);
  }

  /** Overview shows the cutaway (open east side); walk mode closes it so it reads as a real hall. */
  public setCutaway(open: boolean) {
    if (this.eastWallUpper) this.eastWallUpper.visible = !open;
  }

  /** Builds one slab / deck from the layout manifest: pieces are generated around the derived openings. */
  private addSlabPieces(parent: THREE.Object3D, slab: SlabSpec, mat: THREE.Material, namePrefix: string, shadow = true) {
    const pieces = subtractRects(slab.rect, slab.openings);
    pieces.forEach((p, i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, slab.thickness, p.z1 - p.z0), mat);
      mesh.name = `${namePrefix} [${i}]`;
      mesh.position.set((p.x0 + p.x1) / 2, slab.top - slab.thickness / 2, (p.z0 + p.z1) / 2);
      mesh.receiveShadow = shadow;
      parent.add(mesh);
    });
  }

  /**
   * Builds the horizontal slabs. Concourse, undercroft and intermediate slabs are generated from the layout
   * manifest with the stair and lift openings cut out (no hand-typed slab pieces).
   */
  private buildFloorSlabs() {
    const width = STATION_SPEC.stationBox.width.value; // 13.40 m
    const length = STATION_SPEC.stationBox.length.value; // 200 m

    const slabMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75, metalness: 0.15 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

    // 1. Roof Slab (Top at -4.36, Underside at -5.36 -> thickness 1.0m)
    const roofThick = STATION_SPEC.stationBox.roofSlabThickness.value;
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(width, roofThick, length), roofMat);
    roofMesh.name = 'Roof Slab (RL +214.64 underside)';
    roofMesh.position.set(0, depthToWorldY(4.36) - roofThick / 2, 0);
    roofMesh.castShadow = true;
    this.slabsGroup.add(roofMesh);

    // 2-4. Concourse, upper undercroft, intermediate plant slabs (with derived openings)
    const named: [Parameters<typeof slabById>[0], string][] = [
      ['concourse', 'Concourse Floor Slab (RL +209.84)'],
      ['upper_undercroft', 'Upper Undercroft Slab (RL +201.54)'],
      ['intermediate', 'Intermediate Floor Slab (RL +195.54)'],
    ];
    for (const [id, name] of named) {
      const g = new THREE.Group();
      g.name = name;
      this.addSlabPieces(g, slabById(id), slabMat, name);
      this.slabsGroup.add(g);
    }

    // 5. Lower Undercroft / Base Foundation Slab (RL +186.09, Depth 33.91m)
    const lUndDef = STATION_SPEC.levels.find((l) => l.id === 'lower_undercroft')!;
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, length), slabMat);
    baseMesh.name = 'Foundation Base Slab (RL +186.09)';
    baseMesh.position.set(0, depthToWorldY(lUndDef.depthBelowGround) - 0.6, 0);
    baseMesh.receiveShadow = true;
    this.slabsGroup.add(baseMesh);
  }

  /**
   * Structural columns on the manifest grid (ASSUMED column line, see stationLayout.ts).
   * They run from the roof underside to the top of the base slab.
   */
  private buildStructuralColumns() {
    const colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const topY = depthToWorldY(5.36);
    const baseTop = depthToWorldY(STATION_SPEC.levels.find((l) => l.id === 'lower_undercroft')!.depthBelowGround);
    const colHeight = topY - baseTop;
    for (const z of COLUMNS.zs) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(COLUMNS.radius, COLUMNS.radius, colHeight, 16), colMat);
      col.name = `Column z=${z}`;
      col.position.set(COLUMNS.x, (topY + baseTop) / 2, z);
      col.castShadow = true;
      col.receiveShadow = true;
      this.columnsGroup.add(col);
    }
  }

  /**
   * Upper and lower platform decks (built once, here) with the stair/lift openings cut out.
   * StationInterior lays the finished floor 5 mm above these.
   */
  private buildPlatforms() {
    const platMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const defs: [Parameters<typeof slabById>[0], string][] = [
      ['upper_platform_deck', 'Upper Platform (RL +203.69)'],
      ['lower_platform_deck', 'Lower Platform (RL +188.99)'],
    ];
    for (const [id, name] of defs) this.addSlabPieces(this.platformsGroup, slabById(id), platMat, name);

  }
}
