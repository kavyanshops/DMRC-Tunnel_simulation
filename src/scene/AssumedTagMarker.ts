import * as THREE from 'three';

export class AssumedTagMarker {
  private static spriteCache: Map<string, THREE.SpriteMaterial> = new Map();

  /**
   * Creates a high-res canvas 3D text billboard sprite showing the [ASSUMED] badge
   */
  public static createTag(text: string = 'ASSUMED', subtitle?: string): THREE.Sprite {
    const key = `${text}_${subtitle || ''}`;
    let material = this.spriteCache.get(key);

    if (!material) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Crisp background rounded pill
        ctx.fillStyle = 'rgba(245, 158, 11, 0.95)'; // Amber warning
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 6;
        this.roundRect(ctx, 10, 10, 492, 140, 24);
        ctx.fill();
        ctx.stroke();

        // Inner subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, 16, 16, 480, 128, 20);
        ctx.stroke();

        // Main Text
        ctx.font = 'bold 46px "JetBrains Mono", monospace';
        ctx.fillStyle = '#05070a';
        ctx.textAlign = 'center';
        ctx.textBaseline = subtitle ? 'alphabetic' : 'middle';
        ctx.fillText(`[ ${text} ]`, 256, subtitle ? 72 : 84);

        // Subtitle if provided
        if (subtitle) {
          ctx.font = '600 28px "Inter", sans-serif';
          ctx.fillStyle = '#1c1917';
          ctx.fillText(subtitle, 256, 118);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: true,
          depthWrite: false
        });
      } else {
        // Fallback for headless / test environments
        material = new THREE.SpriteMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.8
        });
      }
      this.spriteCache.set(key, material);
    }

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(9.0, 2.8, 1.0);
    sprite.renderOrder = 10;
    return sprite;
  }

  /**
   * Creates a dashed wireframe bounding helper representing assumed geometry
   */
  public static createDashedBoundingBox(size: THREE.Vector3, color: number = 0xf59e0b): THREE.LineSegments {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineDashedMaterial({
      color: color,
      dashSize: 1.0,
      gapSize: 0.5,
      scale: 1,
      transparent: true,
      opacity: 0.9
    });
    const line = new THREE.LineSegments(edges, material);
    line.computeLineDistances();
    return line;
  }

  private static roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
