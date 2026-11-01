import * as THREE from 'three';
import { STATION_SPEC, TUNNEL_LAYOUT, depthToWorldY } from '../data/stationSpec';
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
  }

  /** Z ranges of the bored tunnels: only OUTSIDE the station box (headwall face -> portal end). */
  private tunnelSpans(): Array<[number, number]> {
    const half = STATION_SPEC.stationBox.length.value / 2;
    return [[-TUNNEL_LAYOUT.outerEndZ, -half], [half, TUNNEL_LAYOUT.outerEndZ]];
  }

  /**
   * Builds the Upper and Lower stacked TBM bored tunnels.
   * Inside the 200 m station box the trains run in the open cut-and-cover hall, so there is no
   * segmental lining there; the lining starts at each headwall opening and runs outward.
   */
  private buildStackedTunnels() {
    const outerR = STATION_SPEC.tbmTunnels.outerDiameter.value / 2; // 3.175 m
    const innerR = STATION_SPEC.tbmTunnels.innerDiameter.value / 2; // 2.90 m

    const liningMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const ringLineMat = new THREE.LineBasicMaterial({ color: 0x1e293b });

    const c = TUNNEL_LAYOUT.centers();
    [
      { name: 'Upper TBM Tunnel', y: c.upper },
      { name: 'Lower TBM Tunnel', y: c.lower }
    ].forEach((tun) => {
      this.tunnelSpans().forEach(([z0, z1], idx) => {
        const len = z1 - z0;
        const geom = new THREE.CylinderGeometry(outerR, outerR, len, 32, Math.round(len / 1.5), true);
        geom.rotateX(Math.PI / 2);
        const tunnelMesh = new THREE.Mesh(geom, liningMat);
        tunnelMesh.name = `${tun.name} (${idx === 0 ? 'north' : 'south'} drive)`;
        tunnelMesh.position.set(TUNNEL_LAYOUT.centerX, tun.y, (z0 + z1) / 2);
        tunnelMesh.castShadow = true;
        tunnelMesh.receiveShadow = true;
        this.tunnelsGroup.add(tunnelMesh);

        // Precast segment joint rings
        for (let z = z0; z <= z1 + 1e-6; z += 1.5) {
          const ringLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.RingGeometry(innerR, outerR, 32)), ringLineMat);
          ringLine.position.set(TUNNEL_LAYOUT.centerX, tun.y, z);
          this.tunnelsGroup.add(ringLine);
        }
      });
    });
  }

  /**
   * Standard gauge approach track inside the bored tunnels. Track inside the station box is built
   * by StationInterior (z = -80..80); this continues it from there out through the headwall
   * portals, so no rail is drawn twice.
   */
  private buildTracks() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.85 });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const trackGauge = 1.435;
    const interiorTrackEnd = 80; // StationInterior track runs z = -80..80
    const spans: Array<[number, number]> = [[-TUNNEL_LAYOUT.outerEndZ, -interiorTrackEnd], [interiorTrackEnd, TUNNEL_LAYOUT.outerEndZ]];

    ['upper_rail', 'lower_rail'].forEach((id) => {
      const railY = depthToWorldY(STATION_SPEC.levels.find((l) => l.id === id)!.depthBelowGround);
      spans.forEach(([z0, z1]) => {
        const len = z1 - z0;
        [-trackGauge / 2, trackGauge / 2].forEach((offset) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, len), railMat);
          rail.position.set(TUNNEL_LAYOUT.centerX + offset, railY + 0.08, (z0 + z1) / 2);
          this.tracksGroup.add(rail);
        });
        for (let z = z0; z <= z1; z += 0.8) {
          const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.22), sleeperMat);
          sleeper.position.set(TUNNEL_LAYOUT.centerX, railY - 0.06, z);
          this.tracksGroup.add(sleeper);
        }
      });
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

  }

}
