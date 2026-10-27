import * as THREE from 'three';
import { STATION_SPEC, depthToWorldY } from '../data/stationSpec';
import { AssumedTagMarker } from './AssumedTagMarker';

export class TunnelBuilder {
  public group: THREE.Group;
  public tunnelsGroup: THREE.Group;
  public tracksGroup: THREE.Group;
  public crossPassageGroup: THREE.Group;
  public conflictNoticeGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'TunnelSystem';

    this.tunnelsGroup = new THREE.Group();
    this.tunnelsGroup.name = 'TbmTunnels';

    this.tracksGroup = new THREE.Group();
    this.tracksGroup.name = 'RailsAndTracks';

    this.crossPassageGroup = new THREE.Group();
    this.crossPassageGroup.name = 'NatmCrossPassage';

    this.conflictNoticeGroup = new THREE.Group();
    this.conflictNoticeGroup.name = 'ConflictNotices';

    this.group.add(this.tunnelsGroup);
    this.group.add(this.tracksGroup);
    this.group.add(this.crossPassageGroup);
    this.group.add(this.conflictNoticeGroup);

    this.buildStackedTunnels();
    this.buildTracks();
    this.buildCrossPassage();
    this.buildConflictNotice();
  }

  /**
   * Builds the Upper and Lower stacked TBM bored tunnels
   * Extending past both station headwalls
   */
  private buildStackedTunnels() {
    const outerR = STATION_SPEC.tbmTunnels.outerDiameter.value / 2; // 3.175 m
    const innerR = STATION_SPEC.tbmTunnels.innerDiameter.value / 2; // 2.90 m
    const tunnelLength = 260; // 200m station + 30m each side

    // Concrete segmental lining material
    const liningMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    // Ring segment groove lines material
    const ringLineMat = new THREE.LineBasicMaterial({ color: 0x1e293b });

    // Upper and Lower Tunnel elevations
    // Rail is at the base of the tunnel envelope: tunnel centre is rail level + (innerR - 0.5m track slab)
    const upperRailLevel = STATION_SPEC.levels.find(l => l.id === 'upper_rail')!;
    const lowerRailLevel = STATION_SPEC.levels.find(l => l.id === 'lower_rail')!;

    const upperCenterY = depthToWorldY(upperRailLevel.depthBelowGround) + innerR - 0.6;
    const lowerCenterY = depthToWorldY(lowerRailLevel.depthBelowGround) + innerR - 0.6;

    // Grid transverse positions: tracks run along Grid A/B side of the station box
    // According to WTC Fig 15, the stacked tracks run along the left/transverse corridor
    const tunnelCenterX = 2.5; // Aligned with the platform trackway

    [
      { name: 'Upper TBM Tunnel', y: upperCenterY },
      { name: 'Lower TBM Tunnel', y: lowerCenterY }
    ].forEach((tun) => {
      // Hollow cylinder for precast concrete tunnel lining
      // Three.js CylinderGeometry with open ends, or TubeGeometry
      const geom = new THREE.CylinderGeometry(outerR, outerR, tunnelLength, 32, 26, true);
      geom.rotateX(Math.PI / 2);

      const tunnelMesh = new THREE.Mesh(geom, liningMat);
      tunnelMesh.name = tun.name;
      tunnelMesh.position.set(tunnelCenterX, tun.y, 0);
      tunnelMesh.castShadow = true;
      tunnelMesh.receiveShadow = true;
      this.tunnelsGroup.add(tunnelMesh);

      // Precast segment joint rings along the tunnel length
      for (let z = -tunnelLength / 2; z <= tunnelLength / 2; z += 1.5) {
        const ringGeom = new THREE.RingGeometry(innerR, outerR, 32);
        const ringEdges = new THREE.EdgesGeometry(ringGeom);
        const ringLine = new THREE.LineSegments(ringEdges, ringLineMat);
        ringLine.position.set(tunnelCenterX, tun.y, z);
        this.tunnelsGroup.add(ringLine);
      }
    });
  }

  /**
   * Standard gauge metro rails with 1.885 m offset from tunnel centre
   */
  private buildTracks() {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.85
    });

    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9
    });

    const upperRailLevel = STATION_SPEC.levels.find(l => l.id === 'upper_rail')!;
    const lowerRailLevel = STATION_SPEC.levels.find(l => l.id === 'lower_rail')!;

    const trackSpan = 260;
    const trackX = 2.5; // tunnel centre
    const trackGauge = 1.435; // Standard gauge width

    [upperRailLevel, lowerRailLevel].forEach((railDef) => {
      const railY = depthToWorldY(railDef.depthBelowGround);

      // Left rail and Right rail
      [-trackGauge / 2, trackGauge / 2].forEach((offset) => {
        const railGeom = new THREE.BoxGeometry(0.08, 0.16, trackSpan);
        const railMesh = new THREE.Mesh(railGeom, railMat);
        railMesh.position.set(trackX + offset, railY + 0.08, 0);
        this.tracksGroup.add(railMesh);
      });

      // Track plinth / concrete ties
      for (let z = -trackSpan / 2; z <= trackSpan / 2; z += 0.8) {
        const sleeperGeom = new THREE.BoxGeometry(2.2, 0.12, 0.22);
        const sleeper = new THREE.Mesh(sleeperGeom, sleeperMat);
        sleeper.position.set(trackX, railY - 0.06, z);
        this.tracksGroup.add(sleeper);
      }
    });
  }

  /**
   * Illustrative NATM mined cross-passage (outer Ø 4.10 m) tagged ASSUMED
   */
  private buildCrossPassage() {
    const cpRadius = STATION_SPEC.crossPassage.outerDiameter.value / 2; // 2.05 m
    const cpLength = STATION_SPEC.crossPassage.length.value; // 12 m
    const cpZ = 100 + STATION_SPEC.crossPassage.locationAlongTunnel.value; // In tunnel section beyond station

    const lowerRailLevel = STATION_SPEC.levels.find(l => l.id === 'lower_rail')!;
    const innerR = STATION_SPEC.tbmTunnels.innerDiameter.value / 2;
    const cpY = depthToWorldY(lowerRailLevel.depthBelowGround) + innerR;

    const geom = new THREE.CylinderGeometry(cpRadius, cpRadius, cpLength, 24);
    geom.rotateZ(Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });

    const cpMesh = new THREE.Mesh(geom, mat);
    cpMesh.name = 'NATM Cross-Passage (Assumed)';
    cpMesh.position.set(-3.5, cpY, cpZ);
    this.crossPassageGroup.add(cpMesh);

    // Dashed helper box around cross passage
    const dashedBox = AssumedTagMarker.createDashedBoundingBox(new THREE.Vector3(cpLength + 1, cpRadius * 2 + 1, cpRadius * 2 + 1), 0xf59e0b);
    dashedBox.position.set(-3.5, cpY, cpZ);
    this.crossPassageGroup.add(dashedBox);

    // Tag Sprite
    const tag = AssumedTagMarker.createTag('ASSUMED: CROSS-PASSAGE', 'NATM Ø4.10m Sourced');
    tag.position.set(-3.5, cpY + 3.2, cpZ);
    this.crossPassageGroup.add(tag);
  }

  /**
   * Permanent 3D Warning Tag for Known Conflict:
   * "Gap unverified - ask authors/DMRC"
   */
  private buildConflictNotice() {
    const upperRail = STATION_SPEC.levels.find(l => l.id === 'upper_rail')!;
    const lowerRail = STATION_SPEC.levels.find(l => l.id === 'lower_rail')!;
    const midY = (depthToWorldY(upperRail.depthBelowGround) + depthToWorldY(lowerRail.depthBelowGround)) / 2;

    const noticeTag = AssumedTagMarker.createTag('Gap unverified - ask authors/DMRC', 'Rails 14.70m apart in Fig 15');
    noticeTag.position.set(7.5, midY, -15);
    this.conflictNoticeGroup.add(noticeTag);
  }
}
