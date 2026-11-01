import * as THREE from 'three';
import { journeyGuidePoints } from './journeyGraph';

export class RouteGuide {
  public readonly group = new THREE.Group();

  constructor() {
    this.group.name = 'GuidedJourneyRoute';
    const points = journeyGuidePoints().map((point) => new THREE.Vector3(point.x, point.y + 0.08, point.z));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 })
    );
    this.group.add(line);

    const markerGeometry = new THREE.SphereGeometry(0.18, 12, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    for (const point of points) {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(point);
      this.group.add(marker);
    }
    this.group.visible = false;
  }

  setVisible(visible: boolean) {
    this.group.visible = visible;
  }
}
