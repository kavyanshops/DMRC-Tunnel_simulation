import * as THREE from 'three';
import { STATION_SPEC, depthToWorldY } from '../data/stationSpec';
import { AssumedTagMarker } from './AssumedTagMarker';

export class GroundBuilder {
  public group: THREE.Group;
  public strataGroup: THREE.Group;
  public sewerGroup: THREE.Group;
  public surfaceGroup: THREE.Group;
  public assumedTagsGroup: THREE.Group;

  private strataMaterials: THREE.MeshStandardMaterial[] = [];
  private waterTablePlane!: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GroundSystem';

    this.strataGroup = new THREE.Group();
    this.strataGroup.name = 'GeologicalStrata';

    this.sewerGroup = new THREE.Group();
    this.sewerGroup.name = 'HistoricalSewer';

    this.surfaceGroup = new THREE.Group();
    this.surfaceGroup.name = 'SurfaceContext';

    this.assumedTagsGroup = new THREE.Group();
    this.assumedTagsGroup.name = 'AssumedTags';

    this.group.add(this.strataGroup);
    this.group.add(this.sewerGroup);
    this.group.add(this.surfaceGroup);
    this.group.add(this.assumedTagsGroup);

    this.buildStrataLayers();
    this.buildWaterTable();
    this.buildOldSewer();
    this.buildSurfaceContext();
  }

  /**
   * Builds the 3 geological strata layers (Sandy Silt, Weathered Quartzite, Bedrock)
   * The viewer side (+X) is opened in the station sector so all 5 floor levels and stacked tunnels are visible.
   */
  private buildStrataLayers() {
    const soilBankWidth = 35; // Transverse width of soil bank on each side
    const blockLength = 240; // Longitudinal length

    STATION_SPEC.geology.strata.forEach((stratum) => {
      const thickness = stratum.depthEnd - stratum.depthStart;
      const centerY = depthToWorldY(stratum.depthStart + thickness / 2);

      const material = new THREE.MeshStandardMaterial({
        color: stratum.color,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: stratum.opacity * 0.7,
        side: THREE.DoubleSide
      });
      this.strataMaterials.push(material);

      // West soil bank (opposite to cutaway viewer, full length)
      const westGeom = new THREE.BoxGeometry(soilBankWidth, thickness, blockLength);
      const westMesh = new THREE.Mesh(westGeom, material);
      westMesh.position.set(-(STATION_SPEC.stationBox.width.value / 2 + soilBankWidth / 2), centerY, 0);
      westMesh.castShadow = true;
      westMesh.receiveShadow = true;
      this.strataGroup.add(westMesh);

      // East soil bank (+X viewer side): Split into North & South ends, leaving central 160m cutaway open!
      const endLength = 35;
      const northGeom = new THREE.BoxGeometry(soilBankWidth, thickness, endLength);
      const northMesh = new THREE.Mesh(northGeom, material);
      northMesh.position.set(STATION_SPEC.stationBox.width.value / 2 + soilBankWidth / 2, centerY, -blockLength / 2 + endLength / 2);
      this.strataGroup.add(northMesh);

      const southMesh = northMesh.clone();
      southMesh.position.set(STATION_SPEC.stationBox.width.value / 2 + soilBankWidth / 2, centerY, blockLength / 2 - endLength / 2);
      this.strataGroup.add(southMesh);

      // Strata label on the exposed vertical cut profile
      const labelTag = AssumedTagMarker.createTag(stratum.name.toUpperCase(), `${stratum.depthStart}-${stratum.depthEnd}m depth`);
      labelTag.position.set(-STATION_SPEC.stationBox.width.value / 2 - 2, centerY, -80);
      this.strataGroup.add(labelTag);
    });
  }

  /**
   * Water table plane at 5.5 m depth (RL +214.50 m)
   */
  private buildWaterTable() {
    const waterDepth = STATION_SPEC.geology.waterTableDepth.value; // 5.5m
    const waterY = depthToWorldY(waterDepth);

    const geom = new THREE.PlaneGeometry(80, 240);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.8,
      side: THREE.DoubleSide
    });
    this.waterTablePlane = new THREE.Mesh(geom, mat);
    this.waterTablePlane.position.set(0, waterY, 0);
    this.strataGroup.add(this.waterTablePlane);

    // Label sprite
    const tag = AssumedTagMarker.createTag('WATER TABLE ~5.5m', 'RL +214.50m (Verified)');
    tag.position.set(-20, waterY + 2.0, 40);
    this.strataGroup.add(tag);
  }

  /**
   * Historical Brick Sewer at ~10 m depth crossing just past the station headwall
   */
  private buildOldSewer() {
    const sewerDepth = STATION_SPEC.geology.oldSewer.depth;
    const sewerY = depthToWorldY(sewerDepth);
    const sewerRadius = STATION_SPEC.geology.oldSewer.outerDiameter / 2;

    // Crossing pipe cylinder at Z = 112 (crossing just past station end at 100)
    const curve = new THREE.CylinderGeometry(sewerRadius, sewerRadius, 55, 32);
    curve.rotateZ(Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // Heritage brick ochre
      roughness: 0.85,
      metalness: 0.1
    });

    const sewerMesh = new THREE.Mesh(curve, mat);
    sewerMesh.position.set(0, sewerY, 112);
    this.sewerGroup.add(sewerMesh);

    // Tag as ASSUMED because exact alignment and clearances are unknown
    const sewerTag = AssumedTagMarker.createTag('ASSUMED: BRICK SEWER', '~10m Depth Crossing');
    sewerTag.position.set(10, sewerY + 3.0, 112);
    this.assumedTagsGroup.add(sewerTag);

    // Dashed helper box around sewer
    const dashedBox = AssumedTagMarker.createDashedBoundingBox(new THREE.Vector3(45, 3.5, 3.5), 0xf59e0b);
    dashedBox.position.set(0, sewerY, 112);
    this.sewerGroup.add(dashedBox);
  }

  /**
   * Surface context: road, footpaths and heritage buildings (20-21m clearance)
   */
  private buildSurfaceContext() {
    const roadWidth = STATION_SPEC.surfaceContext.roadWidth.value; // 17 m
    const buildingLine = STATION_SPEC.surfaceContext.buildingLineDistance.value; // ~20.5 m

    // Street Asphalt
    const roadGeom = new THREE.PlaneGeometry(roadWidth, 240);
    roadGeom.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95
    });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.position.set(0, 0.05, 0);
    road.receiveShadow = true;
    this.surfaceGroup.add(road);

    // Footpaths
    const footWidth = (buildingLine - roadWidth) / 2; // ~1.75m each
    const footMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });

    [-1, 1].forEach((dir) => {
      const footGeom = new THREE.BoxGeometry(footWidth, 0.2, 240);
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.position.set(dir * (roadWidth / 2 + footWidth / 2), 0.1, 0);
      foot.receiveShadow = true;
      this.surfaceGroup.add(foot);
    });

    // Heritage buildings (>100 years old, 20-21m clearance between facades)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.15
    });

    const buildingDepth = 16;
    const numBuildings = 8;
    const lotLength = 240 / numBuildings;

    // West side buildings (full row)
    for (let i = 0; i < numBuildings; i++) {
      const height = 12 + ((i % 3) * 3);
      const zPos = -120 + (i + 0.5) * lotLength;
      const bldGeom = new THREE.BoxGeometry(buildingDepth, height, lotLength - 2);
      const bld = new THREE.Mesh(bldGeom, buildingMat);
      bld.position.set(-(buildingLine / 2 + buildingDepth / 2), height / 2, zPos);
      bld.castShadow = true;
      bld.receiveShadow = true;
      this.surfaceGroup.add(bld);
    }

    // East side buildings: only North and South ends to leave cutaway open
    [0, 1, 6, 7].forEach((i) => {
      const height = 14;
      const zPos = -120 + (i + 0.5) * lotLength;
      const bldGeom = new THREE.BoxGeometry(buildingDepth, height, lotLength - 2);
      const bld = new THREE.Mesh(bldGeom, buildingMat);
      bld.position.set(buildingLine / 2 + buildingDepth / 2, height / 2, zPos);
      bld.castShadow = true;
      bld.receiveShadow = true;
      this.surfaceGroup.add(bld);
    });

    // Tag for Heritage Buildings
    const bldTag = AssumedTagMarker.createTag('HERITAGE CORRIDOR', 'Clearance 20-21m (Verified)');
    bldTag.position.set(-22, 18, 0);
    this.assumedTagsGroup.add(bldTag);
  }

  /**
   * Adjusts transparency/visibility of the soil block based on cutaway slider
   */
  public setCutawayProgress(progress: number) {
    this.strataMaterials.forEach((mat) => {
      mat.opacity = progress * 0.7;
      mat.visible = progress > 0.05;
    });
    if (this.waterTablePlane) {
      (this.waterTablePlane.material as THREE.MeshStandardMaterial).opacity = progress * 0.35;
      this.waterTablePlane.visible = progress > 0.05;
    }
  }
}
